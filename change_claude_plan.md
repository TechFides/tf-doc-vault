# Plan: Fork `@techfides/ana-docs` → `@techfides/tf-doc-vault` v0.1.0

## Context

`@techfides/ana-docs` (v0.1.11, private GitLab, UNLICENSED) is forked to GitHub as
`@techfides/tf-doc-vault` and published publicly on npmjs.com. A second use-case is added:
**tech-docs** — VitePress documentation living directly in a service repo, served by a NestJS
app on `/tech-docs` with Basic auth. The original analytical use-case (scaffolder `create-ana`,
Cloud Run Terraform, `template/docs/`) stays unchanged.

---

## Dependency order

```
Step 1 (package rename)
  ├── Step 2 (version dropdown)    ← isolated config change
  ├── Step 3 (--root flag)         ← depends on reading fix.ts / validate / normalize
  ├── Step 4 (setup middleware)    ← new src/setup/ subtree
  ├── Step 5 (template/tech-docs/) ← new template files
  │     └── Step 6 (init-tech-docs) ← dispatches into Step 5 templates
  ├── Step 7 (docker docs MD)      ← documentation only
  └── Step 8 (import-confluence)   ← new script, complex
Step 9 (README update)             ← last, documents everything above
```

---

## Step 1 — Package rename

### `package.json`
- `"name"`: `"@techfides/ana-docs"` → `"@techfides/tf-doc-vault"`
- `"version"`: `"0.1.11"` → `"0.1.0"`
- `"license"`: `"UNLICENSED"` → `"MIT"`
- `"bin"`: `"ana-docs"` key → `"tf-doc-vault"`, value `./bin/tf-doc-vault.mjs`
- Add `"publishConfig": { "access": "public" }`
- Add to `"devDependencies"`: `"@types/express": "^4"` (for TypeScript compilation of setup modules; express itself is peerDep only)
- Add to `"peerDependencies"`: `"express": "^4 || ^5"`, `"@nestjs/common": "^10 || ^11"`
- Add to `"peerDependenciesMeta"`: both marked `{ "optional": true }`
- Add `"./setup/express"` and `"./setup/nest"` export entries
- `"files"` array: add `"LICENSE"`, `"CONTRIBUTING.md"`, `"SECURITY.md"`

### Files to rename/update
| File | Change |
|------|--------|
| `bin/ana-docs.mjs` → `bin/tf-doc-vault.mjs` | Rename; update usage string; update git URL default to GitHub; update commit message in `runCreateAna` |
| `src/config/makeConfig.ts:185` | `noExternal: ["@techfides/ana-docs"]` → `["@techfides/tf-doc-vault"]` |
| `template/docs/.vitepress/config.ts:1` | import from `"@techfides/tf-doc-vault/config"` |
| `template/docs/.vitepress/theme/index.ts:1` | import from `"@techfides/tf-doc-vault/theme"` |
| `template/package.json` | `@techfides/ana-docs` dep → `@techfides/tf-doc-vault`; `onlyBuiltDependencies` key; all `ana-docs` commands in scripts → `tf-doc-vault`; `fix` script body (calls `ana-docs fix`) |

### New files
- `.github/workflows/publish.yml` — triggers on `v*` tags, runs `pnpm install --frozen-lockfile && pnpm build && npm publish --access public` with `NODE_AUTH_TOKEN`
- `LICENSE` — MIT, year 2025, TechFides
- `CONTRIBUTING.md` — brief (pnpm, conventional commits, PR welcome)
- `SECURITY.md` — contact security@techfides.cz

---

## Step 2 — Hide version dropdown when only one version exists

**File:** `src/config/makeConfig.ts`

Two independent changes:

**`localeFor()` (line 149):**
```ts
// before
nav: [...generateNav(docsRoot, v), versionDropdown(v)],
// after
nav: versions.length > 1
  ? [...generateNav(docsRoot, v), versionDropdown(v)]
  : generateNav(docsRoot, v),
```

**`baseConfig.themeConfig.nav` (lines 166–170):**
```ts
// before
nav: [{ text: "Verze", activeMatch: "^/(v\\d+)/", items: versions.map(...) }],
// after
nav: versions.length > 1
  ? [{ text: "Verze", activeMatch: "^/(v\\d+)/", items: versions.map(...) }]
  : [],
```

---

## Step 3 — `--root=<dir>` flag for scripts

### `src/scripts/validate-docs.ts`
`DOCS_ROOT` is a module-level constant (line 17); `PUBLIC_ROOT` derives from it (line 18);
`slugOf()` (line 63) closes over `DOCS_ROOT`. All three must be dynamic.

