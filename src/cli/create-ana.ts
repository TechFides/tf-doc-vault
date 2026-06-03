#!/usr/bin/env node
/**
 * create-ana — scaffold a new TFSA analysis documentation repo from the
 * bundled template. Replaces __PROJECT__, __GCP_PROJECT__, __SERVER_TYPE__
 * placeholders, runs `git init`, and creates the first commit.
 *
 * Usage:
 *   create-ana <project-name> [--gcp-project=<id>] [--server=<serve|nginx|nginx-auth>] [--no-git]
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  parseArgs,
  copyDir,
  replacePlaceholders,
  findAncestorFile,
  type ParsedArgs,
} from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/cli → package root
const PACKAGE_DIR = path.resolve(__dirname, "..", "..");
const TEMPLATE_DIR = path.join(PACKAGE_DIR, "template");

function usage(exitCode = 0): never {
  console.log(`
create-ana <project-name> [options]

Arguments:
  <project-name>          Folder name and project shortname (e.g. "ajp_ana")

Options:
  --gcp-project=<id>      GCP project ID (filled into terraform.tfvars)
  --server=<type>         nginx | nginx-auth   (default: nginx)
  --source=<src>          Where the new repo should pull @techfides/tf-doc-vault from:
                            git        — git+ssh URL pinned to --ref tag (default)
                            file       — file:<path> to local checkout (--dev shortcut)
  --dev                   Shortcut for --source=file. Points to the local
                            @techfides/tf-doc-vault checkout (this CLI's package).
                            Use for local development before publishing.
  --file-path=<path>      Override file: target when --source=file or --dev
                            (default: relative path from new repo to this package)
  --ref=<git-ref>         Git tag/branch/SHA to pin to when --source=git (default: v<package version>)
  --git-url=<url>         Override git URL when --source=git
                            default: git+ssh://git@github.com/techfides/tf-doc-vault.git
  --no-git                Skip git init + first commit.
                            Use when embedding the docs inside an existing repo.
                            All infrastructure is still generated so the docs
                            can be deployed to Cloud Run independently.

Examples:
  create-ana ajp_ana  --gcp-project=tfsa-ajp --server=nginx
  create-ana lapa_ana --gcp-project=tfsa-lapa --server=nginx-auth
  create-ana foo_ana  --dev                                    # local dev → file:../tf-doc-vault
  create-ana bar_ana  --ref=v0.2.0                             # pin to a specific git tag
  create-ana erp_ana  --no-git                                 # embed inside an existing repo
`);
  process.exit(exitCode);
}

function packageVersion(): string {
  try {
    const pkgPath = path.join(PACKAGE_DIR, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function resolveDependencyValue(
  flags: ParsedArgs["flags"],
  targetDir: string,
): string {
  // --dev is a shortcut for --source=file. Explicit --source still wins.
  const source = flags.source ?? (flags.dev ? "file" : "git");
  const version = packageVersion();
  const ref = flags.ref ?? `v${version}`;
  const gitUrl =
    flags["git-url"] ?? "git+ssh://git@github.com/techfides/tf-doc-vault.git";

  switch (source) {
    case "git":
      return `${gitUrl}#${ref}`;
    case "file": {
      const target = flags["file-path"] ?? path.relative(targetDir, PACKAGE_DIR);
      return `file:${target}`;
    }
    default:
      console.error(`✗ Invalid --source: ${String(source)}. Use git | file.`);
      process.exit(1);
  }
}

/**
 * Map a template filename to its on-disk consumer name.
 * `npm pack` always strips `.npmrc` and `.gitignore` from published packages,
 * so we ship them as `_npmrc` / `_gitignore` and rename on copy.
 */
function consumerName(templateName: string): string {
  if (templateName === "_npmrc") return ".npmrc";
  if (templateName === "_gitignore") return ".gitignore";
  if (templateName === "_pnpm-workspace.yaml") return "pnpm-workspace.yaml";
  return templateName;
}

/**
 * Detect an ancestor `pnpm-workspace.yaml` above the scaffold target and, if
 * found, print a copy-pasteable instruction block to stderr explaining that
 * pnpm will silently ignore the scaffolded `pnpm-workspace.yaml`. Without
 * those instructions consumers hit a blank docs page with a cryptic dayjs
 * default-export SyntaxError in the browser console.
 *
 * Read-only with respect to the parent workspace — never patches the
 * ancestor file. The customer applies the diff themselves.
 */
