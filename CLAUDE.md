# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@techfides/tf-doc-vault** is a shared NPM package that bundles VitePress tooling and templates for TFSA (Techfides Scalable Architecture) analysis documentation repositories. It dramatically accelerates the setup of new documentation sites by providing:

1. **Config factory** (`makeConfig()`) — generates complete VitePress configuration with built-in i18n, analytics, and edit links
2. **Theme module** (`createTheme()`) — shared Vue 3 components (DocMeta, ImageLightbox, PrintLayout, VersionSwitcher, WidthToggle)
3. **Sidebar generator** — auto-discovers `docs/<version>/<section>/<group>/` structure and generates nav/sidebar
4. **CLI tooling** (`tf-doc-vault`) — document validation, PDF export, template sync, frontmatter normalization, linting
5. **Scaffolder** (`create-ana`) — bootstraps new `*_ana` repos from template with placeholder substitution
6. **Docker/Terraform infrastructure** — multi-stage Dockerfile (nginx/nginx-auth) and reusable GCP Cloud Run + Artifact Registry module
7. **Template** — boilerplate repo structure, CI/CD pipeline, configs for consumer projects

Target users: **SW analysts** creating specification documents in Czech, not production code developers.

## Repository Structure

```
.
├── src/
│   ├── config/
│   │   ├── index.ts              # exports makeConfig + types
│   │   ├── makeConfig.ts          # VitePress config factory (192 lines)
│   │   └── strings.cs.json        # Czech localization strings
│   ├── theme/
│   │   ├── index.ts               # createTheme() factory + component exports
│   │   ├── components/            # Vue 3 shared components
│   │   │   ├── DocMeta.vue        # frontmatter + last-updated header
│   │   │   ├── ImageLightbox.vue  # modal image viewer
│   │   │   ├── PrintLayout.vue    # A4 print-friendly wrapper
│   │   │   ├── VersionSwitcher.vue # docs version dropdown
│   │   │   └── WidthToggle.vue    # content width toggle
│   │   ├── composables/           # Vue composables
│   │   │   └── useScrollSpy.ts    # anchor detection for ToC highlighting
│   │   ├── styles/                # CSS (print.css, base.css)
│   │   └── assets/                # favicon.ico
│   ├── sidebar/
│   │   └── index.ts               # generateNav/generateSidebar/getVersions (209 lines)
│   ├── scripts/                   # CLI subcommand implementations
│   │   ├── validate-docs.ts       # frontmatter, links, images, markdown lint
│   │   ├── normalize-docs.ts      # canonical frontmatter ordering
│   │   ├── build-print-page.ts    # concatenates docs into print.md
│   │   ├── export-pdf.ts          # uses Playwright to render /print → PDF
│   │   ├── ensure-lf.ts           # CRLF → LF conversion
│   │   ├── fix.ts                 # full polish pipeline (LF, normalize, format, lint, typecheck, validate)
│   │   └── sync-template.ts       # diffs infra/CI files against template (not user content)
│   └── index.ts                   # main export barrel
│
├── bin/
│   ├── tf-doc-vault.mjs               # CLI dispatcher (print, export-pdf, validate, etc.)
│   └── create-ana.mjs             # scaffolder with placeholder substitution
│
├── configs/
│   ├── eslint.config.js           # shared TypeScript + Prettier config
│   ├── prettier.json              # code formatting rules
│   └── tsconfig.base.json         # base TypeScript config (extends for consumers)
│
├── docker/
│   ├── Dockerfile                 # multi-stage: builder → nginx/nginx-auth runtime
│   ├── nginx.conf                 # static file serving
│   └── nginx-auth.conf            # with htpasswd authentication
│
├── infra/terraform/
│   ├── main.tf                    # GCP Cloud Run + Artifact Registry + IAM
│   ├── variables.tf               # project_id, region, service_name, cpu, memory, auto-scaling
│   └── outputs.tf                 # tfstate bucket, service account key
│
├── template/                      # scaffold boilerplate for new consumer repos
│   ├── package.json               # with placeholder replacements
│   ├── .gitlab-ci.yml             # multi-stage CI: install → lint → build → deploy
│   ├── Dockerfile                 # mirrors docker/ but scaffolded with __SERVER_TYPE__
│   ├── eslint.config.js           # extends @techfides/tf-doc-vault/eslint
│   ├── tsconfig.json              # extends @techfides/tf-doc-vault/tsconfig
│   ├── docs/
│   │   ├── v1/                    # version folder
│   │   │   ├── byznys-specifikace/index.md
│   │   │   ├── funkcni-specifikace/index.md
│   │   │   └── technicka-specifikace/index.md
│   │   └── .vitepress/
│   │       ├── config.ts          # consumer calls makeConfig() from package
│   │       └── theme/index.ts     # consumer calls createTheme() from package
│   ├── infra/
│   │   ├── main.tf
│   │   ├── terraform.tfvars.example
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── CLAUDE.md                  # template version (See "Consumer CLAUDE.md" below)
│   └── README.md
│
├── scripts/
│   └── build.mjs                  # tsc + copy static assets (.vue/.css/.json/.ico)
│
├── package.json                   # v0.1.11; exports config, sidebar, theme, scripts, bin, template
├── tsconfig.json                  # src → dist, strict mode, ES2022
├── pnpm-lock.yaml                 # locked deps (vitepress, vue, mermaid, playwright, etc.)
└── README.md                       # user-facing: usage, setup, scaffolder options, changelog
```