Change: move execution into a `main()` function, parse `--root` before defining `DOCS_ROOT`:
```ts
const rootArg = process.argv.slice(2).find(a => a.startsWith('--root='))?.split('=')[1];
const DOCS_ROOT = path.resolve(process.cwd(), rootArg ?? 'docs');
const PUBLIC_ROOT = path.resolve(DOCS_ROOT, 'public');
// slugOf already uses DOCS_ROOT from same scope, no further change needed
```
Lines 200–201 (file scan) and 203–210 (checks) are already at top level — they just need the
updated constant.

### `src/scripts/normalize-docs.ts`
Same pattern — module-level `DOCS_ROOT` (line 13). Same fix:
```ts
const rootArg = process.argv.slice(2).find(a => a.startsWith('--root='))?.split('=')[1];
const DOCS_ROOT = path.resolve(process.cwd(), rootArg ?? 'docs');
```

### `src/scripts/fix.ts`
Two sub-changes:
1. **Binary rename** — lines 18–26 reference `"ana-docs"` as `command`. Change all to `"tf-doc-vault"`.
2. **`--root` propagation** — detect `--root=<dir>` from `process.argv`, append to `args` of the
   `Normalize` and `Validate` tasks:
```ts
const rootFlag = process.argv.slice(2).find(a => a.startsWith('--root='));
// in tasks array:
{ name: "Normalize", command: "tf-doc-vault", args: ["normalize", ...(rootFlag ? [rootFlag] : [])] },
{ name: "Validate",  command: "tf-doc-vault", args: ["validate",  ...(rootFlag ? [rootFlag] : [])] },
```
`ensure-lf` scans the entire CWD — not `--root` scoped, intentional.

---

## Step 4 — Express / NestJS setup middleware

### `src/setup/express.ts` (new file)

```ts
export interface SetupTechDocsOptions {
  distDir?: string;
  basePath?: string;
  auth?: { username?: string; password: string; realm?: string };
  logger?: { info(msg: string): void; warn(msg: string): void };
}
```

`createTechDocsHandler(opts)`:
- Returns `null` if `!opts.auth?.password` (no auth configured = feature disabled)
- Returns `null` if resolved `distDir` does not exist on disk
- Otherwise: builds an Express Router with:
    1. Basic-auth middleware using `timingSafeEqual` from `node:crypto`
    2. `express.static(distDir)` for resolved assets
    3. SPA fallback: serve `index.html` for unmatched GET requests

**Import strategy**: use a dynamic import for `express` so the file compiles without express
being a hard dependency:
```ts
const { default: express, Router } = await import('express');
```
This means `createTechDocsHandler` becomes `async`. The `null`-path shortcuts (no auth / no
dist) remain synchronous checks before the import.

### `src/setup/nest.ts` (new file)

```ts
export async function setupTechDocs(app: INestApplication, opts?: SetupTechDocsOptions): Promise<void>;
export async function setupTechDocs(basePath: string, app: INestApplication, opts?: SetupTechDocsOptions): Promise<void>;
```

Implementation: detect overload by typeof first arg, resolve `basePath` (default `"/tech-docs"`),
call `createTechDocsHandler()`, if non-null: `app.getHttpAdapter().use(basePath, handler)`.

Import `INestApplication` from `@nestjs/common` — available as devDep.

### `src/index.ts`
Add:
```ts
export { setupTechDocs } from './setup/nest.js';
export type { SetupTechDocsOptions } from './setup/express.js';
```

### `package.json` exports (add two entries):
```json
"./setup/express": { "types": "./dist/setup/express.d.ts", "default": "./dist/setup/express.js" },
"./setup/nest":    { "types": "./dist/setup/nest.d.ts",    "default": "./dist/setup/nest.js"    }
```

---

## Step 5 — `template/tech-docs/` scaffolding template

Three new files under `template/tech-docs/`:

**`template/tech-docs/.vitepress/config.ts`**
```ts
import { makeConfig } from "@techfides/tf-doc-vault/config";
export default makeConfig({
  configDir: import.meta.dirname,
  project: "__PROJECT__",
  // editLink: { repo: "__REPO__", branch: "main", host: "https://github.com" },
});
```

**`template/tech-docs/v1/index.md`**
```md
---
title: Technická dokumentace — __SERVICE_ID__
status: draft
updated_at: __DATE__
---

# __SERVICE_ID__ — Technická dokumentace

Technická dokumentace služby **__SERVICE_ID__** projektu **__PROJECT__**.
```

