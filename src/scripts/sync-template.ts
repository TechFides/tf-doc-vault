/**
 * Compares a consumer repo's deploy/CI/config files (Vercel config, auth
 * middleware, GitHub Actions workflow, lint/format configs) against the
 * bundled `boilerplate/` baseline and reports drift. Placeholders such as
 * `__PROJECT__` are auto-detected from the consumer repo: directory name and
 * package.json dependencies.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { boilerplateName } from "../cli/scaffold.js";
import { isEntryModule } from "../cli/utils.js";
import { readText, writeText } from "../shared/text-file.js";

const PROJECT_ROOT = process.cwd();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// dist/scripts/sync-template.js → package root → boilerplate/
export const BOILERPLATE_DIR = path.resolve(
  SCRIPT_DIR,
  "..",
  "..",
  "boilerplate",
);

// A tracked file with no boilerplate counterpart fails every sync run, which is
// why `.npmrc` is absent: the boilerplate ships no `_npmrc` baseline for it.
export const TRACKED_FILES: string[] = [
  "vercel.json",
  "middleware.ts",
  ".github/workflows/ci.yml",
  ".gitignore",
  ".gitattributes",
  ".prettierrc",
  ".prettierignore",
  "eslint.config.js",
  "tsconfig.json",
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
    return JSON.parse(readText(p));
  } catch {
    return null;
  }
}

function detectPlaceholders(): Record<string, string> {
  const project = path.basename(PROJECT_ROOT);
  const dashed = project.replace(/_/g, "-");

  let depValue = "^0.1.2";
  const pkg = readJSON(path.join(PROJECT_ROOT, "package.json"));
  if (pkg) {
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    if (deps["@techfides/tf-doc-vault"])
      depValue = deps["@techfides/tf-doc-vault"]!;
  }

  return {
    __PROJECT__: project,
    __PROJECT_DASHED__: dashed,
    __VITEPRESS_COMMON_DEP__: depValue,
  };
}

function renderTemplate(
  content: string,
  placeholders: Record<string, string>,
): string {
  let out = content;
  for (const [key, value] of Object.entries(placeholders)) {
    out = out.split(key).join(value);
  }
  return out;
}

function unifiedDiff(
  actualPath: string,
  actual: string,
  expected: string,
): string {
  const stem = path.join(
    os.tmpdir(),
    `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const actualTmp = `${stem}.actual.tmp`;
  const expectedTmp = `${stem}.expected.tmp`;
  fs.writeFileSync(actualTmp, actual);
  fs.writeFileSync(expectedTmp, expected);
  try {
    const r = spawnSync(
      "diff",
      [
        "-u",
        "--label",
        actualPath,
        "--label",
        "(template, rendered)",
        actualTmp,
        expectedTmp,
      ],
      { encoding: "utf-8" },
    );
    return r.stdout ?? "";
  } finally {
    fs.unlinkSync(actualTmp);
    fs.unlinkSync(expectedTmp);
  }
}

interface Result {
  rel: string;
  status: "ok" | "missing" | "drift" | "no-baseline";
  diff?: string;
  expected?: string;
}

export function resolveBoilerplatePath(rel: string): string {
  return path.join(BOILERPLATE_DIR, boilerplateName(rel));
}

function inspect(rel: string, placeholders: Record<string, string>): Result {
  const consumerPath = path.join(PROJECT_ROOT, rel);
  const boilerplatePath = resolveBoilerplatePath(rel);

  // Reporting a lost baseline as "ok" would keep the regression silent.
  if (!fs.existsSync(boilerplatePath)) return { rel, status: "no-baseline" };

  const expected = renderTemplate(readText(boilerplatePath), placeholders);

  if (!fs.existsSync(consumerPath)) {
    return { rel, status: "missing", expected };
  }

  const actual = readText(consumerPath);
  if (actual === expected) return { rel, status: "ok" };

  return {
    rel,
    status: "drift",
    diff: unifiedDiff(consumerPath, actual, expected),
    expected,
  };
}

// Only `.gitignore` is the host's; every other baseline is ours and goes out LF.
const HOST_OWNED = new Set([".gitignore"]);

function applyResult(r: Result): void {
  if (r.expected === undefined) return;
  const consumerPath = path.join(PROJECT_ROOT, r.rel);
  fs.mkdirSync(path.dirname(consumerPath), { recursive: true });
  if (HOST_OWNED.has(r.rel)) writeText(consumerPath, r.expected);
  else fs.writeFileSync(consumerPath, r.expected, "utf-8");
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2));
  const placeholders = detectPlaceholders();
  const tracked = flags.files ?? TRACKED_FILES;

  console.log(
    `Comparing ${tracked.length} file(s) against the @techfides/tf-doc-vault boilerplate.`,
  );
  console.log(`  cwd         : ${PROJECT_ROOT}`);
  console.log(`  boilerplate : ${BOILERPLATE_DIR}`);
  console.log(`  detected    : ${JSON.stringify(placeholders)}\n`);

  let drifted = 0;
  let missing = 0;
  let noBaseline = 0;
  let okCount = 0;

  for (const rel of tracked) {
    const r = inspect(rel, placeholders);
    if (r.status === "ok") {
      console.log(`  ✓ ${rel}`);
      okCount++;
      continue;
    }

    if (r.status === "no-baseline") {
      console.log(`  ✗ no baseline  ${rel} (not in the boilerplate)`);
      noBaseline++;
      continue;
    }

    if (r.status === "missing") {
      console.log(`  ! missing  ${rel}`);
      missing++;
      if (flags.apply) {
        applyResult(r);
        console.log(`     → created from the boilerplate`);
      }
      continue;
    }

    drifted++;
    console.log(`\n  ✗ drift    ${rel}`);
    if (r.diff) console.log(r.diff);
    if (flags.apply) {
      applyResult(r);
      console.log(`     → overwritten from the boilerplate`);
    }
  }

  console.log();
  if (drifted + missing + noBaseline === 0) {
    console.log(`✓ all in sync (${okCount} files)`);
    return;
  }
  if (flags.apply && noBaseline === 0) {
    console.log(`✓ applied: ${drifted} drift + ${missing} missing → resolved`);
    return;
  }
  console.log(
    `✗ ${drifted} drift, ${missing} missing, ${noBaseline} without a baseline, ${okCount} ok`,
  );
  // --apply exits 1 on a file without a baseline too, so pointing the reader at
  // it for that case alone would loop.
  if (!flags.apply && drifted + missing > 0) {
    console.log(
      `  To overwrite the ${drifted + missing} fixable file(s), run: tf-doc-vault sync --apply`,
    );
  }
  if (noBaseline > 0) {
    console.log(
      `  A file without a baseline cannot be applied. Drop it from --files, or` +
        ` upgrade @techfides/tf-doc-vault to a version whose boilerplate ships it.`,
    );
  }
  process.exit(1);
}

if (isEntryModule(import.meta.url)) main();