## Key Architectural Decisions

### Factory Pattern for Config & Theme

Instead of exporting static configs, the package exports **factory functions** that consumer repos call at build time:

```typescript
// In consumer repo: docs/.vitepress/config.ts
import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "lapa",
  analytics: { provider: "umami", websiteId: "...", domain: "..." },
  editLink: { repo: "techfides/tf-analysis/lapa_ana", branch: "master" },
});
```

This allows:
- Central version control of nav/sidebar logic
- Per-project customization via typed options
- Embedded favicon as data URL (no file copying)
- Dynamic version detection from `docs/v*/` directory structure

### Template Sync Without Overwriting User Content

The `tf-doc-vault sync` command diffs "infrastructure" files (Dockerfile, CI, configs, Terraform) against the bundled `template/`, but **never touches** `docs/`, `package.json`, README, CLAUDE, or user CSS. This lets consumer repos upgrade tooling independently.

Placeholders like `__PROJECT__`, `__GCP_PROJECT__`, `__SERVER_TYPE__` are **auto-detected** from the consumer repo (directory name, package.json, terraform.tfvars) during sync so values aren't lost on re-apply.

### Sidebar Auto-Discovery

`generateSidebar()` walks `docs/<version>/<section>/<group>/` and:
1. Extracts `title` from YAML frontmatter (falls back to filename)
2. Sorts `.md` files alphabetically, `index.md` first
3. Extracts `## H2` and `### H3` headings to build table-of-contents anchors
4. Returns VitePress DefaultTheme sidebar structure

This is **read-only**—no hidden `.nav` files, no extra config needed.

### Multi-Runtime Docker Strategy

The Dockerfile uses a **final stage selector** arg:

```dockerfile
ARG SERVER_TYPE=nginx
FROM runner-${SERVER_TYPE} AS final
```

Allows switching between:
- `nginx` — plain static serving (fast, no auth)
- `nginx-auth` — Basic auth with htpasswd (credentials baked into image at build time)

Consumer repos set this in `.gitlab-ci.yml` `BUILD_ARGS` (default `nginx`). No `compose` file needed; single image handles both cases.

### Build Pipeline: prepare Hook + Lazy Asset Copy

The build process (`scripts/build.mjs`):
1. Runs `tsc` to compile TypeScript → JavaScript
2. **Copy-only** mode for non-TS assets (`.vue`, `.css`, `.json`, `.ico`) — they're not compiled
3. Ambient `.d.ts` type augmentations (`vue.d.ts`, `css.d.ts`) are copied as-is

Why: Vue SFC and CSS imports must resolve at runtime; TypeScript's output module system (`NodeNext`) needs these files present. The `--watch` mode auto-copies changes.

The **prepare hook** (runs on `pnpm install`) ensures consumer repos always get a built `dist/` after fetch.

## Build & Development Commands

### Build the Package

```bash
pnpm build                  # one-off: tsc + copy assets → dist/
pnpm dev                    # watch mode: tsc --watch + fs.watch for assets
pnpm prepare                # runs during `pnpm install` (git deps)
```

### Lint & Type-Check

```bash
pnpm typecheck              # tsc --noEmit (package root)
pnpm lint                   # eslint src bin (TypeScript only)
pnpm format                 # prettier --write .
pnpm format:check           # prettier --check . (CI mode)
```

### Scripts in Package

```bash
# None — tf-doc-vault CLI is only run by consumer repos.
# Developers test the package locally via:
#   1. pnpm dev (watch build)
#   2. cd template/  (or scaffold a test repo)
#   3. pnpm install (picks up file: dependency)
#   4. pnpm docs:dev (VitePress dev server)
```

### Testing Consumer Repos Locally

For iterating on the package before publishing:

```bash
# In tf-doc-vault repo:
pnpm install                # deps + "prepare" hook builds dist/
pnpm dev                    # tsc --watch + auto-copy assets

# In a consumer repo next to it (scaffolded with --dev):
cd ../some_ana
pnpm install                # natáhne peer deps, slinkuje file:../tf-doc-vault
pnpm docs:dev               # vidí changes from dist/ via Vite HMR
```

The scaffolder's `--source=file` option (or `--dev` shortcut) creates a `file:` dependency:
```json
"@techfides/tf-doc-vault": "file:../tf-doc-vault"
```

