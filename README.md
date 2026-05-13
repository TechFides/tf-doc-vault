# Free from TechFides ❤️

---

# @techfides/tf-doc-vault

[![npm version](https://img.shields.io/npm/v/@techfides/tf-doc-vault.svg)](https://www.npmjs.com/package/@techfides/tf-doc-vault)
[![npm downloads](https://img.shields.io/npm/dm/@techfides/tf-doc-vault.svg)](https://www.npmjs.com/package/@techfides/tf-doc-vault)
[![License: MIT](https://img.shields.io/npm/l/@techfides/tf-doc-vault.svg)](./LICENSE)
[![Node version](https://img.shields.io/node/v/@techfides/tf-doc-vault.svg)](https://www.npmjs.com/package/@techfides/tf-doc-vault)
[![CI](https://github.com/TechFides/tf-doc-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/TechFides/tf-doc-vault/actions/workflows/ci.yml)

Shared VitePress tooling for TFSA documentation — analytical `*_ana` repos and technical documentation living directly in service repos.

Goal: spin up a new analysis repo in under 5 minutes. Solve once — share across all `*_ana` repos.

## What the package includes

- **`config`** — factory `makeConfig()` builds a complete VitePress config (locales, nav, sidebar, i18n, mermaid, optional analytics + editLink).
- **`theme`** — `createTheme()` returns a VitePress theme with shared components: DocMeta, ImageLightbox, PrintLayout, VersionSwitcher, optional WidthToggle.
- **`sidebar`** — `nav` and `sidebar` generator from the `docs/<version>/<section>/<group>/` directory structure.
- **`scripts`** — `build-print-page`, `export-pdf`, `validate-docs`, `normalize-docs`, `ensure-lf`, `fix`, `sync-template`. Invoked via the `tf-doc-vault` CLI.
- **`setup/express`** — `createTechDocsHandler()`: Express middleware for serving `tech-docs/` with Basic auth.
- **`setup/nest`** — `setupTechDocs()`: NestJS wrapper for mounting tech-docs into a running application.
- **`bin/tf-doc-vault`** — CLI dispatcher:
  `create | init-tech-docs | import-confluence | print | export-pdf | pdf | validate | normalize | ensure-lf | fix | sync`.
- **`bin/create-ana`** — alias for `tf-doc-vault create` (direct scaffolder invocation).
- **`configs`** — `eslint.config.js`, `prettier.json`, `tsconfig.base.json` to extend.
- **`infra/terraform`** — reusable module for Cloud Run + Artifact Registry + IAM.
- **`docker`** — multi-stage Dockerfile with `ARG SERVER_TYPE=nginx|nginx-auth` + nginx configs.
- **`template`** — skeleton for a new `*_ana` repo.
aaaa
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

```jsonssadasdasdasd
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

## Technical documentation in a service repo (tech-docs)

The package supports the **tech-docs** use case: VitePress documentation lives directly in the service repo and the NestJS application serves it at `/tech-docs`
with Basic auth.

### Initialisation

```bash
# In the service repo root
pnpm exec tf-doc-vault init-tech-docs \
  --service-id=TST \        # service identifier
  --project=testProject \      # project name
  --repo=myorg/myrepo       # optional — GitHub repo for edit links
```

#### tf-doc-vault init-tech-docs [options]:

| Option              | Default         | Description                                                     |
| ------------------- | --------------- | --------------------------------------------------------------- |
| `--service-id=<ID>` | _(required)_    | Service identifier, e.g. `TST`. Used in frontmatter and titles. |
| `--project=<name>`  | cwd folder name | Project name substituted into templates.                        |
| `--repo=<org/repo>` | _(none)_        | GitHub/GitLab repo path for edit links, e.g. `myorg/myrepo`.    |

### Dependencies

Add to `devDependencies` in the service repo's `package.json`:

```json
"vitepress": "^1.6.4",
"vitepress-plugin-mermaid": "^2.0.17",
"mermaid": "^11.14.0"
```

These packages are peer dependencies of `@techfides/tf-doc-vault` — they must be present directly in the project so the `vitepress` binary is available when
running `docs:dev` and `docs:build`.

### Usage

The command idempotently creates `tech-docs/`, adds `package.json` scripts and `.gitignore` entries. After initialisation, follow these steps:

1. **Install dependencies and start a local preview:**

   ```bash
   npm install
   npm run docs:dev
   ```

2. **Add the `docs-build` stage to the Dockerfile** — see [`template-tech-docs/docs-build-stage.md`](template-tech-docs/docs-build-stage.md).

3. **Call `setupTechDocs()` in `main.ts`:**

   ```ts
   import { setupTechDocs } from "@techfides/tf-doc-vault/setup/nest";

   await setupTechDocs("tech-docs/docs", app, {
     auth: { username: "docs", password: process.env.TECH_DOCS_PASSWORD },
   });
   ```

4. **Set the `TECH_DOCS_PASSWORD` env variable** (dev/staging only, not prod).

5. **Build the docs and verify the deployment:**

   ```bash
   npm run docs:build
   npm run dev   # or however you start the application
   ```

   The docs will be available at `/tech-docs/` with HTTP Basic auth (**username**: `docs`, **password** from `TECH_DOCS_PASSWORD`).

### NestJS wiring (`main.ts`)

```ts
import { setupTechDocs } from "@techfides/tf-doc-vault/setup/nest";

await setupTechDocs(app, {
  auth: { username: "docs", password: process.env.TECH_DOCS_PASSWORD ?? "" },
});
```

If `auth.password` is empty or `dist/` does not exist, `setupTechDocs` does nothing.

### Dockerfile

Add the `docs-build` stage — see [`template-tech-docs/docs-build-stage.md`](template-tech-docs/docs-build-stage.md).

## Analytical documentation

Documentation has its own dedicated infrastructure and contains technical and business analysis and functional requirements.

### Initialisation

```bash
pnpm dlx @techfides/tf-doc-vault create my_analysis \
  --gcp-project=tfsa-my-analysis \
  --server=nginx
```

What happens:

1. `pnpm dlx` downloads the tooling from GitHub, builds `dist/` (via the `prepare` hook), and runs `tf-doc-vault create`.
2. The scaffolder copies `template/` to `./my_analysis/`, substituting placeholders (`__PROJECT__`, `__GCP_PROJECT__`, `__SERVER_TYPE__`,
   `__VITEPRESS_COMMON_DEP__`).
3. `git init` + first commit (disable with `--no-git`).

Then:

```bash
cd my_analysis
pnpm install            # pulls peer deps + tf-doc-vault from git (prepare hook builds dist/)
pnpm docs:dev           # http://localhost:5173
```

Deployment via `terraform apply` in `infra/` + push to GitLab (CI builds the image and deploys to Cloud Run).

#### tf-doc-vault create [options]

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

### 1. Push to a new GitLab repository

If the analytical documentation should have own git repo call the create command without `--no-git` option. This will create a git repository with first initial
commit.

```bash
pnpm dlx @techfides/tf-doc-vault create ana_project \
  --gcp-project=ana_project \
  --server=nginx
```

The GitLab repository **does not need to be created in advance** — we
use [push-to-create](https://docs.gitlab.com/topics/git/project/#create-a-project-using-git-push). Just add the remote and push; GitLab will automatically
create the project in the target group (`techfides/tf-analysis`):

```bash
cd my_analysis
git remote add origin git@gitlab.com:techfides/tf-analysis/my_analysis.git
git push -u origin master
```

Prerequisite: you need at least `Developer` rights in `techfides/tf-analysis` (push-to-create requires permission to create projects in the group). After the
first push, set the CI/CD variables (`GCP_SA_KEY`, `GCP_PROJECT`, `GCP_REGION`, `SERVICE_NAME`) in the newly created project — without them the `🐳 build:docs`
job will fail.

### 2. Embedded analytical docs (no standalone repo)

If the analytical documentation should live inside an existing service or project repo rather than having its own git repository, add `--no-git`:

```bash
pnpm dlx @techfides/tf-doc-vault create ana_project \
  --gcp-project=ana_project \
  --server=nginx \
  --no-git
```

This creates the `ana_project/` directory with the full analytical docs structure and all infrastructure files (Dockerfile, CI, Terraform, nginx configs) — the
only difference is that no `git init` is run. The docs are committed as part of the parent repo and can still be deployed to Cloud Run independently using their
own CI/CD pipeline.

After scaffolding:

```bash
cd ana_project
pnpm install
pnpm docs:dev          # http://localhost:5173

# commit as part of the parent repo
cd ..
git add ana_project/
git commit -m "docs: add ana_project analytical documentation"
git push
```

#### CI/CD integration

GitLab only reads the root-level `.gitlab-ci.yml`, so the generated `ana_project/.gitlab-ci.yml` won't run automatically. Add a **child pipeline trigger** to the parent repo's `.gitlab-ci.yml`:

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

Replace `ana_project` with the actual directory name. The child pipeline:

- Runs only when files under `ana_project/` change (MR or default branch push).
- Inherits CI/CD variables from Settings → CI/CD → Variables (`GCP_SA_KEY`, `GCP_PROJECT`, `GCP_REGION`, `SERVICE_NAME`).
- Has its own isolated stages and jobs — no naming conflicts with the parent pipeline.

`strategy: depend` makes the parent job wait for the child pipeline to finish and reflects its pass/fail status.

## Confluence migration

Tool to migrate Confluence pages to Markdown format.

```bash
export CONFLUENCE_USER_EMAIL=you@email.com
export CONFLUENCE_API_TOKEN=<token>

pnpm exec tf-doc-vault import-confluence \
  --site=myorg.atlassian.net \
  --root-page-id=<id> \
  --output=./ana_docs_folder/docs/v1
```

#### tf-doc-vault import-confluence [options]

| Option                | Default      | Description                                                                                     |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `--site=<host>`       | _(required)_ | Confluence hostname, e.g. `myorg.atlassian.net`.                                                |
| `--root-page-id=<id>` | _(required)_ | ID of the root Confluence page to import. Found in the page URL: `.../pages/**123456789**/...`. |
| `--output=<dir>`      | _(required)_ | Output directory for generated Markdown files.                                                  |
| `--space=<KEY>`       | _(none)_     | Confluence space key — informational only, not used during import.                              |

Required environment variables: `CONFLUENCE_USER_EMAIL`, `CONFLUENCE_API_TOKEN` (Atlassian API token from Settings → Security → API tokens).

Detailed guide: [`template-tech-docs/import-confluence.md`](template-tech-docs/import-confluence.md).

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
```dasd

An application repo with `--dev` declares the dependency via `file:`:

```json
"dependencies": {"@techfides/tf-doc-vault": "file:../tf-doc-vault"}
```
asdasd
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
