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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, "..", "template");

function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (const a of argv) {
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq === -1) {
        args.flags[a.slice(2)] = true;
      } else {
        args.flags[a.slice(2, eq)] = a.slice(eq + 1);
      }
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

function usage(exitCode = 0) {
  console.log(`
create-ana <project-name> [options]

Arguments:
  <project-name>          Folder name and project shortname (e.g. "ajp_ana")

Options:
  --gcp-project=<id>      GCP project ID (filled into terraform.tfvars)
  --server=<type>         serve | nginx | nginx-auth   (default: nginx)
  --source=<src>          Where the new repo should pull @techfides/ana-docs from:
                            npm        — semver range "^<version>" (default)
                            workspace  — "workspace:*" (only valid inside the dev pnpm workspace)
                            git        — git+ssh URL pinned to --ref tag
                            file       — file:<path> to local checkout (--dev shortcut)
  --dev                   Shortcut for --source=file. Points to the local
                            @techfides/ana-docs checkout (this CLI's package).
                            Use for local development before publishing.
  --file-path=<path>      Override file: target when --source=file or --dev
                            (default: relative path from new repo to this package)
  --ref=<git-ref>         Git tag/branch/SHA to pin to when --source=git (default: v<package version>)
  --git-url=<url>         Override git URL when --source=git
                            default: git+ssh://git@gitlab.com/techfides/tf-analysis/ana-docs.git
  --no-git                Skip git init + first commit

Examples:
  create-ana ajp_ana  --gcp-project=tfsa-ajp --server=nginx
  create-ana lapa_ana --gcp-project=tfsa-lapa --server=nginx-auth
  create-ana foo_ana  --dev                                    # local dev → file:../ana-docs
  create-ana foo_ana  --source=workspace                       # local pnpm workspace dev
  create-ana bar_ana  --source=git --ref=v0.2.0                # install from git tag
`);
  process.exit(exitCode);
}

function packageVersion() {
  try {
    const pkgPath = path.resolve(__dirname, "..", "package.json");
    return JSON.parse(fs.readFileSync(pkgPath, "utf-8")).version;
  } catch {
    return "0.1.0";
  }
}

const PACKAGE_DIR = path.resolve(__dirname, "..");

function resolveDependencyValue(flags, targetDir) {
  // --dev is a shortcut for --source=file. Explicit --source still wins.
  const source = flags.source ?? (flags.dev ? "file" : "npm");
  const version = packageVersion();
  const ref = flags.ref ?? `v${version}`;
  const gitUrl =
    flags["git-url"] ??
    "git+ssh://git@gitlab.com/techfides/tf-analysis/ana-docs.git";

  switch (source) {
    case "npm":
      return `^${version}`;
    case "workspace":
      return "workspace:*";
    case "git":
      return `${gitUrl}#${ref}`;
    case "file": {
      const target = flags["file-path"] ?? path.relative(targetDir, PACKAGE_DIR);
      return `file:${target}`;
    }
    default:
      console.error(`✗ Invalid --source: ${source}. Use npm | workspace | git | file.`);
      process.exit(1);
  }
}

/**
 * Map a template filename to its on-disk consumer name.
 * `npm pack` always strips `.npmrc` and `.gitignore` from published packages,
 * so we ship them as `_npmrc` / `_gitignore` and rename on copy.
 */
function consumerName(templateName) {
  if (templateName === "_npmrc") return ".npmrc";
  if (templateName === "_gitignore") return ".gitignore";
  return templateName;
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, consumerName(entry.name));
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// Binary extensions to skip — everything else is treated as text.
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
  ".pdf", ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".zip", ".tar", ".gz", ".tgz",
]);

function replacePlaceholders(dir, replacements) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replacePlaceholders(full, replacements);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) continue;

    let content;
    try {
      content = fs.readFileSync(full, "utf-8");
    } catch {
      continue;
    }
    let changed = false;
    for (const [key, value] of Object.entries(replacements)) {
      if (content.includes(key)) {
        content = content.split(key).join(value);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(full, content);
  }
}

const { positional, flags } = parseArgs(process.argv.slice(2));

if (flags.help || flags.h || positional.length === 0) usage(0);

const projectName = positional[0];
if (!/^[a-z][a-z0-9_-]*$/.test(projectName)) {
  console.error(`✗ Invalid project name: ${projectName}`);
  console.error(`  Use lowercase letters, digits, hyphens or underscores; must start with a letter.`);
  process.exit(1);
}

const gcpProject = flags["gcp-project"] ?? `tfsa-${projectName.replace(/_/g, "-")}`;
const serverType = flags.server ?? "nginx";

if (!["serve", "nginx", "nginx-auth"].includes(serverType)) {
  console.error(`✗ Invalid --server: ${serverType}. Use serve | nginx | nginx-auth.`);
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);
const vitepressCommonDep = resolveDependencyValue(flags, targetDir);

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

copyDirRecursive(TEMPLATE_DIR, targetDir);

replacePlaceholders(targetDir, {
  __PROJECT__: projectName,
  __PROJECT_DASHED__: projectName.replace(/_/g, "-"),
  __GCP_PROJECT__: gcpProject,
  __SERVER_TYPE__: serverType,
  __VITEPRESS_COMMON_DEP__: vitepressCommonDep,
});

if (!flags["no-git"]) {
  spawnSync("git", ["init", "-q"], { cwd: targetDir, stdio: "inherit" });
  spawnSync("git", ["add", "."], { cwd: targetDir, stdio: "inherit" });
  spawnSync(
    "git",
    ["commit", "-q", "-m", `Initial scaffold from @techfides/ana-docs`],
    { cwd: targetDir, stdio: "inherit" }
  );
}

const isDevSource = vitepressCommonDep.startsWith("file:") || vitepressCommonDep === "workspace:*";
const devBootstrap = isDevSource
  ? `
Pokud je @techfides/ana-docs ještě nezbuildovaný, spusť jednou:
  (cd ${path.relative(targetDir, PACKAGE_DIR) || "."} && pnpm install)
  # → nainstaluje deps a postaví dist/ (přes "prepare" hook)
`
  : "";

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
  # nastavit GitLab CI/CD variables (GCP_SA_KEY, …) dle outputů terraformu
  git remote add origin git@gitlab.com:techfides/tf-analysis/${projectName}.git
  git push -u origin master
`);
