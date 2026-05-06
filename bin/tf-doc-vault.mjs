#!/usr/bin/env node
/**
 * tf-doc-vault — CLI dispatcher for documentation tooling.
 *
 * Subcommands:
 *   create            scaffold a new analysis docs repo (delegates to bin/create-ana.mjs)
 *   init-tech-docs    initialise tech-docs/ in an existing service repo
 *   import-confluence import pages from Confluence into tech-docs/v1/
 *   print             generate docs/print.md (build-print-page.ts)
 *   export-pdf        render artifacts/docs-full.pdf from /print
 *   pdf               shortcut: print → vitepress build → export-pdf
 *   validate          frontmatter + links + images + markdown lint
 *   normalize         canonical frontmatter ordering
 *   ensure-lf         convert CRLF → LF
 *   fix               full pipeline (LF, normalize, format, lint --fix, typecheck, validate)
 *   sync              diff infra/CI/config files against bundled template
 *   gen-diagrams      generate business/technical analysis SVG diagrams
 *   gen-wireframes    generate wireframe SVGs
 *   replace-wireframes replace ASCII wireframe code blocks in docs/v1/index.md with SVG image refs
 *
 * `create`, `init-tech-docs` and `import-confluence` are bin scripts in bin/; all others run from dist/scripts/.
 */

import { spawnSync } from "node:child_process";
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
  "gen-diagrams": "generate-diagrams.cjs",
  "gen-wireframes": "generate-wireframes.cjs",
  "replace-wireframes": "replace-wireframes.cjs",
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
tf-doc-vault <command>

Commands:
  create <name>       Scaffold a new analysis docs repo from the bundled template
                        (see: tf-doc-vault create --help for options)
  init-tech-docs      Initialise tech-docs/ in an existing service repo
                        --service-id=<ID>   (required) service identifier, e.g. BAT
                        --project=<name>    project name (default: cwd folder name)
                        --repo=<org/repo>   GitHub repo for edit links (optional)
  import-confluence   Import pages from Confluence into tech-docs/v1/
                        --site=<host>             e.g. myorg.atlassian.net
                        --root-page-id=<id>       Confluence root page ID
                        --output=<dir>            output directory (default: ./tech-docs/v1)
  print               Generate docs/print.md from sidebar order
  export-pdf          Render artifacts/docs-full.pdf from the /print page
  pdf                 print → vitepress build docs → export-pdf
  validate            Run frontmatter + link + image + markdown-lint checks
                        --root=<dir>        docs root directory (default: docs)
  normalize           Canonicalize frontmatter field order
                        --root=<dir>        docs root directory (default: docs)
  ensure-lf           Normalize CRLF → LF
  fix                 Full polish pipeline (LF, normalize, format, lint, typecheck, validate)
                        --root=<dir>        docs root directory (default: docs)
  sync                Diff infra/CI/config files against bundled template
                        --apply             overwrite drifted files
                        --files=a,b,c       restrict to a subset
  gen-diagrams        Generate analysis SVG diagrams to docs/public/images/diagrams/
  gen-wireframes      Generate wireframe SVGs to docs/public/images/wireframes/
  replace-wireframes  Replace ASCII wireframes in docs/v1/index.md with SVG image refs
`);
  process.exit(exitCode);
}

function runBinScript(scriptFile, extraArgs = []) {
  const binPath = path.join(PKG_ROOT, "bin", scriptFile);
  const result = spawnSync(process.execPath, [binPath, ...extraArgs], {
    stdio: "inherit",
  });
  return result.status ?? 1;
}

const [, , cmd, ...rest] = process.argv;

if (!cmd || cmd === "--help" || cmd === "-h") usage(0);

if (cmd === "create") {
  process.exit(runBinScript("create-ana.mjs", rest));
}

if (cmd === "init-tech-docs") {
  process.exit(runBinScript("init-tech-docs.mjs", rest));
}

if (cmd === "import-confluence") {
  process.exit(runBinScript("import-confluence.mjs", rest));
}

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
