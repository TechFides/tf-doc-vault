# AGENTS.md

Workflow guidance for automated coding agents working on `@techfides/tf-doc-vault`.
If a more specific rule exists elsewhere (CONTRIBUTING.md, SECURITY.md, CODEOWNERS, `docs/`), it wins over anything below.

## Project overview

Internal TechFides docs platform: CLI (`tf-doc-vault`, with an interactive `setup` wizard), reusable VitePress config / theme / sidebar, Docker image, Terraform module. Published to npm as `@techfides/tf-doc-vault`.

## Tech stack

- Node >=24, pnpm 11.1.3 (pinned via `packageManager` in `package.json`)
- TypeScript 6, strict + `noUncheckedIndexedAccess`, `module`/`moduleResolution` `NodeNext`, ESM only (`"type": "module"`)
- `dist/` is emitted by `tsc`
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
- `src/scripts/`: docs tooling scripts (`validate-docs`, `normalize-docs`, `export-pdf`, …)
- `src/cli/`: TypeScript CLI entrypoints (`tf-doc-vault`, `setup`, `import-confluence`, shared `utils`), compiled by `tsc` to `dist/cli/`; the `bin` field points at `dist/cli/*.js`
- `src/confluence/`: Confluence importer internals: `client` (paginated/retried REST + tree), `convert` (ADF→Markdown via `extended-markdown-adf-parser` + glue), `resolve-media` (attachment resolution), `types`
- `configs/`: published shared ESLint / Prettier / tsconfig base configs
- `boilerplate/`: the single VitePress project scaffold shared by every template (config, theme wiring, Docker, CI, Terraform); flat, no per-template subfolders
- `templates/<name>/`: Markdown content for one template plus a `_template.md` manifest (never copied to a scaffold) declaring its behaviour: target location, wizard fields, `boilerplate/` excludes, host integration. Adding a template is adding a folder here, no code change
- `playground/docs/`: local VitePress sandbox for theme / config development
- `tests/unit/`: Vitest specs
- `tests/smoke/`: Playwright specs
- `infra/terraform/`: published Terraform module
- `docker/`: Dockerfile + nginx configs
- `specs/`: internal implementation plans; excluded from the published package via `files` in `package.json`

## Conventions

- Commit messages follow Conventional Commits. Enforced by Husky `commit-msg` → `commitlint`. `changelogen` derives the next version and `CHANGELOG.md` entries from these, so keep them well-formed.

### Comments

Applies to every language in the repo, TypeScript, Vue, CSS and shell alike.

- Write a comment only where the code alone is not enough: a framework quirk, a non-obvious constraint, or the reason behind a counter-intuitive choice. If a competent reader already knows it from the code, leave it out.
- Never restate the code in prose. `/** Copy a directory tree. */` above `copyDir` is noise.
- Describe the present state. No development history ("the old default was…", "used to"), no notes about what something is not. The one exception is "why not the obvious alternative" when that alternative is a real trap.
- Aim for one or two lines. Go longer only for genuinely non-trivial context (SSR hydration, bundler quirks, auth traps).
- English everywhere, including `boilerplate/` and `templates/`.
- JSDoc stays on the published surface (`makeConfig` options, `createTheme`, the sidebar generators) because it is the only documentation a consumer sees in their editor. Keep it short. On internal helpers, write JSDoc only when it explains behaviour that the signature does not.
- Section banners (`// ─── name ───`) are for long, multi-concern files where they genuinely aid navigation, not a default. Do not use them as decoration in a short file, and never as a label that only repeats the declaration below it. A file header is one to three lines about the module's role, with no `Usage:` block duplicating `--help`.
- In tests, keep the note about why a test exists, written in the present tense.

### Prose

- No em dash. Use a colon, parentheses, a semicolon, a comma, or two sentences. This holds for English and Czech, in code comments, CLI output, markdown and skill files. A hyphen in compounds and an en dash in numeric ranges are fine, as is a lone `—` used as an empty-value marker in a table cell.
- Avoid the "not just X, but Y" construction, filler ("it is important to note"), marketing adjectives ("robust", "seamless", "comprehensive solution") and forced three-item lists.

## Architecture

Single TypeScript package published to npm as `@techfides/tf-doc-vault`. The root entry (`src/index.ts`) re-exports the library API (config, sidebar, theme). The CLI in `src/cli/` (compiled to `dist/cli/`) exposes `tf-doc-vault setup`, an interactive wizard that discovers templates by reading `templates/*/_template.md` and copies the matching Markdown on top of the shared `boilerplate/` VitePress project. `src/**` stays generic: no template name is hardcoded anywhere in it.

## Testing

See [`docs/TESTING.md`](docs/TESTING.md). In short: Vitest for pure logic in `src/scripts` and `src/sidebar`; Playwright smoke tests for CLI subcommands and scaffolded sites; a bug fix needs a regression test in the matching tier. When you change the Confluence importer (`src/confluence/**` or `src/cli/import-confluence.ts`), also follow **Confluence importer verification** in `docs/TESTING.md` before reporting done (the routine check is fixture-based and needs no Confluence access; a live page + credentials are optional).

## Domain glossary

- **tech-docs**: technical documentation living inside a service repo, in a `tech-docs/` subfolder. A template name (`templates/tech-docs/`), not a concept baked into `src/**`. Lives in the consumer repo, not here.
- **ana-docs** (analysis docs): standalone analysis / specification VitePress site, its own repo. A template name (`templates/ana-docs/`), not a concept baked into `src/**`.
- **`boilerplate/`**: the single VitePress project scaffold shared by every template.
- **`templates/<name>/`**: Markdown content plus a `_template.md` manifest for one template.
- **`playground/`**: local VitePress sandbox in this repo for developing theme / config. Not a consumer-facing entrypoint and must not be published.
- **Consumer repo**: a downstream repo (e.g. `srvc-bat`) that depends on `@techfides/tf-doc-vault`. `tech-docs/` exists there, not here.

## Hard limits

- Never run `changelogen --release` without `--no-github`. `pnpm release` already passes it. Plain `--release` opens a browser pre-fill that creates a remote tag at the wrong commit and breaks the CI publish (see `CONTRIBUTING.md` → Releasing).
- Never commit `*.tgz` or `file:./*.tgz` references inside `boilerplate/` or `templates/`. Pre-publish tarball testing is maintainer-only and must not propagate to consumer repos.
- Never hand-edit `dist/`. It is generated by `pnpm build`; change the source under `src/`.
- Never reference a specific template name (`ana-docs`, `tech-docs`, or any other) from `src/**`. The wizard reads template behaviour from `templates/*/_template.md`; adding or changing a template must not require a code change.

## Workflow for agents

1. Smallest coherent diff that satisfies the goal, with no drive-by refactors or new tooling.
2. Code + tests + docs change together when behaviour changes.
3. Before opening / updating a PR run `pnpm lint && pnpm typecheck && pnpm test` and report results.
4. If a check fails, fix the root cause; do not disable it or pass `--no-verify`.
5. Never commit secrets. Publish auth is OIDC; there is no `NPM_TOKEN` in this repo.
6. Do not bypass the `npm-publish` environment approval: releases require a named reviewer (see `CONTRIBUTING.md` → Releasing).
