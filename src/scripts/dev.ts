import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUNDLE_NAME_RE,
  INSTALL_TIMEOUT_MS,
  installSkills,
} from "../cli/install-skills.js";
import { syncSkills } from "./skills-sync.js";

/*
 * `tf-doc-vault dev`: sync the documentation skills with the library (see
 * skills-sync.ts), then start VitePress. Everything not addressed to this
 * script is VitePress's.
 */

const args = process.argv.slice(2);
const take = (flag: string): string | undefined =>
  args.find((a) => a.startsWith(`${flag}=`))?.split("=", 2)[1];
const root = take("--root") ?? "docs";
const bundleArg = take("--skills-bundle");
const forwarded = args.filter(
  (a) => !a.startsWith("--root=") && !a.startsWith("--skills-bundle="),
);

const PACKAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
// npx resolves @latest before anything runs, so even a check is seconds.
const CHECK_TIMEOUT_MS = 15_000;
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

function tfSkillsJson(sub: string[], target: string): unknown {
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

function updateSkills(target: string): boolean {
  const r = spawnSync("npx", [...CLI, "update", "--all", "--target", target], {
    stdio: "inherit",
    timeout: INSTALL_TIMEOUT_MS,
    shell: WIN,
  });
  return r.status === 0;
}

// The flag comes from a manifest-generated script; anything else stays out of the shell.
const bundle =
  bundleArg !== undefined && BUNDLE_NAME_RE.test(bundleArg)
    ? bundleArg
    : undefined;
if (bundleArg !== undefined && bundle === undefined) {
  console.log(`Ignoring --skills-bundle=${bundleArg}: not a bundle name.`);
}

try {
  syncSkills(bundle, {
    projectDir: process.cwd(),
    boilerplateDir: path.join(PACKAGE_DIR, "boilerplate"),
    env: process.env,
    hasToken,
    tfSkillsJson,
    update: updateSkills,
    install: installSkills,
    log: console.log,
  });
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
vitepress.on("error", (error) => {
  console.error(`Could not start vitepress: ${error.message}`);
  process.exit(1);
});
vitepress.on("exit", (code, signal) => {
  if (signal) {
    // Die the way the server did, so the shell sees the signal and not exit 1.
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
