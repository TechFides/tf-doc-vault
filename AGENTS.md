# AGENTS.md

Workflow guidance for automated coding agents working on `@techfides/tf-doc-vault`.
If a more specific rule exists elsewhere (CONTRIBUTING.md, SECURITY.md, CODEOWNERS, `docs/`), it wins over anything below.

## Project overview

Internal TechFides docs platform: CLI (`tf-doc-vault`, `create-ana`), reusable VitePress config / theme / sidebar, Express/NestJS tech-docs mount, Docker image, Terraform module. Published to npm as `@techfides/tf-doc-vault`.

## Tech stack

- Node >=24, pnpm 11.1.3 (pinned via `packageManager` in `package.json`)
- TypeScript 6, strict + `noUncheckedIndexedAccess`, `module`/`moduleResolution` `NodeNext`, ESM only (`"type": "module"`)
- `dist/` is emitted by `tsc`, plus `unbuild` for `src/setup/**`
- VitePress 1.6 + Vue 3.5 (theme), Mermaid via `vitepress-plugin-mermaid`
- Tests: Vitest (unit), Playwright (smoke)
- Release tooling: `changelogen` + Husky `commit-msg` running `commitlint` (config-conventional)

## Commands

- Install (also builds `dist/` via `prepare`): `pnpm install`
- Build: `pnpm build`
- Watch build: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Format: `pnpm format` (check only: `pnpm format:check`)
- Unit tests: `pnpm test:unit` (coverage: `pnpm test:unit:coverage`)
- Run a single unit test: `pnpm test:unit -- -t "<name>"`
- Smoke tests (Playwright): `pnpm test:smoke`
- All tests (unit + smoke): `pnpm test`
- Docs playground: `pnpm dev:docs` / `pnpm build:docs` / `pnpm preview:docs`
- License check: `pnpm licence-check`
- Cut a release locally: `pnpm release` (already passes `--no-github`)

## Repo map

- `src/config/`: VitePress config factory (`makeConfig`)
- `src/sidebar/`: sidebar / nav generator (`generateNav`, `generateSidebar`, `getVersions`)
- `src/theme/`: Vue theme: components, composables, styles
- `src/setup/`: `setupTechDocs` mount for Express / NestJS; built by `unbuild`, NOT by `tsc` (excluded in `tsconfig.json`)
- `src/scripts/`: docs tooling scripts (`validate-docs`, `normalize-docs`, `export-pdf`, …)
- `src/cli/`: TypeScript CLI entrypoints (`tf-doc-vault`, `create-ana`, `init-tech-docs`, `import-confluence`, shared `utils`), compiled by `tsc` to `dist/cli/`; the `bin` field points at `dist/cli/*.js`
- `src/confluence/`: Confluence importer internals: `client` (paginated/retried REST + tree), `convert` (ADF→Markdown via `extended-markdown-adf-parser` + glue), `resolve-media` (attachment resolution), `types`
- `configs/`: published shared ESLint / Prettier / tsconfig base configs
- `template/`: full ana-docs project scaffold used by `create-ana`
- `template-tech-docs/`: tech-docs subset copied into consumer service repos by `init-tech-docs`
- `playground/docs/`: local VitePress sandbox for theme / config development
- `tests/unit/`: Vitest specs
- `tests/smoke/`: Playwright specs
- `infra/terraform/`: published Terraform module
- `docker/`: Dockerfile + nginx configs

## Conventions

- Commit messages follow Conventional Commits. Enforced by Husky `commit-msg` → `commitlint`. `changelogen` derives the next version and `CHANGELOG.md` entries from these, so keep them well-formed.

### Comments

Applies to every language in the repo, TypeScript, Vue, CSS and shell alike.