**`template/tech-docs/CLAUDE.md`**
Instructions for Claude in a tech-docs consumer repo: Czech only, frontmatter rules,
don't touch `.vitepress/` config, `tf-doc-vault validate/fix --root=tech-docs`, placeholders
`__SERVICE_ID__` and `__PROJECT__` to be filled by `init-tech-docs`.

---

## Step 6 — `init-tech-docs` subcommand

### `src/scripts/init-tech-docs.ts` (new file)

Mirrors `create-ana.mjs` pattern. Resolves `template/tech-docs/` from `import.meta.dirname`
(same trick: `path.resolve(import.meta.dirname, '../../template/tech-docs')`).

**Args:** `--service-id=<ID>` (required), `--project=<name>` (defaults to cwd folder name),
`--repo=<org/repo>` (optional, goes into commented editLink)

**Steps:**
1. Validate `--service-id` is present; exit 1 with usage if not
2. Resolve `outputDir = path.resolve(process.cwd(), 'tech-docs')`; if exists, warn but continue (idempotent copy only adds missing files)
3. `copyDirRecursive` (reuse same logic as in `create-ana.mjs` but inline/import)
4. `replacePlaceholders` with: `__SERVICE_ID__`, `__PROJECT__`, `__REPO__`, `__DATE__`
5. Idempotently update `package.json` in CWD — read, merge scripts, write back:
   ```json
   "docs:dev":      "vitepress dev tech-docs",
   "docs:build":    "vitepress build tech-docs",
   "docs:validate": "tf-doc-vault validate --root=tech-docs",
   "docs:fix":      "tf-doc-vault fix --root=tech-docs"
   ```
6. Idempotently append to `.gitignore` (or create if absent):
   ```
   tech-docs/.vitepress/dist/
   tech-docs/.vitepress/cache/
   ```
7. Print next steps to stdout

### `bin/tf-doc-vault.mjs`
Add to `COMMANDS`:
```js
'init-tech-docs': 'init-tech-docs.js',
```
Note: `SCRIPTS_DIR` already points to `dist/scripts/`, so this works via `runScript()`.

Update `usage()` string to include `init-tech-docs`.

---

## Step 7 — Docker documentation

**`docker/docs-build-stage.md`** (new file — documentation only):

Ready-to-copy multi-stage Dockerfile fragment that:
- Stage `docs-builder`: `FROM node:22-alpine`, installs pnpm, runs `pnpm docs:build`
- Copies `tech-docs/.vitepress/dist/` into the final image at `/app/public/tech-docs/`

No code changes.

---

## Step 8 — `import-confluence` subcommand

### Dependencies
Add to `package.json` `dependencies` (runtime):
- `"@atlaskit/adf-to-md": "^1"` — ADF-to-Markdown converter

### `src/scripts/import-confluence.ts` (new file)

**Args:** `--site=<host>`, `--root-page-id=<id>`, `--output=<dir>`, `--space=<SPACE>` (optional)

**Env:** `CONFLUENCE_API_TOKEN`, `CONFLUENCE_USER_EMAIL`

**Core flow:**
1. Validate required args/env; exit 1 with usage if missing
2. Auth header = `"Basic " + Buffer.from(`${email}:${token}`).toString('base64')`
3. `fetchPage(id)` → `GET https://<site>/wiki/api/v2/pages/<id>?body-format=atlas_doc_format`
4. `fetchChildren(id)` → `GET /wiki/api/v2/pages/<id>/children?body-format=atlas_doc_format`; paginate via `_links.next`
5. Build page tree recursively
6. For each page:
    - Convert ADF body via `@atlaskit/adf-to-md` (use `createRequire` from `node:module` if package is CJS-only)
    - Frontmatter: `title` from Confluence, `status: review`, `updated_at` from `version.createdAt` (`YYYY-MM-DD`)
    - Slugify title: lowercase, strip leading `[SERVICE_ID]`-style prefix, replace non-alphanumeric with `-`, collapse multiple `-`
    - Output path: root page → `<output>/index.md`; pages with children → `<output>/<slug>/index.md`; leaf pages → `<output>/<slug>.md`
7. Idempotence: if file already exists AND has `status: published`, preserve `status: published`
8. Attachments: fetch via `GET /wiki/rest/api/content/<id>/child/attachment`; download to `<output>/../public/images/`; rewrite URLs in markdown
9. Inter-page links: if target is in migrated set → relative `.md` link; else absolute URL
10. Summary: print count of pages, images, warnings

