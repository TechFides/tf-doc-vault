#!/usr/bin/env node
/**
 * tf-doc-vault: CLI dispatcher for documentation tooling. `create`,
 * `init-tech-docs` and `import-confluence` are sibling CLI scripts in dist/cli/;
 * every other subcommand runs from dist/scripts/.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_DIR = __dirname; // dist/cli
const SCRIPTS_DIR = path.resolve(__dirname, "..", "scripts"); // dist/scripts

const COMMANDS: Record<string, string> = {
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

function runScript(scriptName: string, extraArgs: string[] = []): number {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    stdio: "inherit",
  });
  return result.status ?? 1;
}

function runVitepressBuild(): number {
  const result = spawnSync("vitepress", ["build", "docs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

function usage(exitCode = 0): never {
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

function runCliScript(scriptFile: string, extraArgs: string[] = []): number {
  const scriptPath = path.join(CLI_DIR, scriptFile);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    stdio: "inherit",
  });
  return result.status ?? 1;
}

const [, , cmd, ...rest] = process.argv;

if (!cmd || cmd === "--help" || cmd === "-h") usage(0);

if (cmd === "create") {
  process.exit(runCliScript("create-ana.js", rest));
}

if (cmd === "init-tech-docs") {
  process.exit(runCliScript("init-tech-docs.js", rest));
}

if (cmd === "import-confluence") {
  process.exit(runCliScript("import-confluence.js", rest));
}

if (cmd === "pdf") {
  let code = runScript("build-print-page.js");
  if (code !== 0) process.exit(code);
  code = runVitepressBuild();
  if (code !== 0) process.exit(code);
  code = runScript("export-pdf.js");
  process.exit(code);
}

const script = COMMANDS[cmd];
if (!script) {
  console.error(`Unknown command: ${cmd}`);
  usage(1);
}

process.exit(runScript(script, rest));
