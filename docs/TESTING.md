# Testing

Two tiers. Add new tests in the tier whose boundary you crossed.

## Tier 1 — Vitest unit tests (`tests/unit/`)

Pure-logic tests for code that does not shell out, spawn processes, or build a site. Layout mirrors `src/`:

- `tests/unit/sidebar/` — sidebar/nav generation against in-memory file trees
- `tests/unit/scripts/` — doc-tooling helpers (e.g. `normalize-docs`)
- `tests/unit/cli/` — CLI helpers in `src/cli/utils.ts`

Run:

- All: `pnpm test:unit`
- With coverage: `pnpm test:unit:coverage`
- Single test by name: `pnpm test:unit -- -t "<name>"`
- Single file: `pnpm test:unit -- tests/unit/sidebar/sidebar.test.ts`

Config: `vitest.config.ts`. Keep these tests deterministic — no real filesystem outside `tmp` dirs, no network.

## Tier 2 — Playwright smoke tests (`tests/smoke/`)

End-to-end checks that exercise the published CLI and the Express/Nest setup against a real VitePress site. Existing specs:

- `cli-subcommands.spec.ts` — `tf-doc-vault` / `create-ana` invocation
- `ana-dev.spec.ts`, `ana-preview.spec.ts`, `tech-docs-preview.spec.ts` — scaffolded site dev/preview servers boot and render
- `setup-express.spec.ts`, `setup-nest.spec.ts` — `setupTechDocs` mount serves docs behind Basic auth
- `exports.spec.ts` — PDF/print export flow

Run:

- All: `pnpm test:smoke`
- Single spec: `pnpm test:smoke tests/smoke/cli-subcommands.spec.ts`
- UI mode for debugging: `pnpm test:smoke --ui`

Config: `playwright.config.ts`. Global setup is in `tests/smoke/global-setup.ts` (builds `dist/` and prepares fixtures).

## Tier 3 — Docker deploy regression (`scripts/e2e-happy-path.sh`)

Reproduces the full ana deploy chain locally — `scaffold → CI jobs → Docker build → live web behind Basic auth` — everything except `gcloud run deploy` (Cloud Run just runs the same container on port 8080). Unlike the smoke tier it builds the real `nginx-auth` image and probes it over HTTP, so it catches base-path/serving-layer regressions the `vitepress preview`/`dev` servers can't (they auto-serve under the configured base).

What it asserts: the scaffold commits a `pnpm-lock.yaml` on branch `master` with an npm-versioned dependency; a fresh clone passes `pnpm install --frozen-lockfile` + the lint jobs; the `SERVER_TYPE=nginx-auth` image builds; and the running container returns `401` without creds, `200` with creds, and — probing the **base-prefixed** asset URL from the built HTML — `200` (not `404`) for a hashed asset, so Basic auth works and the site base matches the root serving layout.

Coverage boundary: it scaffolds with the default npm source, so the scaffolded site consumes the **published** `@techfides/tf-doc-vault` library — this branch's `template/` and `create-ana` CLI are exercised, but the shipped library code (`src/config`, `src/theme`, …) is not. Run it while `package.json` still points at the published version (i.e. **before** the release version bump), otherwise the scaffold pins an unpublished version and the frozen install fails.

Run before cutting a release:

```sh
pnpm test:e2e          # needs a running docker daemon; overrides: PORT, BASIC_AUTH_USER, BASIC_AUTH_PASS
```

Requires docker + pnpm + node + git + curl. Idempotent — it scaffolds into a `mktemp` dir and removes the container, image and temp dir on exit. Exit code = number of failed checks. Not part of `pnpm test` (needs Docker); run it manually or in the release job. `scripts/` is outside the published `files`, so it never ships to consumers.

## Confluence importer verification

The importer (`src/cli/import-confluence.ts` + `src/confluence/**`) converts Confluence ADF to VitePress Markdown. Its conversion is covered by fixture-based unit tests, so the routine check needs **no Confluence access**:

- **Always run `pnpm test`.** The `tests/unit/confluence/` specs run `convertAdf` against the committed `example-page.adf.json` fixture — asserting tables, emoji, images, code blocks and smart links convert correctly and that nothing leaks as a raw `adf:unknown` fragment — and the smoke suite exercises the CLI. No page or credentials required.

- **Optional — live end-to-end.** Only when validating against a real page or a large tree (pagination / concurrency / per-page error isolation). This needs network access and credentials, so it is **not part of the routine gate**:

  ```sh
  CONFLUENCE_USER_EMAIL=… CONFLUENCE_API_TOKEN=… \
    node dist/cli/import-confluence.js --site=<host> --root-page-id=<id> --output=<dir>
  ```

  To eyeball rendering, stage a converted page into `playground/docs/` and run `pnpm build:docs` (or `pnpm dev:docs`). A clean VitePress build confirms the Markdown compiles through Vue — i.e. it won't break dev-mode HMR.

Good to know:

- **Attachment downloads** must use the REST path `…/wiki/rest/api/content/{pageId}/child/attachment/{attId}/download`. The legacy `/wiki/download/attachments/…` link is OAuth-gated and returns `401` for API-token (scoped) auth.
- **Dynamic `extension` macros** (table-of-contents, includes, drawio, …) can't become static Markdown; they are dropped with a per-page warning, not an error.
- `makeConfig` already sets `ignoreDeadLinks: [/localhost/]`, so `localhost` links in imported pages don't fail a docs build.
- If a build fails on a missing dependency, `node_modules` may be stale — re-sync with `pnpm install --frozen-lockfile`.

## When to add which

- Touching `src/sidebar`, `src/scripts`, or pure helpers in `src/cli/`: **unit test** in the matching `tests/unit/<area>/` folder.
- Touching `src/cli/*` user-visible CLI behaviour, `src/setup/**`, or anything that affects how a scaffolded site boots: **smoke test** in `tests/smoke/`.
- Touching `src/confluence/**` or the Confluence importer: cover it with a `tests/unit/confluence/` spec and follow **Confluence importer verification** above.
- Fixing a bug: add a regression test in the tier that would have caught it before fixing the code.

## External dependencies

- File system: use `os.tmpdir()` (see existing specs) and clean up afterwards. Never write into the repo working tree.
- Spawned processes: drive through Playwright fixtures or `node:child_process` with explicit `cwd` and `env`. Do not rely on the user's `PATH`.
- Network: there is no live network use in the suite — keep it that way. If you need to fetch, stub at the boundary.

## CI

Both tiers run in `.github/workflows/ci.yml`. A red Playwright run uploads a report to `playwright-report/` — inspect it before retrying.
