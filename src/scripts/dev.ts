import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installSkills, type Runner } from "../cli/install-skills.js";
import {
  adviceFor,
  classify,
  isPristine,
  matchesTemplate,
  switchAdvice,
  unmanagedAdvice,
} from "./skills-state.js";

/*
 * Keeps the documentation skills in step with the TechFides skills library,
 * then starts VitePress. Nothing in the skills step can stop the server from
 * starting, and nothing a person edited by hand is ever replaced:
 * - no GitHub token, or TF_DOC_VAULT_SKILLS=off: skip everything
 * - the bundled set, byte-identical to what this package ships: swap it for
 *   the library set; edited in any way: print the command, change nothing
 * - the library set: adopt (records a clone's files as managed), check, and
 *   when behind `tf-skills update` without --force, which refuses edited skills
 */

const args = process.argv.slice(2);
const take = (flag: string): string | undefined =>
  args.find((a) => a.startsWith(`${flag}=`))?.split("=", 2)[1];
const root = take("--root") ?? "docs";
const bundle = take("--skills-bundle");
const forwarded = args.filter(
  (a) => !a.startsWith("--root=") && !a.startsWith("--skills-bundle="),
);

const PACKAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const BOILERPLATE = path.join(PACKAGE_DIR, "boilerplate");
// npx resolves @latest before anything runs, so even a check is seconds; an
// install or update fetches every blob and is a one-off worth waiting for.
const CHECK_TIMEOUT_MS = 15_000;
const WRITE_TIMEOUT_MS = 120_000;
const CLI = ["--yes", "@techfides/tf-skills-manager@latest"];
const WIN = process.platform === "win32";

function hasToken(): boolean {
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) return true;
  const r = spawnSync("gh", ["auth", "token"], {
    encoding: "utf-8",
    timeout: CHECK_TIMEOUT_MS,
  });
  return r.status === 0 && r.stdout.trim().length > 0;
}

function tfSkillsJson(sub: string[], target: string): unknown | null {
  const r = spawnSync("npx", [...CLI, ...sub, "--json", "--target", target], {
    encoding: "utf-8",
    timeout: CHECK_TIMEOUT_MS,
    shell: WIN,
  });
  if (r.status !== 0 || !r.stdout) return null;
  try {
    return JSON.parse(r.stdout) as unknown;
  } catch {
    return null;
  }
}

function dirNames(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/** Every regular file under `dir`, keyed by POSIX-relative path; a missing dir is empty. */
function readTree(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (d: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.isFile()) {
        out.set(
          path.relative(dir, abs).split(path.sep).join("/"),
          fs.readFileSync(abs),
        );
      }
    }
  };
  walk(dir);
  return out;
}

function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

/** installSkills' default runner has no timeout; a dev start needs one. */
const timedRunner: Runner = (command, cmdArgs) => {
  const r = spawnSync(command, cmdArgs, {
    encoding: "utf-8",
    stdio: ["ignore", "inherit", "pipe"],
    timeout: WRITE_TIMEOUT_MS,
    shell: WIN,
  });
  if (r.error) throw r.error;
  return { status: r.status, stderr: r.stderr ?? "" };
};

function switchFromFallback(target: string, bundleName: string): void {
  const projectDir = process.cwd();
  const claudeMd = readText(path.join(projectDir, "CLAUDE.md"));
  const template = readText(path.join(BOILERPLATE, "CLAUDE.md"));
  const pristine =
    isPristine(
      readTree(target),
      readTree(path.join(BOILERPLATE, ".claude", "skills")),
    ) &&
    isPristine(
      readTree(path.join(projectDir, ".claude", "commands")),
      readTree(path.join(BOILERPLATE, ".claude", "commands")),
    ) &&
    claudeMd !== null &&
    template !== null &&
    matchesTemplate(claudeMd, template);
  if (!pristine) {
    console.log(`\n${switchAdvice(target, bundleName)}\n`);
    return;
  }
  console.log(
    "\nSwitching the bundled documentation skills for the TechFides library set...",
  );
  const result = installSkills(bundleName, projectDir, timedRunner);
  if (!result.ok) {
    console.log(
      `Could not install (${result.reason ?? "unknown"}); bundled skills kept.\n${switchAdvice(target, bundleName)}\n`,
    );
    return;
  }
  console.log(
    result.claudeMd === "replaced"
      ? "Documentation skills and CLAUDE.md installed from the library: review with git status and commit.\n"
      : "Documentation skills installed from the library (CLAUDE.md kept, the bundle ships none): review with git status and commit.\n",
  );
}

function updateSkills(target: string): boolean {
  const r = spawnSync("npx", [...CLI, "update", "--all", "--target", target], {
    stdio: "inherit",
    timeout: WRITE_TIMEOUT_MS,
    shell: WIN,
  });
  return r.status === 0;
}

interface Check {
  behind?: number;
  needForce?: boolean;
  skills?: Record<string, { state?: string }>;
}

function syncSkills(): void {
  if (!bundle || process.env.TF_DOC_VAULT_SKILLS === "off" || !hasToken()) {
    return;
  }
  const target = path.resolve(process.cwd(), ".claude", "skills");
  const installed = dirNames(target);
  if (
    classify(
      installed,
      dirNames(path.join(BOILERPLATE, ".claude", "skills")),
    ) === "fallback"
  ) {
    switchFromFallback(target, bundle);
    return;
  }
  tfSkillsJson(["adopt", "--all"], target);
  const check = tfSkillsJson(["check"], target) as Check | null;
  if (!check || typeof check.behind !== "number") return;
  const states = Object.values(check.skills ?? {}).map((s) => s.state);
  if (
    installed.length > 0 &&
    states.length > 0 &&
    states.every((s) => s === "unmanaged")
  ) {
    console.log(`\n${unmanagedAdvice(target, bundle)}\n`);
    return;
  }
  if (check.behind === 0) return;
  if (updateSkills(target)) {
    console.log(
      "\nDocumentation skills updated from the library: review with git status and commit.\n",
    );
    return;
  }
  const advice = adviceFor(
    { behind: check.behind, needForce: check.needForce === true },
    target,
  );
  if (advice) console.log(`\n${advice}\n`);
}

try {
  syncSkills();
} catch {
  // Skills are additive; the dev server starts regardless.
}

const vitepress = spawn("vitepress", ["dev", root, ...forwarded], {
  stdio: "inherit",
  shell: WIN,
});
// A signal to this process must reach the server, or it outlives its terminal.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => vitepress.kill(signal));
}
vitepress.on("error", () => process.exit(1));
vitepress.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
