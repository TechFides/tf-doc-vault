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

## When to add which

- Touching `src/sidebar`, `src/scripts`, or pure helpers in `src/cli/`: **unit test** in the matching `tests/unit/<area>/` folder.
- Touching `src/cli/*` user-visible CLI behaviour, `src/setup/**`, or anything that affects how a scaffolded site boots: **smoke test** in `tests/smoke/`.
- Fixing a bug: add a regression test in the tier that would have caught it before fixing the code.

## External dependencies

- File system: use `os.tmpdir()` (see existing specs) and clean up afterwards. Never write into the repo working tree.
- Spawned processes: drive through Playwright fixtures or `node:child_process` with explicit `cwd` and `env`. Do not rely on the user's `PATH`.
- Network: there is no live network use in the suite — keep it that way. If you need to fetch, stub at the boundary.

## CI

Both tiers run in `.github/workflows/ci.yml`. A red Playwright run uploads a report to `playwright-report/` — inspect it before retrying.
