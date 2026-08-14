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
  /** Host repo the tech-docs scaffold landed in; its scripts and deps live here. */
  techDocsHostDir: string;
  techDocsDir: string;
  anaDir: string;
  /** Repo root a first offer was git-initialized into (the monorepo case). */
  offersRepoDir: string;
  /** A second offer scaffolded into the same repo, alongside the first. */
  secondOfferDir: string;
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
  for (const port of [4173, 4174, 5174, 5175]) {
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

/**
 * Mermaid's transitive dependencies are CJS, so Vite pre-bundles them wrong
 * unless pnpm hoists them and the page renders blank at runtime. The build
 * succeeds either way, so nothing else in the suite catches it.
 */
function verifyHoistPatterns(dir: string): void {
  logger.step("verifying hoist patterns (mermaid, dayjs, debug, cytoscape)");
  for (const dep of ["mermaid", "dayjs", "debug", "cytoscape"]) {
    const depPath = path.join(dir, "node_modules", dep);
    if (!fs.existsSync(depPath)) {
      logger.error(`hoist regression: ${dep} missing from node_modules root`);
      throw new Error(
        `Hoist regression: ${dep} not found at ${depPath}. Check publicHoistPattern in boilerplate/_pnpm-workspace.yaml and the host merge in setup.ts.`,
      );
    }
  }
  logger.success("hoist patterns in place");
}

/**
 * The wizard writes the dependencies, the scripts and the pnpm settings into
 * the host repo, so everything here runs from the host root.
 */
function scaffoldTechDocs(tgz: string): { host: string; dir: string } {
  logger.heading("Building tech-docs sandbox");
  const host = path.join(SMOKE_ROOT, "tech-docs");
  fs.rmSync(host, { recursive: true, force: true });
  fs.mkdirSync(host, { recursive: true });

  // A host package.json, so the wizard's docs:* merge runs instead of warning.
  fs.writeFileSync(
    path.join(host, "package.json"),
    JSON.stringify({ name: "smoke-host", private: true }, null, 2) + "\n",
  );

  run(
    "node",
    [
      path.join(REPO_ROOT, "dist/cli/setup.js"),
      "--template=tech-docs",
      "--service-id=SMK",
      "--project=smoke",
      "--repo=test/test",
      "--source=file",
      `--file-path=${tgz}`,
    ],
    host,
    { label: "setup --template=tech-docs" },
  );

  // The wizard already wrote the dependencies and the hoist patterns.
  run("pnpm", ["install"], host, {
    label: "pnpm install (tech-docs deps)",
    env: { HUSKY: "0" },
  });
  verifyHoistPatterns(host);

  run("pnpm", ["docs:build"], host, { label: "pnpm docs:build (tech-docs)" });

  const dir = path.join(host, "tech-docs");
  logger.success(`tech-docs sandbox ready at ${dir}`);
  return { host, dir };
}

function scaffoldAna(tgz: string): string {
  logger.heading("Building ana sandbox");
  const parent = path.join(SMOKE_ROOT, "ana-parent");
  fs.rmSync(parent, { recursive: true, force: true });
  fs.mkdirSync(parent, { recursive: true });

  run(
    "node",
    [
      // The wizard is compiled to dist/cli/ by the `prepare` build that runs
      // during `pnpm pack` above, so dist/ is present by the time we get here.
      path.join(REPO_ROOT, "dist/cli/setup.js"),
      "ana_test",
      "--template=ana-docs",
      "--source=file",
      `--file-path=${tgz}`, // the scaffold prepends `file:` itself
      "--no-git",
    ],
    parent,
    { label: "setup --template=ana-docs ana_test" },
  );

  const dir = path.join(parent, "ana_test");
  run("pnpm", ["install"], dir, {
    label: "pnpm install (ana)",
    env: { HUSKY: "0" },
  });

  verifyHoistPatterns(dir);

  // Read-only verifications only. `pnpm fix` is left out because it triggers
  // the normalize bug that is tracked separately.
  run("pnpm", ["docs:validate"], dir, { label: "pnpm docs:validate" });
  run("pnpm", ["docs:build"], dir, { label: "pnpm docs:build" });
  run("pnpm", ["sync"], dir, { label: "pnpm sync" });

  logger.success(`ana sandbox ready at ${dir}`);
  return dir;
}

/**
 * The "offers monorepo" use case (github-vercel-migration §1.2): scaffolding
 * a second folder inside a repo that already exists must not nest a repo
 * inside it, must derive `repo`/`repo-subdir` from the existing origin, and
 * must not clobber the first offer's `.github/workflows/ci.yml`.
 */
function scaffoldOffersMonorepo(tgz: string): {
  repoDir: string;
  secondOfferDir: string;
} {
  logger.heading("Building offers-monorepo sandbox");
  const repoDir = path.join(SMOKE_ROOT, "offers-repo");
  fs.rmSync(repoDir, { recursive: true, force: true });
  fs.mkdirSync(repoDir, { recursive: true });

  spawnSync("git", ["-c", "init.defaultBranch=main", "init", "-q"], {
    cwd: repoDir,
  });
  spawnSync(
    "git",
    [
      "remote",
      "add",
      "origin",
      "git@github.com:TechFides/tf-sales-private-offers.git",
    ],
    { cwd: repoDir },
  );

  run(
    "node",
    [
      path.join(REPO_ROOT, "dist/cli/setup.js"),
      "offer_one",
      "--template=ana-docs",
      "--source=file",
      `--file-path=${tgz}`,
    ],
    repoDir,
    { label: "setup --template=ana-docs offer_one (first offer)" },
  );

  run(
    "node",
    [
      path.join(REPO_ROOT, "dist/cli/setup.js"),
      "offer_two",
      "--template=ana-docs",
      "--source=file",
      `--file-path=${tgz}`,
    ],
    repoDir,
    { label: "setup --template=ana-docs offer_two (second offer)" },
  );

  logger.success(`offers-monorepo sandbox ready at ${repoDir}`);
  return { repoDir, secondOfferDir: path.join(repoDir, "offer_two") };
}

// ─── entry point ─────────────────────────────────────────────────────────────

async function globalSetup(): Promise<void> {
  logger.heading(`Smoke sandbox: ${SMOKE_ROOT}`);
  killOrphanProbes();
  fs.mkdirSync(SMOKE_ROOT, { recursive: true });

  const tgz = packRepo();
  logger.success(`packed ${path.basename(tgz)}`);

  const techDocs = scaffoldTechDocs(tgz);
  const anaDir = scaffoldAna(tgz);
  const offersMonorepo = scaffoldOffersMonorepo(tgz);

  const sandboxes: Sandboxes = {
    tgz,
    techDocsHostDir: techDocs.host,
    techDocsDir: techDocs.dir,
    anaDir,
    offersRepoDir: offersMonorepo.repoDir,
    secondOfferDir: offersMonorepo.secondOfferDir,
  };
  fs.writeFileSync(
    path.join(SMOKE_ROOT, "sandboxes.json"),
    JSON.stringify(sandboxes, null, 2),
  );

  logger.heading("Sandboxes ready, handing off to spec files");
}

export default globalSetup;
