#!/usr/bin/env node
/**
 * tf-doc-vault: CLI dispatcher for documentation tooling. `setup` and
 * `import-confluence` are sibling CLI scripts in dist/cli/; every other
 * subcommand runs from dist/scripts/.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_DIR = __dirname; // dist/cli
const SCRIPTS_DIR = path.resolve(__dirname, "..", "scripts"); // dist/scripts
const PAGE_MAP_FILE = path.resolve(process.cwd(), "artifacts/.pagemap.json");
const PDF_MAX_PASSES = 3;

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

type PageMap = Record<string, number>;

function readPageMap(): PageMap {
  if (!fs.existsSync(PAGE_MAP_FILE)) return {};
  return JSON.parse(fs.readFileSync(PAGE_MAP_FILE, "utf-8")) as PageMap;
}

function pdfPass(withNumbers: boolean): { code: number; map: PageMap } {
  let code = runScript(
    "build-print-page.js",
    withNumbers ? [`--pages=${PAGE_MAP_FILE}`] : [],
  );
  if (code === 0) code = runVitepressBuild();
  if (code === 0) code = runScript("export-pdf.js");
  return { code, map: code === 0 ? readPageMap() : {} };
}

/**
 * Two passes, because a table of contents cannot carry page numbers until the
 * document has been paginated: the first pass exists to produce the anchor to
 * page map, the second prints it. Numbering can in principle repaginate the
 * document, so the loop runs until a pass moves nothing and reports instead of
 * shipping numbers it knows are stale.
 */
function runPdf(): number {
  fs.rmSync(PAGE_MAP_FILE, { force: true });

  console.log("\n[1/2] paginating\n");
  let { code, map } = pdfPass(false);
  if (code !== 0) return code;

  for (let attempt = 2; attempt <= PDF_MAX_PASSES; attempt++) {
    console.log(`\n[${attempt}/2] contents with page numbers\n`);
    const next = pdfPass(true);
    if (next.code !== 0) return next.code;

    const moved = Object.keys(next.map).filter(
      (slug) => map[slug] !== next.map[slug],
    );
    map = next.map;
    if (moved.length === 0) {
      console.log("\n✓ Page numbers in the contents match the exported PDF.");
      return 0;
    }
    console.log(`\n… pagination moved (${moved.length} anchors), repeating.`);
  }

  console.error(
    `\n✗ Pagination did not settle in ${PDF_MAX_PASSES} passes; contents may be a page out.`,
  );
  return 1;
}

function usage(exitCode = 0): never {
  console.log(`
tf-doc-vault <command>

Commands:
  setup [name]        Scaffold documentation from a bundled template
                        --template=<name>   template to scaffold; run
                                            "tf-doc-vault setup --help" for the list
  import-confluence   Import pages from Confluence into a docs folder
                        --site=<host>             e.g. myorg.atlassian.net
                        --root-page-id=<id>       Confluence root page ID
                        --output=<dir>            (required) output directory
  print               Generate docs/print.md from sidebar order
  export-pdf          Render artifacts/docs-full.pdf from the /print page
  pdf                 print, build and export, run twice so the contents carry page numbers
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

if (cmd === "setup") {
  process.exit(runCliScript("setup.js", rest));
}

if (cmd === "import-confluence") {
  process.exit(runCliScript("import-confluence.js", rest));
}

if (cmd === "pdf") {
  process.exit(runPdf());
}

const script = COMMANDS[cmd];
if (!script) {
  console.error(`Unknown command: ${cmd}`);
  usage(1);
}

process.exit(runScript(script, rest));
