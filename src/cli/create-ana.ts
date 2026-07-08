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

// gitlab, not github: the scaffold's CI token `insteadOf` rewrite only covers gitlab.com.
const GITLAB_HOST = "gitlab.com";
const GITLAB_GROUP = "techfides/tf-analysis";

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
                            npm        — published npm version (default). Installs from
                                         the public registry — no git credentials needed
                                         in CI or the Docker build.
                            git        — git+ssh URL pinned to --ref tag
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
  create-ana ajp_ana  --gcp-project=tfsa-ajp --server=nginx    # installs the published npm version
  create-ana lapa_ana --gcp-project=tfsa-lapa --server=nginx-auth
  create-ana foo_ana  --dev                                    # local dev → file:../tf-doc-vault
  create-ana bar_ana  --source=git --ref=v0.2.0                # pin to a specific git tag
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

export function resolveSource(flags: ParsedArgs["flags"]): string {
  return String(flags.source ?? (flags.dev ? "file" : "npm"));
}

/**
 * The `@techfides/tf-doc-vault` dependency spec written into the scaffold.
 *
 * Defaults to the published npm version so CI and the Docker build install from
 * the public registry with no git credentials — the old `git+ssh://git@github.com`
 * default was unfetchable from GitLab CI (its token rewrite only covers gitlab.com).
 * `ctx` is injectable for tests.
 */
export function resolveDependencyValue(
  flags: ParsedArgs["flags"],
  targetDir: string,
  ctx: { version: string; packageDir: string } = {
    version: packageVersion(),
    packageDir: PACKAGE_DIR,
  },
): string {
  const source = resolveSource(flags);
  // typeof, not ??: a bare value-flag (`--ref` with no `=value`) parses as
  // boolean `true`, which `??` would interpolate as the literal "true".
  const ref = typeof flags.ref === "string" ? flags.ref : `v${ctx.version}`;
  const gitUrl =
    typeof flags["git-url"] === "string"
      ? flags["git-url"]
      : "git+ssh://git@github.com/techfides/tf-doc-vault.git";

  switch (source) {
    case "npm":
      return ctx.version;
    case "git":
      return `${gitUrl}#${ref}`;
    case "file": {
      const target =
        typeof flags["file-path"] === "string"
          ? flags["file-path"]
          : path.relative(targetDir, ctx.packageDir);
      return `file:${target}`;
    }
    default:
      console.error(`✗ Invalid --source: ${source}. Use npm | git | file.`);
      process.exit(1);
  }
}

export function originUrl(projectName: string): string {
  return `git@${GITLAB_HOST}:${GITLAB_GROUP}/${projectName}.git`;
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
function warnIfEmbeddedInWorkspace(
  targetDir: string,
  ancestor: string | null,
): void {
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

/**
 * Pre-generate `pnpm-lock.yaml` before the scaffold's own `git commit`, which
 * runs before the user's first `pnpm install`. Without it the pushed repo has no
 * lockfile and CI/Docker `pnpm install --frozen-lockfile` aborts on
 * ERR_PNPM_NO_LOCKFILE. Non-fatal — warn and let the user generate it if pnpm is
 * unavailable or the dependency can't be resolved.
 */
function generateLockfile(dir: string): boolean {
  const r = spawnSync("pnpm", ["install", "--lockfile-only"], {
    cwd: dir,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    process.stderr.write(
      "\n⚠  Could not pre-generate pnpm-lock.yaml. Run `pnpm install` and " +
        "commit the resulting pnpm-lock.yaml before pushing — CI and the " +
        "Docker build install with --frozen-lockfile and fail without it.\n",
    );
    return false;
  }
  return true;
}

function main(): void {
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

  // --ref / --git-url apply only to --source=git; warn rather than ignore silently.
  if (
    resolveSource(flags) !== "git" &&
    (flags.ref !== undefined || flags["git-url"] !== undefined)
  ) {
    console.error(
      `⚠  --ref/--git-url are ignored unless --source=git (current source: ${resolveSource(flags)}).`,
    );
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  const vitepressCommonDep = resolveDependencyValue(flags, targetDir);
  const skipGit = Boolean(flags["no-git"]);

  if (fs.existsSync(targetDir)) {
    console.error(`✗ Target already exists: ${targetDir}`);
    process.exit(1);
  }

  console.log(`Creating a new analysis docs repo:`);
  console.log(`  target    : ${targetDir}`);
  console.log(`  project   : ${projectName}`);
  console.log(`  GCP       : ${gcpProject}`);
  console.log(`  server    : ${serverType}`);
  console.log(`  common    : ${vitepressCommonDep}`);
  console.log(`  git       : ${skipGit ? "no (embedded)" : "yes"}`);

  copyDir(TEMPLATE_DIR, targetDir, { renameEntry: consumerName });

  replacePlaceholders(targetDir, {
    __PROJECT__: projectName,
    __PROJECT_DASHED__: projectName.replace(/_/g, "-"),
    __GCP_PROJECT__: gcpProject,
    __SERVER_TYPE__: serverType,
    __VITEPRESS_COMMON_DEP__: vitepressCommonDep,
    __DATE__: new Date().toISOString().slice(0, 10),
    // Basic auth defaults to empty; the user fills it in .gitlab-ci.yml
    // later as actually needed (only for the nginx-auth runtime).
    __BASIC_AUTH_USER__: "",
    __BASIC_AUTH_PASS__: "",
  });

  const ancestorWorkspace = findAncestorFile(targetDir, "pnpm-workspace.yaml");
  warnIfEmbeddedInWorkspace(targetDir, ancestorWorkspace);

  // Embedded scaffolds share the parent workspace's lockfile at its root.
  if (!ancestorWorkspace) generateLockfile(targetDir);

  if (!skipGit) {
    // `-c init.defaultBranch=master`, not `git init -b` (git >= 2.28): version-safe
    // (older git ignores the unknown config key and defaults to master anyway) and
    // matches the documented push command / CI default-branch rules / editLink.
    spawnSync("git", ["-c", "init.defaultBranch=master", "init", "-q"], {
      cwd: targetDir,
      stdio: "inherit",
    });
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
If @techfides/tf-doc-vault is not built yet, run once:
  (cd ${path.relative(targetDir, PACKAGE_DIR) || "."} && pnpm install)
  # → installs deps and builds dist/ (via the "prepare" hook)
`
    : "";

  if (skipGit) {
    console.log(`
✓ Done (embedded — no standalone git repository).
${devBootstrap}
Next steps:
  cd ${projectName}
  pnpm install
  pnpm docs:dev          # http://localhost:5173

The documentation lives inside the parent repository.
Commit it together with your other changes:
  git add ${projectName}/
  git commit -m "docs: add ${projectName} analytical documentation"
  git push

Deploy (Cloud Run — its own pipeline, independent of the service):
  cd ${projectName}/infra
  terraform init && terraform apply
  # set CI/CD variables (GCP_SA_KEY, …) from the terraform outputs
`);
  } else {
    console.log(`
✓ Done.
${devBootstrap}
Next steps:
  cd ${projectName}
  pnpm install
  pnpm docs:dev          # http://localhost:5173

Deploy:
  cd infra
  terraform init && terraform apply
  # set CI/CD variables (GCP_SA_KEY, …) from the terraform outputs
  git remote add origin ${originUrl(projectName)}
  git push -u origin master
`);
  }
}

// Run main() only when invoked as a CLI, not when a test imports the exported
// helpers. realpath resolves the bin symlink so node_modules/.bin still matches.
const invokedAsScript = ((): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedAsScript) main();
