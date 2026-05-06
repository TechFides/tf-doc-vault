/**
 * sync-template.ts
 *
 * Compare a consumer repo's "infrastructure" files (Dockerfile, CI, configs,
 * Terraform, …) against the bundled `template/` baseline and report drift.
 * Useful after upgrading @techfides/tf-doc-vault to pull in fixes that ship in the
 * template.
 *
 * Usage:
 *   tf-doc-vault sync                    show unified diff per drifted file
 *   tf-doc-vault sync --apply            overwrite consumer files with rendered template
 *   tf-doc-vault sync --files=a,b,c      restrict to specific paths
 *
 * Placeholders (`__PROJECT__`, `__PROJECT_DASHED__`, `__GCP_PROJECT__`,
 * `__SERVER_TYPE__`, `__VITEPRESS_COMMON_DEP__`) are auto-detected from the
 * consumer repo (directory name, package.json scripts, terraform.tfvars).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = process.cwd();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// dist/scripts/sync-template.js → package root → template/
const TEMPLATE_DIR = path.resolve(SCRIPT_DIR, "..", "..", "template");

const TRACKED_FILES: string[] = [
  "Dockerfile",
  ".gitlab-ci.yml",
  ".gitignore",
  ".npmrc",
  ".prettierrc",
  ".prettierignore",
  "eslint.config.js",
  "tsconfig.json",
  "docker/nginx.conf",
  "docker/nginx-auth.conf",
  "infra/main.tf",
  "infra/variables.tf",
  "infra/outputs.tf",
  "infra/terraform.tfvars.example",
];

interface CliFlags {
  apply: boolean;
  files: string[] | null;
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { apply: false, files: null };
  for (const arg of argv) {
    if (arg === "--apply") flags.apply = true;
    else if (arg.startsWith("--files=")) {
      flags.files = arg
        .slice("--files=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return flags;
}

function readJSON(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function detectPlaceholders(): Record<string, string> {
  const project = path.basename(PROJECT_ROOT);
  const dashed = project.replace(/_/g, "-");

  let serverType = "nginx";
  let depValue = "^0.1.2";
  const pkg = readJSON(path.join(PROJECT_ROOT, "package.json"));
  if (pkg) {
    const scripts = (pkg.scripts ?? {}) as Record<string, string>;
    const m = /SERVER_TYPE=([\w-]+)/.exec(scripts["docker:build"] ?? "");
    if (m?.[1]) serverType = m[1];

    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    if (deps["@techfides/tf-doc-vault"]) depValue = deps["@techfides/tf-doc-vault"]!;
  }

  let gcpProject = `tfsa-${dashed}`;
  for (const tfvarsName of ["infra/terraform.tfvars", "infra/terraform.tfvars.example"]) {
    try {
      const tfvars = fs.readFileSync(path.join(PROJECT_ROOT, tfvarsName), "utf-8");
      const m = /project_id\s*=\s*"([^"]+)"/.exec(tfvars);
      if (m?.[1] && !m[1].startsWith("__")) {
        gcpProject = m[1];
        break;
      }
    } catch {
      // file missing — try next candidate
    }
  }

  // Basic auth credentials live in consumer's .gitlab-ci.yml — sync must
  // preserve them across runs, otherwise sync:apply blasts production auth.
  let basicAuthUser = "";
  let basicAuthPass = "";
  try {
    const ci = fs.readFileSync(path.join(PROJECT_ROOT, ".gitlab-ci.yml"), "utf-8");
    const u = /^\s*BASIC_AUTH_USER:\s*"([^"]*)"/m.exec(ci);
    const p = /^\s*BASIC_AUTH_PASS:\s*"([^"]*)"/m.exec(ci);
    if (u?.[1] && !u[1].startsWith("__")) basicAuthUser = u[1];
    if (p?.[1] && !p[1].startsWith("__")) basicAuthPass = p[1];
  } catch {
    // fresh repo — no consumer CI yet
  }

  return {
    __PROJECT__: project,
    __PROJECT_DASHED__: dashed,
    __GCP_PROJECT__: gcpProject,
    __SERVER_TYPE__: serverType,
    __VITEPRESS_COMMON_DEP__: depValue,
    __BASIC_AUTH_USER__: basicAuthUser,
    __BASIC_AUTH_PASS__: basicAuthPass,
  };
}

function renderTemplate(content: string, placeholders: Record<string, string>): string {
  let out = content;
  for (const [key, value] of Object.entries(placeholders)) {
    out = out.split(key).join(value);
  }
  return out;
}

function unifiedDiff(actualPath: string, expected: string): string {
  const tmp = path.join(os.tmpdir(), `sync-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  fs.writeFileSync(tmp, expected);
  try {
    const r = spawnSync(
      "diff",
      ["-u", "--label", actualPath, "--label", "(template, rendered)", actualPath, tmp],
      { encoding: "utf-8" }
    );
    return r.stdout ?? "";
  } finally {
    fs.unlinkSync(tmp);
  }
}

interface Result {
  rel: string;
  status: "ok" | "missing" | "drift";
  diff?: string;
  expected?: string;
}

// `npm pack` strips dotfiles, so the template ships .gitignore / .npmrc
// under _gitignore / _npmrc and the scaffolder renames on copy. Mirror the
// same mapping when resolving the template counterpart of a consumer file.
function templateNameFor(rel: string): string {
  if (rel === ".gitignore") return "_gitignore";
  if (rel === ".npmrc") return "_npmrc";
  return rel;
}

function inspect(rel: string, placeholders: Record<string, string>): Result {
  const consumerPath = path.join(PROJECT_ROOT, rel);
  const templatePath = path.join(TEMPLATE_DIR, templateNameFor(rel));

  if (!fs.existsSync(templatePath)) return { rel, status: "ok" };

  const expected = renderTemplate(fs.readFileSync(templatePath, "utf-8"), placeholders);

  if (!fs.existsSync(consumerPath)) {
    return { rel, status: "missing", expected };
  }

  const actual = fs.readFileSync(consumerPath, "utf-8");
  if (actual === expected) return { rel, status: "ok" };

  return { rel, status: "drift", diff: unifiedDiff(consumerPath, expected), expected };
}

function applyResult(r: Result): void {
  if (r.expected === undefined) return;
  const consumerPath = path.join(PROJECT_ROOT, r.rel);
  fs.mkdirSync(path.dirname(consumerPath), { recursive: true });
  fs.writeFileSync(consumerPath, r.expected);
}

const flags = parseFlags(process.argv.slice(2));
const placeholders = detectPlaceholders();
const tracked = flags.files ?? TRACKED_FILES;

console.log(`Porovnávám ${tracked.length} souborů proti šabloně @techfides/tf-doc-vault.`);
console.log(`  cwd      : ${PROJECT_ROOT}`);
console.log(`  template : ${TEMPLATE_DIR}`);
console.log(`  detected : ${JSON.stringify(placeholders)}\n`);

let drifted = 0;
let missing = 0;
let okCount = 0;

for (const rel of tracked) {
  const r = inspect(rel, placeholders);
  if (r.status === "ok") {
    console.log(`  ✓ ${rel}`);
    okCount++;
    continue;
  }

  if (r.status === "missing") {
    console.log(`  ! missing  ${rel}`);
    missing++;
    if (flags.apply) {
      applyResult(r);
      console.log(`     → vytvořeno z šablony`);
    }
    continue;
  }

  drifted++;
  console.log(`\n  ✗ drift    ${rel}`);
  if (r.diff) console.log(r.diff);
  if (flags.apply) {
    applyResult(r);
    console.log(`     → přepsáno šablonou`);
  }
}

const total = drifted + missing;
console.log();
if (total === 0) {
  console.log(`✓ vše v sync (${okCount} souborů)`);
} else if (flags.apply) {
  console.log(`✓ aplikováno: ${drifted} drift + ${missing} missing → vyřešeno`);
} else {
  console.log(`✗ ${drifted} drift, ${missing} missing, ${okCount} ok`);
  console.log(`  Pro aplikaci spusť: tf-doc-vault sync --apply`);
  process.exit(1);
}
