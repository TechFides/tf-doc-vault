#!/usr/bin/env node
/**
 * init-tech-docs: scaffold a tech-docs/ directory inside an existing service
 * repo from the bundled template, then idempotently add the docs:* scripts to
 * package.json and the build outputs to .gitignore.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, copyDir, replacePlaceholders } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/cli → package root
const TEMPLATE_DIR = path.resolve(__dirname, "..", "..", "template-tech-docs");

function usage(exitCode = 0): never {
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

const SCRIPTS_TO_ADD: Record<string, string> = {
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

function updatePackageJson(dir: string): void {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn("  ⚠ package.json not found; scripts not added.");
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = pkg.scripts ?? {};
  let added = 0;
  for (const [key, value] of Object.entries(SCRIPTS_TO_ADD)) {
    if (!(key in scripts)) {
      scripts[key] = value;
      added++;
    }
  }
  if (added === 0) {
    console.log("  package.json: scripts already present; skipped.");
    return;
  }
  pkg.scripts = scripts;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`  package.json updated (+${added} scripts)`);
}

const GITIGNORE_ENTRIES = [
  "tech-docs/docs/.vitepress/dist/",
  "tech-docs/docs/.vitepress/cache/",
];

function updateGitignore(dir: string): void {
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
  console.log(`  .gitignore updated (+${missing.length} entries)`);
}

const { flags } = parseArgs(process.argv.slice(2));

if (flags.help || flags.h) usage(0);

const serviceId = flags["service-id"];
if (!serviceId) {
  console.error("✗ --service-id is a required argument.");
  usage(1);
}

const cwd = process.cwd();
const project = String(flags.project ?? path.basename(cwd));
const repo = flags.repo;
const outputDir = path.join(cwd, "tech-docs");

console.log(`\nInitializing tech-docs/`);
console.log(`  service-id : ${String(serviceId)}`);
console.log(`  project    : ${project}`);
if (repo) console.log(`  repo       : ${String(repo)}`);
console.log();

const { copied, skipped } = copyDir(TEMPLATE_DIR, outputDir, {
  idempotent: true,
  // config.ts → config.mts: forces esbuild to treat the file as ESM so it can
  // import from @techfides/tf-doc-vault which is an ESM-only package.
  renameEntry: (name) => (name === "config.ts" ? "config.mts" : name),
});
console.log(`  copied: ${copied} file(s), skipped: ${skipped} (already exist)`);

replacePlaceholders(outputDir, {
  __SERVICE_ID__: String(serviceId),
  __PROJECT__: project,
  __DATE__: new Date().toISOString().slice(0, 10),
  ...(repo ? { __REPO__: String(repo) } : {}),
});

updatePackageJson(cwd);
updateGitignore(cwd);

console.log(`
✓ Done. Next steps:

  1) Add the VitePress dependencies to devDependencies in package.json:
       "vitepress": "^1.6.4",
       "vitepress-plugin-mermaid": "^2.0.17",
       "mermaid": "^11.14.0"

  2) If you use pnpm v11+, allow esbuild's build script:
     create (or extend) pnpm-workspace.yaml at the service root:
       allowBuilds:
         esbuild: true
     Without this, pnpm 11 aborts every "pnpm <script>" with ERR_PNPM_IGNORED_BUILDS.

  3) Install dependencies and start a local preview:
       npm install && npm run docs:dev

  4) Add a docs-build stage to your Dockerfile:
       see /tech-docs/docs-build-stage.md

  5) Call setupTechDocs() in main.ts (NestJS):
       import { setupTechDocs } from "@techfides/tf-doc-vault/setup/nest";
       await setupTechDocs("tech-docs", app, {
         auth: { username: "docs", password: process.env.TECH_DOCS_PASSWORD },
         basePath: '/tech-docs/',
       });

  6) Set the TECH_DOCS_PASSWORD env variable (dev/staging only, not prod).

  7) Build the documentation locally:
      npm run docs:build

  8) Start the application (likely \`npm run dev\`):
      Check that the documentation is served at the /tech-docs/ route

      Username: docs
      Password: stored in the TECH_DOCS_PASSWORD env variable
`);
