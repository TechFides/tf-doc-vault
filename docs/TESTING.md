# Testing

Two tiers. Add new tests in the tier whose boundary you crossed.

## Tier 1: Vitest unit tests (`tests/unit/`)

Pure-logic tests for code that does not shell out, spawn processes, or build a site. Layout mirrors `src/`:

- `tests/unit/sidebar/`: sidebar/nav generation against in-memory file trees
- `tests/unit/scripts/`: doc-tooling helpers (`normalize-docs`, `validate-docs`) and the boilerplate-sync file resolution (`sync-template`)
- `tests/unit/cli/`: CLI logic that needs neither a real repo nor a TTY. `utils.test.ts` covers the helpers in `src/cli/utils.ts` (arg parsing, `copyDir`, placeholder substitution); `scaffold.test.ts` covers template manifest parsing and validation, the copy plan and its rename and exclude rules; `setup.test.ts` covers the wizard, from flag and answer resolution through a fake prompt layer to the host `package.json` and `.gitignore` integration; `git-context.test.ts` covers detecting an ancestor git repo and parsing its `origin` remote (real `git init` in a temp dir, no network)
- `tests/unit/boilerplate/`: logic shipped straight to consumers rather than through `src/`. `middleware.test.ts` covers the Vercel edge auth middleware's `Request` → `Response` behavior directly

Run:

- All: `pnpm test:unit`
- With coverage: `pnpm test:unit:coverage`
- Single test by name: `pnpm test:unit -- -t "<name>"`
- Single file: `pnpm test:unit -- tests/unit/sidebar/sidebar.test.ts`

Config: `vitest.config.ts`. Keep these tests deterministic: no real filesystem outside `tmp` dirs, no network.

## Tier 2: Playwright smoke tests (`tests/smoke/`)

End-to-end checks that exercise the published CLI against a real VitePress site. Existing specs:

- `cli-subcommands.spec.ts`: `tf-doc-vault` subcommand invocation, plus the assertion that `setup --help` lists the templates found in `templates/` rather than a hardcoded set
- `ana-dev.spec.ts`, `ana-preview.spec.ts`, `tech-docs-preview.spec.ts`: sites scaffolded by `tf-doc-vault setup` (one fixture per template) boot and render
- `ana-served-at-root.spec.ts`: the built `ana-docs` site served at the domain root, the layout Vercel serves the static build under. `vitepress dev`/`preview` serve under the configured base and hide a base mismatch; this spec fails on any request that 404s
- `ana-github-vercel.spec.ts`: a fresh `ana-docs` scaffold ships `vercel.json`/`middleware.ts`/`.github/workflows/ci.yml` and none of the removed GitLab/GCP files; scaffolding a second offer into an already-git-initialized repo (the monorepo pattern) skips `git init`, derives `repo`/`repo-subdir` from the detected `origin` remote, and never overwrites the first offer's CI workflow
- `playground-dark-mode.spec.ts`: the theme's dark-mode navbar chrome against `playground/docs`
- `exports.spec.ts`: every subpath export resolves from a scaffolded repo, and the packed tarball contains `boilerplate/` and `templates/` but no `specs/` path

Run:

- All: `pnpm test:smoke`
- Single spec: `pnpm test:smoke tests/smoke/cli-subcommands.spec.ts`
- UI mode for debugging: `pnpm test:smoke --ui`

Config: `playwright.config.ts`. Global setup is in `tests/smoke/global-setup.ts` (builds `dist/` and prepares fixtures).

## `middleware.ts`'s Basic auth

`boilerplate/middleware.ts` (the Vercel edge middleware every `ana-docs` scaffold ships) is plain `Request → Response` logic with no Vercel-specific runtime
dependency, so its auth behavior is covered directly: `tests/unit/boilerplate/middleware.test.ts` asserts the pass-through when credentials are unset, `401` +
`WWW-Authenticate` on a missing/wrong `Authorization` header, and success with the right one. There is no Docker-based deploy regression tier anymore: Vercel
runs the build, not this repo, and the smoke tier (`ana-github-vercel.spec.ts`) already covers the files that reach a scaffold and the monorepo git-detection
behavior.

## Confluence importer verification

The importer (`src/cli/import-confluence.ts` + `src/confluence/**`) converts Confluence ADF to VitePress Markdown. Its conversion is covered by fixture-based unit tests, so the routine check needs **no Confluence access**:

- **Always run `pnpm test`.** The `tests/unit/confluence/` specs run `convertAdf` against the committed `example-page.adf.json` fixture, asserting that tables, emoji, images, code blocks and smart links convert correctly and that nothing leaks as a raw `adf:unknown` fragment. The smoke suite exercises the CLI. No page or credentials required.

- **Optional: live end-to-end.** Only when validating against a real page or a large tree (pagination / concurrency / per-page error isolation). This needs network access and credentials, so it is **not part of the routine gate**:

  ```sh
  CONFLUENCE_USER_EMAIL=… CONFLUENCE_API_TOKEN=… \
    node dist/cli/import-confluence.js --site=<host> --root-page-id=<id> --output=<dir>
  ```

  To eyeball rendering, stage a converted page into `playground/docs/` and run `pnpm build:docs` (or `pnpm dev:docs`). A clean VitePress build confirms the Markdown compiles through Vue, so it won't break dev-mode HMR.

Good to know:

- **Attachment downloads** must use the REST path `…/wiki/rest/api/content/{pageId}/child/attachment/{attId}/download`. The legacy `/wiki/download/attachments/…` link is OAuth-gated and returns `401` for API-token (scoped) auth.
- **Dynamic `extension` macros** (table-of-contents, includes, drawio, …) can't become static Markdown; they are dropped with a per-page warning, not an error.
- `makeConfig` already sets `ignoreDeadLinks: [/localhost/]`, so `localhost` links in imported pages don't fail a docs build.
- If a build fails on a missing dependency, `node_modules` may be stale; re-sync with `pnpm install --frozen-lockfile`.

## When to add which

- Touching `src/sidebar`, `src/scripts`, or pure helpers in `src/cli/`: **unit test** in the matching `tests/unit/<area>/` folder.
- Touching `src/cli/*` user-visible CLI behaviour, or anything that affects how a scaffolded site boots: **smoke test** in `tests/smoke/`.
- Touching `src/confluence/**` or the Confluence importer: cover it with a `tests/unit/confluence/` spec and follow **Confluence importer verification** above.
- Touching a boilerplate file with real logic (`middleware.ts`): **unit test** in `tests/unit/boilerplate/`, importing it directly.
- Fixing a bug: add a regression test in the tier that would have caught it before fixing the code.

## External dependencies

- File system: use `os.tmpdir()` (see existing specs) and clean up afterwards. Never write into the repo working tree.
- Spawned processes: drive through Playwright fixtures or `node:child_process` with explicit `cwd` and `env`. Do not rely on the user's `PATH`.
- Network: there is no live network use in the suite; keep it that way. If you need to fetch, stub at the boundary.

## CI

Both tiers run in `.github/workflows/ci.yml`. A red Playwright run uploads a report to `playwright-report/`; inspect it before retrying.
