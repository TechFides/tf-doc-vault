# Free from TechFides ❤️

<img src="./assets/techfides.svg" alt="TechFides logo" width="50"/>

- https://techfides.cz
- https://team.techfides.cz/
- https://techfides.eu

---

# @techfides/tf-doc-vault

[![npm version](https://img.shields.io/npm/v/@techfides/tf-doc-vault.svg)](https://www.npmjs.com/package/@techfides/tf-doc-vault)
[![npm downloads](https://img.shields.io/npm/dm/@techfides/tf-doc-vault.svg)](https://www.npmjs.com/package/@techfides/tf-doc-vault)
[![License: MIT](https://img.shields.io/npm/l/@techfides/tf-doc-vault.svg)](./LICENSE)
[![Node version](https://img.shields.io/node/v/@techfides/tf-doc-vault.svg)](https://www.npmjs.com/package/@techfides/tf-doc-vault)
[![CI](https://github.com/TechFides/tf-doc-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/TechFides/tf-doc-vault/actions/workflows/ci.yml)

**Shared VitePress tooling for TFSA documentation** — spin up a fully featured documentation site in under 5 minutes, with consistent tooling across every
project.

## Why this package exists

Every documentation project needs a similar boilerplate: a VitePress configuration, a versioned sidebar, shared UI components, a CI/CD pipeline, Docker images,
and Terraform infrastructure. Setting all of that up from scratch for each project takes long time and produces subtly divergent configurations that are hard to
maintain.

`@techfides/tf-doc-vault` solves this once and shares the solution across all projects. The core idea is **factory functions over copied files**: consumer repos
call `makeConfig()` and `createTheme()` — the package owns the implementation, so updates propagate automatically.

## What the package includes

| Module                | Purpose                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **`config`**          | `makeConfig()` — complete VitePress config with locales, versioned nav, sidebar, i18n, Mermaid, optional analytics and edit links. |
| **`theme`**           | `createTheme()` — shared Vue 3 components: DocMeta, ImageLightbox, PrintLayout, VersionSwitcher, optional WidthToggle.             |
| **`sidebar`**         | Auto-generates nav and sidebar from the `docs/<version>/<section>/<group>/` directory structure — no manual config.                |
| **`scripts`**         | CLI commands: validate, normalize, build print page, export to PDF, fix line endings, sync template.                               |
| **`setup/nest`**      | `setupTechDocs()` — NestJS middleware that mounts `tech-docs/dist/` at `/tech-docs` with Basic auth.                               |
| **`setup/express`**   | `createTechDocsHandler()` — same for plain Express.                                                                                |
| **`configs`**         | Shared `eslint.config.js`, `prettier.json`, `tsconfig.base.json` for consumer repos to extend.                                     |
| **`infra/terraform`** | Reusable GCP module: Cloud Run + Artifact Registry + IAM.                                                                          |
| **`docker`**          | Multi-stage Dockerfile with `nginx` / `nginx-auth` runtime variants.                                                               |
| **`template`**        | Skeleton repo used by the scaffolder (`create` command).                                                                           |

## Usage in an application repo

`docs/.vitepress/config.ts`:

```ts
import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "lapa",
  // optional:
  analytics: { provider: "umami", websiteId: "...", domain: "..." },
  editLink: { repo: "techfides/tf-analysis/lapa_ana", branch: "master" },
});
```

`docs/.vitepress/theme/index.ts`:

```ts
import { createTheme } from "@techfides/tf-doc-vault/theme";
import "./custom.css"; // overrides on top of base CSS

export default createTheme({ widthToggle: true });
```

`package.json`:

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:print": "tf-doc-vault print",
    "docs:export-pdf": "tf-doc-vault export-pdf",
    "docs:pdf": "tf-doc-vault pdf",
    "docs:validate": "tf-doc-vault validate",
    "docs:normalize": "tf-doc-vault normalize",
    "docs:lf": "tf-doc-vault ensure-lf",
    "sync": "tf-doc-vault sync",
    "sync:apply": "tf-doc-vault sync --apply",
    "fix": "tf-doc-vault fix"
  },
  "dependencies": {
    "@techfides/tf-doc-vault": "git+ssh://git@github.com/techfides/tf-doc-vault.git#v0.1.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["@techfides/tf-doc-vault"]
  }
}
```

`pnpm.onlyBuiltDependencies` is required — pnpm 10 otherwise refuses to run the `prepare` hook for git dependencies and `dist/` won't be built.

---

## Use cases

### 1. Technical documentation in a service repo (`tech-docs`)

Technical documentation that lives directly inside an existing backend repo and is served by the application itself at `/tech-docs` with HTTP Basic auth.

#### How it works

Running `init-tech-docs` does this:

1. **Copies the bundled `template-tech-docs/` scaffold** into a new `tech-docs/` directory inside your service repo. Files that already exist are skipped, so
   re-running the command is safe.
2. **Substitutes placeholders** throughout the copied files — `__SERVICE_ID__`, `__PROJECT__`, `__DATE__`, and optionally `__REPO__` — so generated frontmatter,
   titles, and edit links already reference your project from the start.
3. **Patches `package.json` and `.gitignore`** — adds `docs:dev`, `docs:build`, `docs:validate`, `docs:fix`, and other scripts (only those not already present),
   and appends the VitePress `dist/` and `cache/` directories to `.gitignore`.

After the command runs, the service repo contains a ready-to-use `tech-docs/docs/` VitePress site. Developers write Markdown, run `docs:dev` for a live preview,
and `docs:build` produces the `dist/` folder that the application serves at `/tech-docs`.

```bash
pnpm exec tf-doc-vault init-tech-docs \
  --service-id=TST \       # service identifier
  --project=testProject \  # project name
  --repo=myorg/myrepo      # optional — GitHub/GitLab repo for edit links
```

#### Options

| Option              | Default         | Description                                                     |
| ------------------- | --------------- | --------------------------------------------------------------- |
| `--service-id=<ID>` | _(required)_    | Service identifier, e.g. `TST`. Used in frontmatter and titles. |
| `--project=<name>`  | cwd folder name | Project name substituted into templates.                        |
| `--repo=<org/repo>` | _(none)_        | GitHub/GitLab repo path for edit links, e.g. `myorg/myrepo`.    |

#### Next steps

1. **Add VitePress peer dependencies** to `devDependencies` in the service repo's `package.json`:

   ```json
   "vitepress": "^1.6.4",
   "vitepress-plugin-mermaid": "^2.0.17",
   "mermaid": "^11.14.0"
   ```

   These must be installed directly in the project so the `vitepress` binary is available when running `docs:dev` and `docs:build`.

2. **Install and preview locally:**

   ```bash
   npm install
   npm run docs:dev   # http://localhost:5173/tech-docs/
   ```

3. **Add the `docs-build` stage to the Dockerfile** — see [`template-tech-docs/docs-build-stage.md`](template-tech-docs/docs-build-stage.md).

4. **Call `setupTechDocs()` in `main.ts`:**

   ```ts
   import { setupTechDocs } from "@techfides/tf-doc-vault/setup/nest";

   await setupTechDocs(app, {
     auth: { username: "docs", password: process.env.TECH_DOCS_PASSWORD ?? "" },
   });
   ```

   If `auth.password` is empty or `dist/` does not exist, `setupTechDocs` does nothing — the middleware is a no-op in production where the env var is unset.

5. **Set the `TECH_DOCS_PASSWORD` env variable** (dev/staging only, not prod).

6. **Build the docs and verify:**

   ```bash
   npm run docs:build
   npm run dev   # or however you start the application
   ```

   The docs will be available at `/tech-docs/` with HTTP Basic auth (**username**: `docs`, **password** from `TECH_DOCS_PASSWORD`).

---

### 2. Analytical documentation (`*_ana` repos)

Standalone documentation repositories for business analysis, functional specs, and technical design — the `*_ana` pattern. Suited for projects where the
documentation has its own lifecycle and deployment, and needs to be accessible outside the application itself (e.g. for stakeholders or external reviewers).

Each repo gets a complete VitePress site with versioned content, a multi-stage Docker image deployed to GCP Cloud Run via Terraform, a full GitLab CI/CD
pipeline (install → lint → build → deploy), and optional Basic auth.

#### How it works

1. `pnpm dlx` downloads the tooling from GitHub, builds `dist/` (via the `prepare` hook), and runs `tf-doc-vault create`.
2. The scaffolder copies `template/` to `./my_analysis/`, substituting placeholders (`__PROJECT__`, `__GCP_PROJECT__`, `__SERVER_TYPE__`,
   `__VITEPRESS_COMMON_DEP__`).
3. `git init` + first commit are run automatically (skip with `--no-git` when embedding into an existing repo).

```bash
pnpm dlx @techfides/tf-doc-vault create my_analysis \
  --gcp-project=tfsa-my-analysis \
  --server=nginx
```

#### Options

`tf-doc-vault create <project-name> [options]`:

| Option               | Default                                               | Description                                                                                                                                             |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--gcp-project=<id>` | `tfsa-<project>`                                      | GCP project ID (written to `terraform.tfvars`).                                                                                                         |
| `--server=<type>`    | `nginx`                                               | Runtime image: `nginx` (static, no auth) or `nginx-auth` (Nginx + Basic auth from `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`).                                 |
| `--source=<src>`     | `git`                                                 | `git` → `git+ssh://…/tf-doc-vault.git#<ref>` (production, pinned to tag). `file` → `file:<path>` (local package development next to the consumer repo). |
| `--ref=<git-ref>`    | `v<package version>`                                  | Tag/branch/SHA for `--source=git`.                                                                                                                      |
| `--git-url=<url>`    | `git+ssh://git@github.com/techfides/tf-doc-vault.git` | Override git URL for `--source=git`.                                                                                                                    |
| `--file-path=<path>` | relative path to the package                          | Override `file:` path for `--source=file`.                                                                                                              |
| `--no-git`           | _(false)_                                             | Skip `git init` + first commit. Use when embedding the docs inside an existing repo — all infrastructure is still generated.                            |

#### 2a. Dedicated repository

The standard setup — the analytical docs live in their own git repository and are deployed independently. The scaffolder runs `git init` and makes the first
commit automatically.

The GitLab repository **does not need to be created in advance** — GitLab
supports [push-to-create](https://docs.gitlab.com/topics/git/project/#create-a-project-using-git-push). Just add the remote and push:

```bash
cd my_analysis
pnpm install            # pulls peer deps + tf-doc-vault from git (prepare hook builds dist/)
pnpm docs:dev           # http://localhost:5173

git remote add origin git@gitlab.com:techfides/tf-analysis/my_analysis.git
git push -u origin master   # GitLab creates the project automatically
```

Prerequisite: at least `Developer` rights in `techfides/tf-analysis`. After the first push, set the CI/CD variables (`GCP_SA_KEY`, `GCP_PROJECT`, `GCP_REGION`,
`SERVICE_NAME`) in the newly created GitLab project — without them the `🐳 build:docs` job will fail.

Deployment: `terraform apply` in `infra/` provisions Cloud Run + Artifact Registry on first run. Subsequent deploys happen automatically via CI on every push to
`master`.

#### 2b. Embedded in an existing repo (`--no-git`)

When the analytical docs belong inside an existing service or project repo, add `--no-git`. The full structure — VitePress site, Dockerfile, CI, Terraform — is
still generated, but `git init` is skipped so the output is committed as part of the parent repo:

```bash
pnpm dlx @techfides/tf-doc-vault create ana_project \
  --gcp-project=ana_project \
  --server=nginx \
  --no-git

cd ana_project
pnpm install
pnpm docs:dev   # http://localhost:5173

cd ..
git add ana_project/
git commit -m "docs: add ana_project analytical documentation"
git push
```

The docs can still be deployed to Cloud Run independently using their own CI/CD pipeline.

#### CI/CD integration

GitLab only reads the root-level `.gitlab-ci.yml`, so the generated `ana_project/.gitlab-ci.yml` won't run automatically from the parent pipeline. Add a **child
pipeline trigger** to the parent repo's `.gitlab-ci.yml`:

```yaml
ana_project:docs:
  stage: build # any stage that already exists in the parent pipeline
  trigger:
    include: ana_project/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes:
        - ana_project/**
      when: on_success
    - when: never
```

Replace `ana_project` with the actual directory name. The child pipeline runs only when files under `ana_project/` change, inherits CI/CD variables from project
settings, and has isolated stages with no naming conflicts. `strategy: depend` makes the parent job reflect the child pipeline's pass/fail status.

---

### 3. Confluence migration

Existing Confluence spaces can be migrated into any of the above use cases without manual copy-pasting.

#### How it works

1. The command authenticates to the Confluence REST API using an Atlassian API token.
2. It fetches the entire page tree rooted at `--root-page-id`, recursively following child pages.
3. Each page is converted from Confluence's ADF (Atlassian Document Format) to Markdown and written as a `.md` file with correct frontmatter (`title`, `status`,
   `updated_at`). Attachments are downloaded alongside.
4. Inter-page links are rewritten to point to the generated `.md` files.

```bash
export CONFLUENCE_USER_EMAIL=you@email.com
export CONFLUENCE_API_TOKEN=<token>   # Atlassian API token from Settings → Security → API tokens

pnpm exec tf-doc-vault import-confluence \
  --site=myorg.atlassian.net \
  --root-page-id=<id> \
  --output=./ana_docs_folder/docs/v1
```

#### Options

| Option                | Default      | Description                                                                                     |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `--site=<host>`       | _(required)_ | Confluence hostname, e.g. `myorg.atlassian.net`.                                                |
| `--root-page-id=<id>` | _(required)_ | ID of the root Confluence page to import. Found in the page URL: `.../pages/**123456789**/...`. |
| `--output=<dir>`      | _(required)_ | Output directory for generated Markdown files.                                                  |
| `--space=<KEY>`       | _(none)_     | Confluence space key — informational only, not used during import.                              |

#### Next steps

After the import, clean up and validate before committing:

```bash
npm run docs:normalize   # canonical frontmatter field order
npm run docs:validate    # check frontmatter, links, images, markdown lint
```

Detailed guide: [`template-tech-docs/import-confluence.md`](template-tech-docs/import-confluence.md).

---

## Updating documentation

To edit an existing document, open the relevant `.md` file under `docs/` and make your changes.
Update the `updated_at` field in the frontmatter to today's date:

```yaml
---
title: My page
status: published
updated_at: 2026-05-12
---
```

**Preview locally** while editing:

```bash
npm run docs:dev   # http://localhost:5173/tech-docs/
```

VitePress reloads automatically on file save — no restart needed.

**Before committing**, optionally validate and auto-fix common issues:

```bash
npm run docs:validate   # check frontmatter, links, images, markdown lint
npm run docs:fix        # auto-fix line endings, normalize frontmatter, run linter
```

**Publish changes** by committing and pushing to git:

```bash
git add tech-docs/
git commit -m "docs: update <page name>"
git push
```

The CI pipeline rebuilds the docs image and deploys the updated documentation automatically

## Auth for `nginx-auth`

The `nginx-auth` runtime protects the application with HTTP Basic auth. Username and password are set **at build time** via Docker build-args`BASIC_AUTH_USER` /
`BASIC_AUTH_PASS` — the `Dockerfile` generates `/etc/nginx/.htpasswd` from them. If they are empty, the build fails fast.

The values are stored directly in the repo, in the top-level `variables:` block of `.gitlab-ci.yml`:

```yaml
variables:
  PNPM_STORE: "$CI_PROJECT_DIR/.pnpm-store"
  BASIC_AUTH_USER: "anadocs"
  BASIC_AUTH_PASS: "anadocsTF"
```

This is not a secret — anyone with repo access has application access. The `🐳 build:docs` job conditionally passes them to `docker build` only when non-empty,
so projects without auth (runtime `nginx`) just leave them blank.

Local build:

```bash
docker build --build-arg SERVER_TYPE=nginx-auth \
             --build-arg BASIC_AUTH_USER=anadocs \
             --build-arg BASIC_AUTH_PASS=anadocsTF \
             -t docs-web .
```

Password rotation = update `variables:` + commit + redeploy (the htpasswd hash is baked into the image layer).

### Switching an existing project from `nginx` to `nginx-auth`

`__SERVER_TYPE__` is baked into two places during scaffolding — switching requires updating both:

1. **`.gitlab-ci.yml`** — in `BUILD_ARGS` (job `🐳 build:docs`) change `SERVER_TYPE=nginx` to `SERVER_TYPE=nginx-auth`.
2. **`Dockerfile`** — `ARG SERVER_TYPE=nginx` → `ARG SERVER_TYPE=nginx-auth` (default for local builds without a build-arg; CI always overrides it).
3. **`.gitlab-ci.yml`** `variables:` — fill in `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` (otherwise the build fails on the fail-fast check in `Dockerfile`).
4. Commit + push → CI builds a new image, Cloud Run rolls out a new revision.

Back to `nginx` = the same steps in reverse + clear both `BASIC_AUTH_*` values.

## Local package development

For iterating on `tf-doc-vault` itself:

```bash
# 1. in the package — once after cloning
cd tf-doc-vault
pnpm install                  # deps + "prepare" hook builds dist/
pnpm dev                      # tsc --watch + auto-copy static assets (.vue/.css/.json/.ico)

# 2. in an adjacent application repo scaffolded with --dev
cd ../<something>_ana
pnpm install                  # pulls peer deps and symlinks file:../tf-doc-vault
pnpm docs:dev                 # sees changes from dist/ via Vite HMR
```

An application repo with `--dev` declares the dependency via `file:`:

```json
"dependencies": {"@techfides/tf-doc-vault": "file:../tf-doc-vault"}
```

Prerequisite for `file:` install: both directories must be siblings (relative path `../tf-doc-vault`). If the package is elsewhere, `--file-path=/abs/path`
during scaffolding overrides it.

## Syncing the template to an existing repo

When the package adds or fixes something in `template/` (Dockerfile, CI, configs, Terraform), consumer repos don't receive the update automatically — those
files belong to them. To inspect or apply the diff:

```bash
pnpm sync           # shows a unified diff of all drifted files
pnpm sync:apply     # overwrites drifted files with the template (placeholders are rendered from the current repo)
```

User content (`docs/`, `package.json`, README, CLAUDE, custom.css, terraform.tfvars) is excluded from overwriting.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