## Consumer Repo Workflow (Template)

Template consumer repos (e.g., `lapa_ana`) use this pattern:

```bash
pnpm install                # deps + @techfides/tf-doc-vault from git (prepare hook)
pnpm docs:dev               # http://localhost:5173
pnpm docs:build             # production build
pnpm docs:pdf               # print → vitepress build → export PDF
pnpm docs:validate          # frontmatter, links, images, markdown lint
pnpm docs:normalize         # canonical frontmatter field order
pnpm fix                    # LF, normalize, format, lint --fix, typecheck, validate
pnpm sync                   # show diff of infrastructure files vs template
pnpm sync:apply             # overwrite drifted infrastructure files
```

**CI/CD** (`.gitlab-ci.yml`):
- `📦 install` — pnpm install (git+ssh → HTTPS token rewrite in Dockerfile)
- `🧹 lint:typecheck` — tsc
- `🧹 lint:eslint` — eslint + prettier --check
- `🧹 lint:docs` — tf-doc-vault validate
- `🐳 build:docs` — docker build (multi-stage, passes BASIC_AUTH_USER/PASS as build-args)
- `🚀 deploy:docs` — gcloud run deploy (or terraform apply + gcloud run update)

## Code Organization Patterns

### Frontmatter in Markdown

All `.md` files must have:

```yaml
---
title: Název stránky
status: published | draft | review | archived
updated_at: 2026-04-27
---
```

The `validate-docs.ts` script checks:
- Required fields present
- Valid status values
- Unique slugs per version
- No broken internal links
- No missing image files

### Sidebar Structure (Consumer Repos)

```
docs/
  v1/                    ← version (auto-detected)
    <sekce>/             ← top-level nav item
      <skupina>/         ← left sidebar group
        index.md         ← group title (not displayed as page)
        soubor.md        ← page
  v2/                    ← another version
```

Each section and group can have nested `.md` files; VitePress sidebar is generated dynamically.

### Export Paths in package.json

The package exports multiple entry points for consumers:

```json
"exports": {
  ".": "./dist/index.js",              // main export (factories + types)
  "./config": "./dist/config/index.js",
  "./sidebar": "./dist/sidebar/index.js",
  "./theme": "./dist/theme/index.js",
  "./theme/styles/print.css": "...",
  "./scripts/*": "./dist/scripts/*.js",
  "./eslint": "./configs/eslint.config.js",
  "./prettier": "./configs/prettier.json",
  "./tsconfig": "./configs/tsconfig.base.json",
  "./template": "./template",
  "./infra/terraform": "./infra/terraform",
  "./docker/Dockerfile": "./docker/Dockerfile"
}
```

Consumers typically only use the first few; the rest are for reference or advanced cases.

## Important Implementation Details

### Playwright in export-pdf.ts

The PDF export uses Playwright (headless Chrome) to render the `/print` page:
1. `build-print-page.ts` concatenates all `.md` files in sidebar order into `docs/print.md`
2. VitePress builds the site (includes `/print` route)
3. `export-pdf.ts` launches Playwright, navigates to `http://localhost:5173/print`, waits for fonts, renders to PDF

This requires the site to be built + running; it's not a static tool.

### Markdown Lint Configuration

The `validate-docs.ts` script uses `markdownlint` with a custom rule set:
- Enforces consistent heading hierarchy
- Checks for trailing spaces, consistent indentation
- **MD024 disabled** (v0.1.10) — allows duplicate heading text

Rules are hardcoded in the script, not in a `.markdownlintrc` (to keep consumer repos minimal).

### Template Placeholder Detection

When scaffolding or syncing, the package auto-detects:
- `__PROJECT__` — folder name (e.g., `lapa_ana`)
- `__PROJECT_DASHED__` — project with underscores → dashes (e.g., `lapa-ana`)
- `__GCP_PROJECT__` — read from `infra/terraform.tfvars` if present
- `__SERVER_TYPE__` — read from `.gitlab-ci.yml` `BUILD_ARGS` if present
- `__BASIC_AUTH_USER__` / `__BASIC_AUTH_PASS__` — read from `.gitlab-ci.yml` `variables:` if present
- `__VITEPRESS_COMMON_DEP__` — generated from `--ref` (or current package version)

This allows `pnpm sync --apply` to update infrastructure files without losing existing values.

## Constraints

- Distribution is via git+ssh to GitLab — no npm publish
- All UI strings and documentation are in Czech
- `strict: true`, `noUncheckedIndexedAccess` TypeScript — explicit return types required
- VitePress 1.x peer dep pinned to `^1.6.4`
- pnpm only (corepack); consumer repos need `prepare` hook + `onlyBuiltDependencies` in `package.json`

## Testing Scaffolder Changes

```bash
pnpm build
node bin/create-ana.mjs test_repo --dev --gcp-project=tfsa-test --server=nginx
cd test_repo && pnpm install && pnpm docs:dev
```
