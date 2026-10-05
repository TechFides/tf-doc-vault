import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUNDLE_NAME_RE,
  INSTALL_TIMEOUT_MS,
  installSkills,
} from "../cli/install-skills.js";
import {
  installFromLibrary,
  renderInstall,
  renderUpdate,
  updateSkills,
  type SkillsDeps,
} from "./skills-sync.js";

const USAGE = `Usage:
  tf-doc-vault skills install --bundle <name> [--force]
  tf-doc-vault skills update`;

const PACKAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
// npx resolves @latest before anything runs, so even a check is seconds.
const CHECK_TIMEOUT_MS = 15_000;
const CLI = ["--yes", "@techfides/tf-skills-manager@latest"];
const WIN = process.platform === "win32";

type Args =
  { sub: "install"; bundle: string; force: boolean } | { sub: "update" };

function fail(message: string): never {
  process.stderr.write(`${message}\n${USAGE}\n`);
  process.exit(1);
}

function parse(argv: string[]): Args {
  const [sub, ...rest] = argv;
  if (sub !== "install" && sub !== "update") {
    fail(sub ? `Unknown subcommand: ${sub}` : "Missing subcommand.");
  }
  let bundle: string | undefined;
  let force = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--force") force = true;
    else if (arg === "--bundle") bundle = rest[++i];
    else if (arg.startsWith("--bundle="))
      bundle = arg.slice("--bundle=".length);
    else fail(`Unknown argument: ${arg}`);
  }
  if (sub === "update") {
    if (bundle !== undefined || force) fail("update takes no arguments.");
    return { sub };
  }
  if (!bundle)
    fail(
      "install needs --bundle <name>: the bundle the template manifest names.",
    );
  if (!BUNDLE_NAME_RE.test(bundle)) fail(`Not a bundle name: ${bundle}`);
  return { sub, bundle, force };
}

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

function runUpdate(target: string): boolean {
  const r = spawnSync("npx", [...CLI, "update", "--all", "--target", target], {
    stdio: "inherit",
    timeout: INSTALL_TIMEOUT_MS,
    shell: WIN,
  });
  return r.status === 0;
}

const args = parse(process.argv.slice(2));
const deps: SkillsDeps = {
  projectDir: process.cwd(),
  boilerplateDir: path.join(PACKAGE_DIR, "boilerplate"),
  hasToken,
  tfSkillsJson,
  update: runUpdate,
  install: installSkills,
};

let rendered;
if (args.sub === "update") {
  rendered = renderUpdate(updateSkills(deps), process.stdout.isTTY === true);
} else {
  console.log(
    `Installing the "${args.bundle}" bundle from the TechFides skills library…`,
  );
  rendered = renderInstall(installFromLibrary(args.bundle, args.force, deps));
}
if (rendered.out) console.log(rendered.out);
if (rendered.err) console.error(rendered.err);
process.exit(rendered.exit);