- Write a comment only where the code alone is not enough: a framework quirk, a non-obvious constraint, or the reason behind a counter-intuitive choice. If a competent reader already knows it from the code, leave it out.
- Never restate the code in prose. `/** Copy a directory tree. */` above `copyDir` is noise.
- Describe the present state. No development history ("the old default was…", "used to"), no notes about what something is not. The one exception is "why not the obvious alternative" when that alternative is a real trap.
- Aim for one or two lines. Go longer only for genuinely non-trivial context (SSR hydration, bundler quirks, auth traps).
- English everywhere, including `template/` and `template-tech-docs/`.
- JSDoc stays on the published surface (`makeConfig` options, `createTheme`, `setupTechDocs`, the sidebar generators) because it is the only documentation a consumer sees in their editor. Keep it short. On internal helpers, write JSDoc only when it explains behaviour that the signature does not.
- Section banners (`// ─── name ───`) belong only in files over roughly 300 lines. A file header is one to three lines about the module's role, with no `Usage:` block duplicating `--help`.
- In tests, keep the note about why a test exists, written in the present tense.

### Prose

- No em dash. Use a colon, parentheses, a semicolon, a comma, or two sentences. This holds for English and Czech, in code comments, CLI output, markdown and skill files. A hyphen in compounds and an en dash in numeric ranges are fine, as is a lone `—` used as an empty-value marker in a table cell.
- Avoid the "not just X, but Y" construction, filler ("it is important to note"), marketing adjectives ("robust", "seamless", "comprehensive solution") and forced three-item lists.

## Architecture

Single TypeScript package published to npm as `@techfides/tf-doc-vault`. The root entry (`src/index.ts`) re-exports the library API (config, sidebar, theme). The Express/NestJS mount (`src/setup/`) is built separately by `unbuild` and exposed only via the subpaths `@techfides/tf-doc-vault/setup/express` and `.../setup/nest`, never via the root index. The CLI in `src/cli/` (compiled to `dist/cli/`) scaffolds two flavours of consumer site from `template/` (full ana-docs project) and `template-tech-docs/` (subset mounted inside a service).

## Testing

See [`docs/TESTING.md`](docs/TESTING.md). In short: Vitest for pure logic in `src/scripts` and `src/sidebar`; Playwright smoke tests for CLI subcommands and the Express/Nest mount; a bug fix needs a regression test in the matching tier. When you change the Confluence importer (`src/confluence/**` or `src/cli/import-confluence.ts`), also follow **Confluence importer verification** in `docs/TESTING.md` before reporting done (the routine check is fixture-based and needs no Confluence access; a live page + credentials are optional).

## Domain glossary

- **tech-docs**: technical documentation mounted inside a running service via `setupTechDocs(...)`. Lives in the consumer repo, not here.
- **ana-docs** (analysis docs): standalone analysis / specification VitePress site, scaffolded by `create-ana` from `template/`.
- **`template/`**: full ana-docs project scaffold used by `create-ana`.
- **`template-tech-docs/`**: subset copied into a consumer service repo by `init-tech-docs` so that service can ship its own tech-docs.
- **`playground/`**: local VitePress sandbox in this repo for developing theme / config. Not a consumer-facing entrypoint and must not be published.
- **Consumer repo**: a downstream repo (e.g. `srvc-bat`) that depends on `@techfides/tf-doc-vault`. `tech-docs/` exists there, not here.

## Hard limits

- Never re-export `src/setup/**` from `src/index.ts`. `src/setup` is excluded from `tsc` and built separately by `unbuild`; a re-export would dangle at runtime (see comment in `src/index.ts`).
- Never run `changelogen --release` without `--no-github`. `pnpm release` already passes it. Plain `--release` opens a browser pre-fill that creates a remote tag at the wrong commit and breaks the CI publish (see `CONTRIBUTING.md` → Releasing).
- Never commit `*.tgz` or `file:./*.tgz` references inside `template-tech-docs/`. Pre-publish tarball testing is maintainer-only and must not propagate to consumer repos.
- Never hand-edit `dist/`. It is generated by `pnpm build`; change the source under `src/`.

## Workflow for agents

1. Smallest coherent diff that satisfies the goal, with no drive-by refactors or new tooling.
2. Code + tests + docs change together when behaviour changes.
3. Before opening / updating a PR run `pnpm lint && pnpm typecheck && pnpm test` and report results.
4. If a check fails, fix the root cause; do not disable it or pass `--no-verify`.
5. Never commit secrets. Publish auth is OIDC; there is no `NPM_TOKEN` in this repo.
6. Do not bypass the `npm-publish` environment approval: releases require a named reviewer (see `CONTRIBUTING.md` → Releasing).
