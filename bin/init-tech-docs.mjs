#!/usr/bin/env node
/**
 * init-tech-docs — scaffold a tech-docs/ directory inside an existing service
 * repo from the bundled template. Replaces __SERVICE_ID__, __PROJECT__,
 * __REPO__, __DATE__ placeholders, then idempotently updates package.json
 * scripts and .gitignore.
 *
 * Usage:
 *   init-tech-docs --service-id=<ID> [--project=<name>] [--repo=<org/repo>]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, copyDir, replacePlaceholders } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, "..", "template-tech-docs");

function usage(exitCode = 0) {
  console.log(`
init-tech-docs [options]

Initialises a tech-docs/ directory in an existing service repo.

Options:
  --service-id=<ID>   (required) service identifier, e.g. BAT
  --project=<name>    project name (default: cwd folder name)
  --repo=<org/repo>   GitHub repo path for edit links (optional)

Example:
  tf-doc-vault init-tech-docs --service-id=BAT --project=myproject --repo=myorg/myrepo
`);
  process.exit(exitCode);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCRIPTS_TO_ADD = {
  "docs:dev": "vitepress dev tech-docs/docs",
  "docs:build": "vitepress build tech-docs/docs",
  "docs:validate": "tf-doc-vault validate --root=tech-docs/docs",
  "docs:normalize": "tf-doc-vault normalize --root=tech-docs/docs",
  "docs:fix": "tf-doc-vault fix --root=tech-docs/docs",
  "docs:lf": "tf-doc-vault ensure-lf --root=tech-docs/docs",
  "docs:print": "tf-doc-vault print --root=tech-docs/docs",
  "docs:export-pdf": "tf-doc-vault export-pdf --root=tech-docs/docs",
  "docs:import-confluence": "tf-doc-vault import-confluence",
};

function updatePackageJson(dir) {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn("  ⚠ package.json nenalezen, scripts nepřidány.");
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const scripts = pkg.scripts ?? {};
  let added = 0;
  for (const [key, value] of Object.entries(SCRIPTS_TO_ADD)) {
    if (!(key in scripts)) {
      scripts[key] = value;
      added++;
    }
  }
  if (added === 0) {
    console.log("  package.json — scripts již existují, přeskočeno.");
    return;
  }
  pkg.scripts = scripts;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`  package.json aktualizován (+${added} scripts)`);
}

const GITIGNORE_ENTRIES = [
  "tech-docs/docs/.vitepress/dist/",
  "tech-docs/docs/.vitepress/cache/",
];

function updateGitignore(dir) {
  const gitignorePath = path.join(dir, ".gitignore");
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : "";
  const missing = GITIGNORE_ENTRIES.filter((e) => !existing.includes(e));
  if (missing.length === 0) return;
  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(
    gitignorePath,
    existing + prefix + missing.join("\n") + "\n",
    "utf-8",
  );
  console.log(`  .gitignore aktualizován (+${missing.length} záznamy)`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const { flags } = parseArgs(process.argv.slice(2));

if (flags.help || flags.h) usage(0);

const serviceId = flags["service-id"];
if (!serviceId) {
  console.error("✗ --service-id je povinný argument.");
  usage(1);
}

const cwd = process.cwd();
const project = flags.project ?? path.basename(cwd);
const repo = flags.repo;
const outputDir = path.join(cwd, "tech-docs");

console.log(`\nInitializuji tech-docs/`);
console.log(`  service-id : ${serviceId}`);
console.log(`  project    : ${project}`);
if (repo) console.log(`  repo       : ${repo}`);
console.log();

const { copied, skipped } = copyDir(TEMPLATE_DIR, outputDir, {
  idempotent: true,
  // config.ts → config.mts: forces esbuild to treat the file as ESM so it can
  // import from @techfides/tf-doc-vault which is an ESM-only package.
  renameEntry: (name) => (name === "config.ts" ? "config.mts" : name),
});
console.log(
  `  zkopírováno: ${copied} souborů, přeskočeno: ${skipped} (již existují)`,
);

replacePlaceholders(outputDir, {
  __SERVICE_ID__: serviceId,
  __PROJECT__: project,
  __DATE__: new Date().toISOString().slice(0, 10),
  ...(repo ? { __REPO__: repo } : {}),
});

updatePackageJson(cwd);
updateGitignore(cwd);

console.log(`
✓ Hotovo. Další kroky:

  1) Přidej VitePress závislosti do devDependencies v package.json:
       "vitepress": "^1.6.4",
       "vitepress-plugin-mermaid": "^2.0.17",
       "mermaid": "^11.14.0"

  2) Nainstaluj závislosti a spusť lokální preview:
       npm install && npm run docs:dev

  3) Přidej docs-build stage do Dockerfile:
       viz /tech-docs/docs-build-stage.md

  4) Zavolej setupTechDocs() v main.ts (NestJS):
       import { setupTechDocs } from "@techfides/tf-doc-vault/setup/nest";
       await setupTechDocs("tech-docs", app, {
         auth: { username: "docs", password: process.env.TECH_DOCS_PASSWORD },
         basePath: '/tech-docs/',
       });

  5) Nastav TECH_DOCS_PASSWORD env proměnnou (dev/staging pouze, ne prod).
  
  6) Zbuildi lokálně dokumentaci:
      npm run docs:build
  
  7) Nastartuj aplikaci (pravděpodobně \`npm run dev\`):
      Zkontroluj, že na route /tech-docs/ beží dokumentace
      
      Username: docs
      Password: uloženo v env TECH_DOCS_PASSWORD
`);
