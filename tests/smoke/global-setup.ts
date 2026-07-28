import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { logger } from "../../src/cli/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const SMOKE_ROOT = process.env.SMOKE_ROOT ?? path.join(os.tmpdir(), "tf-smoke");

interface Sandboxes {
  tgz: string;
  techDocsDir: string;
  anaDir: string;
}

interface RunOptions {
  /** Human-readable label printed via the smoke logger. */
  label: string;
  /** Extra env vars merged on top of process.env. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Run a scaffold command and print only a one-line summary, so the test output
 * stays scannable. The raw scaffold output is dumped only on failure.
 */
function run(cmd: string, args: string[], cwd: string, opts: RunOptions): void {
  logger.step(opts.label);
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, ...(opts.env ?? {}) },
  });
  if (r.status !== 0) {
    logger.error(`${opts.label} failed (exit ${r.status})`);
    if ((r.stdout ?? "").trim()) console.error(`--- stdout ---\n${r.stdout}`);
    if ((r.stderr ?? "").trim()) console.error(`--- stderr ---\n${r.stderr}`);
    throw new Error(
      `Command failed (exit ${r.status}): ${cmd} ${args.join(" ")} (cwd=${cwd})`,
    );
  }
}

function killOrphanProbes(): void {
  // Kill anything left on the smoke ports from a previous run so tests don't
  // hit a stale server with stale handler state.
  for (const port of [4173, 4174, 5174]) {
    spawnSync("sh", [
      "-c",
      `lsof -ti:${port} 2>/dev/null | xargs -r kill -9 2>/dev/null`,
    ]);
  }
}

function packRepo(): string {
  const packDir = path.join(SMOKE_ROOT, "pack");
  fs.mkdirSync(packDir, { recursive: true });
  for (const f of fs.readdirSync(packDir)) {
    if (f.endsWith(".tgz")) fs.unlinkSync(path.join(packDir, f));
  }
  run("pnpm", ["pack", "--pack-destination", packDir], REPO_ROOT, {
    label: "pnpm pack",
  });
  const tgz = fs.readdirSync(packDir).find((f) => f.endsWith(".tgz"));
  if (!tgz) throw new Error("pnpm pack produced no tarball");
  return path.join(packDir, tgz);
}

function scaffoldTechDocs(tgz: string): string {
  logger.heading("Building tech-docs sandbox");
  const dir = path.join(SMOKE_ROOT, "tech-docs");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  // Mirror the CI bash heredoc: copy template-tech-docs/, substitute placeholders.
  const tpl = path.join(REPO_ROOT, "template-tech-docs");
  copyDir(tpl, dir);
  substitutePlaceholders(dir, {
    __SERVICE_ID__: "SMK",
    __PROJECT__: "smoke",
    __DATE__: "2026-01-01",
    __REPO__: "test/test",
  });

  fs.writeFileSync(
    path.join(dir, "pnpm-workspace.yaml"),
    "allowBuilds:\n  esbuild: true\n",
  );

  run(
    "pnpm",
    [
      "add",
      `file:${tgz}`,
      "vitepress",
      "vitepress-plugin-mermaid",
      "mermaid",
      "vue",
    ],
    dir,
    { label: "pnpm add (tech-docs deps)", env: { HUSKY: "0" } },
  );

  run("pnpm", ["exec", "vitepress", "build", "docs"], dir, {
    label: "vitepress build docs",
  });

  logger.success(`tech-docs sandbox ready at ${dir}`);
  return dir;
}

function scaffoldAna(tgz: string): string {
  logger.heading("Building ana sandbox");
  const parent = path.join(SMOKE_ROOT, "ana-parent");
  fs.rmSync(parent, { recursive: true, force: true });
  fs.mkdirSync(parent, { recursive: true });

  run(
    "node",
    [
      // create-ana is compiled to dist/cli/ by the `prepare` build that runs
      // during `pnpm pack` above, so dist/ is present by the time we get here.
      path.join(REPO_ROOT, "dist/cli/create-ana.js"),
      "ana_test",
      "--gcp-project=ci",
      "--server=nginx",
      "--source=file",
      `--file-path=${tgz}`, // create-ana prepends `file:` itself
      "--no-git",
    ],
    parent,
    { label: "create-ana ana_test" },
  );

  const dir = path.join(parent, "ana_test");
  run("pnpm", ["install"], dir, {
    label: "pnpm install (ana)",
    env: { HUSKY: "0" },
  });

  logger.step("verifying hoist patterns (mermaid, dayjs, debug, cytoscape)");
  for (const dep of ["mermaid", "dayjs", "debug", "cytoscape"]) {
    const depPath = path.join(dir, "node_modules", dep);
    if (!fs.existsSync(depPath)) {
      logger.error(`hoist regression: ${dep} missing from node_modules root`);
      throw new Error(
        `Hoist regression: ${dep} not found at ${depPath}. Check publicHoistPattern in template/_pnpm-workspace.yaml.`,
      );
    }
  }
  logger.success("hoist patterns in place");

  // Read-only verifications only. `pnpm fix` is left out because it triggers
  // the normalize bug that is tracked separately.
  run("pnpm", ["docs:validate"], dir, { label: "pnpm docs:validate" });
  run("pnpm", ["docs:build"], dir, { label: "pnpm docs:build" });
  run("pnpm", ["sync"], dir, { label: "pnpm sync" });

  logger.success(`ana sandbox ready at ${dir}`);
  return dir;
}

// ─── filesystem helpers, kept independent of src/cli/utils.ts ────────────────

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
]);

function substitutePlaceholders(
  dir: string,
  replacements: Record<string, string>,
): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      substitutePlaceholders(full, replacements);
      continue;
    }
    if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    let content: string;
    try {
      content = fs.readFileSync(full, "utf-8");
    } catch {
      continue;
    }
    let changed = false;
    for (const [k, v] of Object.entries(replacements)) {
      if (content.includes(k)) {
        content = content.split(k).join(v);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(full, content);
  }
}

// ─── entry point ─────────────────────────────────────────────────────────────

async function globalSetup(): Promise<void> {
  logger.heading(`Smoke sandbox: ${SMOKE_ROOT}`);
  killOrphanProbes();
  fs.mkdirSync(SMOKE_ROOT, { recursive: true });

  const tgz = packRepo();
  logger.success(`packed ${path.basename(tgz)}`);

  const techDocsDir = scaffoldTechDocs(tgz);
  const anaDir = scaffoldAna(tgz);

  const sandboxes: Sandboxes = { tgz, techDocsDir, anaDir };
  fs.writeFileSync(
    path.join(SMOKE_ROOT, "sandboxes.json"),
    JSON.stringify(sandboxes, null, 2),
  );

  logger.heading("Sandboxes ready, handing off to spec files");
}

export default globalSetup;