function warnIfEmbeddedInWorkspace(targetDir: string): void {
  const ancestor = findAncestorFile(targetDir, "pnpm-workspace.yaml");
  if (!ancestor) return;

  const relativeFolder =
    path.relative(path.dirname(ancestor), targetDir) ||
    path.basename(targetDir);
  const rule = "─".repeat(68);

  process.stderr.write(`
${rule}
⚠  Detected parent pnpm workspace:
   ${ancestor}

Because pnpm only honors workspace config at the workspace root, the
pnpm-workspace.yaml and .npmrc inside ${relativeFolder}/ will be
IGNORED. Vitepress will fail to load mermaid's CJS transitive deps and
the page will render blank with:

   "dayjs.min.js does not provide an export named 'default'"

To fix this, merge the following into your parent pnpm-workspace.yaml:

   packages:
     - ${relativeFolder}
   publicHoistPattern:
     - "*mermaid*"
     - dayjs
     - debug
     - "@braintree/*"
     - cytoscape*
     - "@types/d3*"
     - d3-*
   allowBuilds:
     "@techfides/tf-doc-vault": true
     esbuild: true

Then re-run \`pnpm install\` from your monorepo root.

See README → "Embedding inside an existing pnpm workspace" for details.
${rule}
`);
}

const { positional, flags } = parseArgs(process.argv.slice(2));

const projectName = positional[0];
if (flags.help || flags.h || !projectName) usage(0);

if (!/^[a-z][a-z0-9_-]*$/.test(projectName)) {
  console.error(`✗ Invalid project name: ${projectName}`);
  console.error(
    `  Use lowercase letters, digits, hyphens or underscores; must start with a letter.`,
  );
  process.exit(1);
}

const gcpProject = String(
  flags["gcp-project"] ?? `tfsa-${projectName.replace(/_/g, "-")}`,
);
const serverType = String(flags.server ?? "nginx");

if (!["nginx", "nginx-auth"].includes(serverType)) {
  console.error(`✗ Invalid --server: ${serverType}. Use nginx | nginx-auth.`);
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);
const vitepressCommonDep = resolveDependencyValue(flags, targetDir);
const skipGit = Boolean(flags["no-git"]);

if (fs.existsSync(targetDir)) {
  console.error(`✗ Cíl už existuje: ${targetDir}`);
  process.exit(1);
}

console.log(`Vytvářím nové analýzové repo:`);
console.log(`  cíl       : ${targetDir}`);
console.log(`  projekt   : ${projectName}`);
console.log(`  GCP       : ${gcpProject}`);
console.log(`  server    : ${serverType}`);
console.log(`  common    : ${vitepressCommonDep}`);
console.log(`  git       : ${skipGit ? "ne (embedded)" : "ano"}`);

copyDir(TEMPLATE_DIR, targetDir, { renameEntry: consumerName });

replacePlaceholders(targetDir, {
  __PROJECT__: projectName,
  __PROJECT_DASHED__: projectName.replace(/_/g, "-"),
  __GCP_PROJECT__: gcpProject,
  __SERVER_TYPE__: serverType,
  __VITEPRESS_COMMON_DEP__: vitepressCommonDep,
  __DATE__: new Date().toISOString().slice(0, 10),
  // Basic auth defaultně prázdné; uživatel je vyplní v .gitlab-ci.yml
  // až podle reálné potřeby (jen pro nginx-auth runtime).
  __BASIC_AUTH_USER__: "",
  __BASIC_AUTH_PASS__: "",
});

warnIfEmbeddedInWorkspace(targetDir);

if (!skipGit) {
  spawnSync("git", ["init", "-q"], { cwd: targetDir, stdio: "inherit" });
  spawnSync("git", ["add", "."], { cwd: targetDir, stdio: "inherit" });
  spawnSync(
    "git",
    ["commit", "-q", "-m", `Initial scaffold from @techfides/tf-doc-vault`],
    { cwd: targetDir, stdio: "inherit" },
  );
}

const isDevSource = vitepressCommonDep.startsWith("file:");
const devBootstrap = isDevSource
  ? `
Pokud je @techfides/tf-doc-vault ještě nezbuildovaný, spusť jednou:
  (cd ${path.relative(targetDir, PACKAGE_DIR) || "."} && pnpm install)
  # → nainstaluje deps a postaví dist/ (přes "prepare" hook)
`
  : "";

if (skipGit) {
  console.log(`
✓ Hotovo (embedded — bez vlastního git repozitáře).
${devBootstrap}
Další kroky:
  cd ${projectName}
  pnpm install
  pnpm docs:dev          # http://localhost:5173

Dokumentace žije uvnitř nadřazeného repozitáře.
Commitni ji spolu s ostatními změnami:
  git add ${projectName}/
  git commit -m "docs: add ${projectName} analytical documentation"
  git push

Deploy (Cloud Run — vlastní pipeline nezávisle na službě):
  cd ${projectName}/infra
  terraform init && terraform apply
  # nastavit CI/CD variables (GCP_SA_KEY, …) dle outputů terraformu
`);
} else {
  console.log(`
✓ Hotovo.
${devBootstrap}
Další kroky:
  cd ${projectName}
  pnpm install
  pnpm docs:dev          # http://localhost:5173

Deploy:
  cd infra
  terraform init && terraform apply
  # nastavit CI/CD variables (GCP_SA_KEY, …) dle outputů terraformu
  git remote add origin git@github.com:techfides/tf-analysis/${projectName}.git
  git push -u origin master
`);
}
