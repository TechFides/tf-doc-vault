#!/usr/bin/env node
/**
 * ana-docs — CLI dispatcher for project-level documentation tooling.
 *
 * Subcommands:
 *   print        generate docs/print.md (build-print-page.ts)
 *   export-pdf   render artifacts/docs-full.pdf from /print
 *   pdf          shortcut: print → vitepress build → export-pdf
 *   validate     frontmatter + links + images + markdown lint
 *   normalize    canonical frontmatter ordering
 *   ensure-lf    convert CRLF → LF
 *   fix          full pipeline (LF, normalize, format, lint --fix, typecheck, validate)
 *
 * All scripts run with cwd = project root. They look for `docs/` there.
 */

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");
const SCRIPTS_DIR = path.join(PKG_ROOT, "dist", "scripts");

const COMMANDS = {
  print: "build-print-page.js",
  "export-pdf": "export-pdf.js",
  validate: "validate-docs.js",
  normalize: "normalize-docs.js",
  "ensure-lf": "ensure-lf.js",
  fix: "fix.js",
  sync: "sync-template.js",
};

function runScript(scriptName, extraArgs = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    stdio: "inherit",
  });
  return result.status ?? 1;
}

function runVitepressBuild() {
  const result = spawnSync("vitepress", ["build", "docs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

function usage(exitCode = 0) {
  console.log(`
ana-docs <command>

Commands:
  print           Generate docs/print.md from sidebar order
  export-pdf      Render artifacts/docs-full.pdf from the /print page
  pdf             print → vitepress build docs → export-pdf
  validate        Run frontmatter + link + image + markdown-lint checks
  normalize       Canonicalize frontmatter field order
  ensure-lf       Normalize CRLF → LF
  fix             Full polish pipeline (LF, normalize, format, lint, typecheck, validate)
  sync            Diff infra/CI/config files against bundled template
                    --apply             overwrite drifted files
                    --files=a,b,c       restrict to a subset
`);
  process.exit(exitCode);
}

const [, , cmd, ...rest] = process.argv;

if (!cmd || cmd === "--help" || cmd === "-h") usage(0);

if (cmd === "pdf") {
  let code = runScript(COMMANDS.print);
  if (code !== 0) process.exit(code);
  code = runVitepressBuild();
  if (code !== 0) process.exit(code);
  code = runScript(COMMANDS["export-pdf"]);
  process.exit(code);
}

if (!(cmd in COMMANDS)) {
  console.error(`Unknown command: ${cmd}`);
  usage(1);
}

process.exit(runScript(COMMANDS[cmd], rest));