### `bin/tf-doc-vault.mjs`
Add to `COMMANDS`:
```js
'import-confluence': 'import-confluence.js',
```

---

## Step 9 — README rewrite

**`README.md`** — complete rewrite covering:
1. One-sentence description (both use cases)
2. Use case 1: analytical docs — `create-ana` / `tf-doc-vault create` quickstart
3. Use case 2: tech-docs — `pnpm dlx @techfides/tf-doc-vault init-tech-docs` quickstart
4. API reference: `makeConfig()`, `setupTechDocs()`
5. Docker fragment reference → `docker/docs-build-stage.md`
6. Confluence import: example `import-confluence` command
7. MIT licence; SECURITY.md link
8. Disclaimer: internal tooling, no support guarantees, breaking changes in 0.x

---

## Critical files summary

| File | Type | Change |
|------|------|--------|
| `package.json` | Edit | Rename, version, license, exports, peerDeps, devDeps, publishConfig, files |
| `bin/ana-docs.mjs` → `bin/tf-doc-vault.mjs` | Rename | Update usage string, binary refs |
| `src/config/makeConfig.ts` | Edit | `noExternal` ref + version dropdown condition (2 places) |
| `src/scripts/validate-docs.ts` | Edit | `--root` flag (DOCS_ROOT + PUBLIC_ROOT dynamic) |
| `src/scripts/normalize-docs.ts` | Edit | `--root` flag (DOCS_ROOT dynamic) |
| `src/scripts/fix.ts` | Edit | Binary rename `ana-docs`→`tf-doc-vault` + `--root` propagation |
| `src/setup/express.ts` | New | Express middleware + `SetupTechDocsOptions` interface |
| `src/setup/nest.ts` | New | NestJS wrapper with overloaded signature |
| `src/index.ts` | Edit | Re-export `setupTechDocs` + `SetupTechDocsOptions` |
| `template/docs/.vitepress/config.ts` | Edit | Import path update |
| `template/docs/.vitepress/theme/index.ts` | Edit | Import path update |
| `template/package.json` | Edit | Dep name, `onlyBuiltDependencies`, scripts (all `ana-docs` → `tf-doc-vault`) |
| `template/tech-docs/.vitepress/config.ts` | New | |
| `template/tech-docs/v1/index.md` | New | |
| `template/tech-docs/CLAUDE.md` | New | |
| `src/scripts/init-tech-docs.ts` | New | init command |
| `src/scripts/import-confluence.ts` | New | Confluence importer |
| `docker/docs-build-stage.md` | New | Dockerfile fragment docs |
| `.github/workflows/publish.yml` | New | npm publish CI |
| `LICENSE` | New | MIT |
| `CONTRIBUTING.md` | New | |
| `SECURITY.md` | New | |
| `README.md` | Edit | Complete rewrite |

---

## Verification

```bash
# 1. Build + typecheck + lint
pnpm build && pnpm typecheck && pnpm lint

# 2. Smoke-test version dropdown (single-version path)
node -e "
  import('./dist/config/makeConfig.js').then(({ makeConfig }) => {
    // point configDir at a temp dir that only has v1/
    // nav array must not contain a 'Verze' entry
    console.log('version dropdown conditional: OK (manual inspection)');
  });
"

# 3. setup middleware null-path test
node --input-type=module <<'EOF'
import { createTechDocsHandler } from './dist/setup/express.js';
const h = await createTechDocsHandler({});
console.assert(h === null, 'no auth → null');
const h2 = await createTechDocsHandler({ auth: { password: 'x' } });
console.assert(h2 === null, 'no dist dir → null');
console.log('setup middleware: OK');
EOF

# 4. init-tech-docs smoke test
mkdir /tmp/test-svc && cd /tmp/test-svc
echo '{"name":"test-svc","scripts":{}}' > package.json
node <path>/bin/tf-doc-vault.mjs init-tech-docs --service-id=TEST --project=testproject
# verify: tech-docs/.vitepress/config.ts exists, package.json has docs:dev, .gitignore updated

# 5. --root flag validate
node <path>/bin/tf-doc-vault.mjs validate --root=tech-docs
# should report frontmatter issues on the template file (status: draft = valid)

# 6. import-confluence (requires real credentials — manual)
export CONFLUENCE_USER_EMAIL=...
export CONFLUENCE_API_TOKEN=...
node <path>/bin/tf-doc-vault.mjs import-confluence \
  --site=example.atlassian.net --root-page-id=12345 --output=./tech-docs/v1
```