# Changelog

## v0.2.4

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.2.3...v0.2.4)

### 🚀 Enhancements

- **theme:** Visual design polish — tables, sidebar, landing page, custom blocks ([3aec8ca](https://github.com/TechFides/tf-doc-vault/commit/3aec8ca))

### 🏡 Chore

- **playground:** Remove duplicate h1 headings from all doc pages ([53de8e4](https://github.com/TechFides/tf-doc-vault/commit/53de8e4))
- Fix prettier formatting ([34eb7ee](https://github.com/TechFides/tf-doc-vault/commit/34eb7ee))

### ❤️ Contributors

- Václav Mičulka ([@VaclavMiculka](https://github.com/VaclavMiculka))

## v0.2.3

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.2.2...v0.2.3)

### 🚀 Enhancements

- **config:** Add sectionNav option to hide navbar section links ([39a7a99](https://github.com/TechFides/tf-doc-vault/commit/39a7a99))
- **template-tech-docs:** Hide navbar section links by default ([f17a649](https://github.com/TechFides/tf-doc-vault/commit/f17a649))

### 🩹 Fixes

- **theme:** Eliminate hydration mismatches on built pages ([0d69405](https://github.com/TechFides/tf-doc-vault/commit/0d69405))
- **confluence:** Preserve task-list nesting and render GFM checkboxes ([38b3708](https://github.com/TechFides/tf-doc-vault/commit/38b3708))

### 🏡 Chore

- Translate remaining strings to english ([bb39104](https://github.com/TechFides/tf-doc-vault/commit/bb39104))

### ❤️ Contributors

- Filip.koukal <filip.koukal@techfides.cz>

## v0.2.2

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.2.1...v0.2.2)

### 🚀 Enhancements

- **theme:** Sidebar UX improvements — width, ellipsis, emoji align, page title ([6e76b80](https://github.com/TechFides/tf-doc-vault/commit/6e76b80))
- **theme:** Add SidebarDefaultEmoji component ([ff7a7ae](https://github.com/TechFides/tf-doc-vault/commit/ff7a7ae))
- **theme:** Remove footer border-top, remove navbar title bottom border ([245771a](https://github.com/TechFides/tf-doc-vault/commit/245771a))
- **theme:** Polish dark/light theme visuals for professional look ([ef3199c](https://github.com/TechFides/tf-doc-vault/commit/ef3199c))

### 🩹 Fixes

- **theme:** Increase sidebar text contrast in light mode ([66f54f9](https://github.com/TechFides/tf-doc-vault/commit/66f54f9))
- **theme:** Force sidebar text contrast with !important override ([8413aaa](https://github.com/TechFides/tf-doc-vault/commit/8413aaa))

### 💅 Refactors

- **theme:** Remove useSidebarEmojiAlign from public API ([d135f85](https://github.com/TechFides/tf-doc-vault/commit/d135f85))
- **theme:** Inline SidebarEmojiAlign logic, remove separate composable ([7d2255f](https://github.com/TechFides/tf-doc-vault/commit/7d2255f))
- **theme:** Remove SidebarEmojiAlign — all sidebar items have emoji ([be936c5](https://github.com/TechFides/tf-doc-vault/commit/be936c5))

### 📖 Documentation

- Update dlx command to include latest tag ([a8cb3f3](https://github.com/TechFides/tf-doc-vault/commit/a8cb3f3))
- Update ana-docs.md to include latest tag in dlx ([bbc272c](https://github.com/TechFides/tf-doc-vault/commit/bbc272c))

### 🏡 Chore

- Fix prettier formatting ([a2ed60f](https://github.com/TechFides/tf-doc-vault/commit/a2ed60f))

### ❤️ Contributors

- Václav Mičulka ([@VaclavMiculka](https://github.com/VaclavMiculka))
- Filip Koukal ([@filipkoukal](https://github.com/filipkoukal))

## v0.2.1

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.2.0...v0.2.1)

### 🚀 Enhancements

- **import-confluence:** Robust ADF conversion + scoped-token-safe downloads ([c0b8583](https://github.com/TechFides/tf-doc-vault/commit/c0b8583))

### 🩹 Fixes

- **import-confluence:** Resolve links and images against the VitePress srcDir ([6eee0e9](https://github.com/TechFides/tf-doc-vault/commit/6eee0e9))
- **theme:** Prepend site base to FeatureCards links ([9393106](https://github.com/TechFides/tf-doc-vault/commit/9393106))
- **import-confluence:** Cleaner links, bold and table cells ([93aa285](https://github.com/TechFides/tf-doc-vault/commit/93aa285))
- Preserve nested YAML in frontmatter ([360097a](https://github.com/TechFides/tf-doc-vault/commit/360097a))

### 💅 Refactors

- **cli:** Migrate bin/*.mjs to TypeScript under src/cli ([f54b2fc](https://github.com/TechFides/tf-doc-vault/commit/f54b2fc))
- Enhance logging and console outpout ([6f4dc06](https://github.com/TechFides/tf-doc-vault/commit/6f4dc06))

### 📖 Documentation

- Expand testing documentation to include confluence import verification ([8704774](https://github.com/TechFides/tf-doc-vault/commit/8704774))
- Split the long README into focused docs/ guides ([c10e9e8](https://github.com/TechFides/tf-doc-vault/commit/c10e9e8))

### 🏡 Chore

- Translate tooling to english ([a396d40](https://github.com/TechFides/tf-doc-vault/commit/a396d40))
- **renovate:** Automerge non-major updates once CI is green ([16148c8](https://github.com/TechFides/tf-doc-vault/commit/16148c8))
- **skills:** Add prerelease-check skill ([58e229e](https://github.com/TechFides/tf-doc-vault/commit/58e229e))

### ✅ Tests

- Make confluence conversion test fixture generic ([d44aebc](https://github.com/TechFides/tf-doc-vault/commit/d44aebc))
- Add missing tests for helper functions ([43e9bd0](https://github.com/TechFides/tf-doc-vault/commit/43e9bd0))
- Update vitest exclude list to reflect reality for unit testing ([6062aa8](https://github.com/TechFides/tf-doc-vault/commit/6062aa8))
- **normalize-docs:** Un-skip nested-frontmatter regression test ([5510911](https://github.com/TechFides/tf-doc-vault/commit/5510911))

### 🤖 CI

- Validate Terraform and lint Dockerfiles in the verify job ([d07b8a3](https://github.com/TechFides/tf-doc-vault/commit/d07b8a3))
- **renovate:** Self-merge PRs on a delayed schedule ([7b07c60](https://github.com/TechFides/tf-doc-vault/commit/7b07c60))

### ❤️ Contributors

- Filip.koukal <filip.koukal@techfides.cz>

## v0.2.0

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.1.7...v0.2.0)

### 🚀 Enhancements

- Local dev playground for theme + config ([4b9cd3f](https://github.com/TechFides/tf-doc-vault/commit/4b9cd3f))
- TechFides branding, brand-themed mermaid, branded 404, dev playground ([#48](https://github.com/TechFides/tf-doc-vault/pull/48))

### 📖 Documentation

- Add AGENTS.md and AI agent specific documentation ([3905f6b](https://github.com/TechFides/tf-doc-vault/commit/3905f6b))

### 🏡 Chore

- Add VaclavMiculka to CODEOWNERS ([c00e38c](https://github.com/TechFides/tf-doc-vault/commit/c00e38c))

### ❤️ Contributors

- Jan Max Pavlica ([@janmax-pavlica](https://github.com/janmax-pavlica))
- Filip.koukal <filip.koukal@techfides.cz>

## v0.1.7

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.1.6...v0.1.7)

### 🚀 Enhancements

- Warn when embedded inside an existing pnpm workspace ([448e651](https://github.com/TechFides/tf-doc-vault/commit/448e651))

### 🩹 Fixes

- Add back root items to top navigation ([3fcf8ed](https://github.com/TechFides/tf-doc-vault/commit/3fcf8ed))

### ✅ Tests

- Setup a playwright + vitest test suite ([a565532](https://github.com/TechFides/tf-doc-vault/commit/a565532))

### 🤖 CI

- Show playwright progress ([6f20a1f](https://github.com/TechFides/tf-doc-vault/commit/6f20a1f))

### ❤️ Contributors

- Filip.koukal <filip.koukal@techfides.cz>

## v0.1.6

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.1.5...v0.1.6)

### 🏡 Chore

- Update pnpm to version 11 ([d2371ca](https://github.com/TechFides/tf-doc-vault/commit/d2371ca))
- Add preview disclaimer to readme ([c8133af](https://github.com/TechFides/tf-doc-vault/commit/c8133af))

### ❤️ Contributors

- Filip.koukal <filip.koukal@techfides.cz>

## v0.1.5

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.1.4...v0.1.5)

### 🚀 Enhancements

- Add commitlint to CI ([2e122b7](https://github.com/TechFides/tf-doc-vault/commit/2e122b7))

### 💅 Refactors

- **config:** Remove `outlineLevel` configuration option ([647a4cb](https://github.com/TechFides/tf-doc-vault/commit/647a4cb))

### 📖 Documentation

- Overhaul README documentation ([d78b2e4](https://github.com/TechFides/tf-doc-vault/commit/d78b2e4))
- Remove inline comments from Terraform template ([333a62d](https://github.com/TechFides/tf-doc-vault/commit/333a62d))
- Center TechFides logo ([6592535](https://github.com/TechFides/tf-doc-vault/commit/6592535))
- Redesign README hero for stronger brand presentation ([59cd783](https://github.com/TechFides/tf-doc-vault/commit/59cd783))

### 🏡 Chore

- Update node engine in package.json ([c78f0ff](https://github.com/TechFides/tf-doc-vault/commit/c78f0ff))

### 🤖 CI

- Add smoke job that builds template-tech-docs against the packed artifact ([4dc62dc](https://github.com/TechFides/tf-doc-vault/commit/4dc62dc))

### ❤️ Contributors

- Michal Vlček <michal.vlcek@techfides.cz>
- Filip.koukal <filip.koukal@techfides.cz>

## v0.1.4

[compare changes](https://github.com/TechFides/tf-doc-vault/compare/v0.1.3...v0.1.4)

### 🩹 Fixes

- **tooling:** Make lint and format-check pass on master - Add root .prettierignore excluding template/ and template-tech-docs/.   These directories carry a consumer-facing .prettierrc that imports   @techfides/tf-doc-vault/prettier — that self-reference cannot resolve   when prettier runs from inside this repo's source tree. - Point the lint script at configs/eslint.config.js explicitly (ESLint 9   requires the config in repo root or via --config) and ignore src/setup/**,   which is excluded from tsconfig.json and breaks the project-aware parser. - Reformat 25 source files to match the existing Prettier config (no   semantic changes — only line wrapping and trailing commas). ([17b1ccf](https://github.com/TechFides/tf-doc-vault/commit/17b1ccf))

### 📖 Documentation

- Add readme badges, package.json metadata, English description ([d9b80b6](https://github.com/TechFides/tf-doc-vault/commit/d9b80b6))

### 🏡 Chore

- Add renovate config using config:best-practices ([f142010](https://github.com/TechFides/tf-doc-vault/commit/f142010))
- Add commitlint and husky to enforce conventional commits ([44b0f09](https://github.com/TechFides/tf-doc-vault/commit/44b0f09))
- Add CODEOWNERS ([f97f8b3](https://github.com/TechFides/tf-doc-vault/commit/f97f8b3))

### 🤖 CI

- Add lint, format-check, typecheck and build workflow Runs on every pull request and on push to master. Sequential job: format:check -> lint -> typecheck -> build. Concurrency group cancels in-flight runs on new commits to the same PR (master pushes are not cancelled). After this lands, require the "🔍 Verify" status check on the master branch ruleset so PRs cannot merge red. ([1543011](https://github.com/TechFides/tf-doc-vault/commit/1543011))
- Add tf-licence-checker for dependency license validation ([f5eb607](https://github.com/TechFides/tf-doc-vault/commit/f5eb607))

### ❤️ Contributors

- Filip.koukal <filip.koukal@techfides.cz>

## v0.1.3

[compare changes](https://github.com/techfides/tf-doc-vault/compare/v0.1.1...v0.1.3)

### 🏡 Chore

- Update and tighten package publishing workflow ([f37b2ed](https://github.com/techfides/tf-doc-vault/commit/f37b2ed))

### ❤️ Contributors

- Filip.koukal <filip.koukal@techfides.cz>

## v0.1.2

- **`create-ana --no-git`** — embedded mode for analysis docs that live inside an existing service or project repo. All infrastructure (Dockerfile, CI, Terraform) is still generated; only `git init` is skipped. The success message adapts to show how to commit to the parent repo and how to deploy independently. Documented in README with a child pipeline CI/CD integration snippet.
- **`import-confluence --output` is now required** — previously defaulted to `./tech-docs/docs/v1`, which silently wrote to the wrong place in non-tech-docs projects. Validation added; help text and all documentation updated.
- **README translated to English** and significantly restructured: options tables for `init-tech-docs` and `import-confluence`, "Updating documentation" subsections in both the tech-docs and analysis docs sections, clearer two-use-case structure for analysis documentation.

## v0.1.0 (tf-doc-vault)

- **Rename:** `@techfides/ana-docs` → `@techfides/tf-doc-vault`, CLI `ana-docs` → `tf-doc-vault`. Published publicly to npmjs.com (GitHub Actions workflow on
  `v*` tag).
- **Tech-docs use case:** `init-tech-docs` subcommand, `setupTechDocs()` Express/NestJS middleware, `template-tech-docs/` scaffold, Docker fragment [
  `template-tech-docs/docs-build-stage.md`](template-tech-docs/docs-build-stage.md).
- **`import-confluence`:** imports page trees from Confluence (ADF → Markdown, attachments, inter-page links).
- **`--root=<dir>` flag:** `validate`, `normalize` and `fix` support an optional root directory (default: `docs`).
- **Version dropdown:** hidden when there is only one documentation version.

## v0.1.8

- **Sync preserves `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`.** The template `.gitlab-ci.yml` previously had static `BASIC_AUTH_USER: ""` / `BASIC_AUTH_PASS: ""` —
  `pnpm sync:apply` would overwrite consumer-side credentials with empty strings. Switched to placeholders `__BASIC_AUTH_USER__` / `__BASIC_AUTH_PASS__`;
  `detectPlaceholders()` reads them from the consumer-side `.gitlab-ci.yml`, so sync preserves whatever the user has set. A fresh scaffold gets empty strings (
  same behaviour as before).

## v0.1.7

- **`serve` runtime removed.** The multi-stage Dockerfile had three runtime variants (`serve` / `nginx` / `nginx-auth`); `serve` was dead code — local dev runs
  via Vite (`pnpm docs:dev`, not Docker), and production always wants nginx for the auth path. Only `nginx | nginx-auth` remain. The `--server` scaffolder flag
  only accepts these two values (default `nginx`); existing projects with `SERVER_TYPE=serve` must switch to `nginx` in `Dockerfile` and `.gitlab-ci.yml`.

## v0.1.6

- **Sync — fix `.gitignore` / `.npmrc` mapping.** `template/_gitignore` and `template/_npmrc` are prefixed with `_` to survive npm pack stripping; `sync` was
  looking for `.gitignore` / `.npmrc` and silently skipping them. Added a mapping (`templateNameFor`), so drift in dotfiles is now detected.

## v0.1.5

- **`terraform.tfvars` in git** — the `_gitignore` template no longer ignores `infra/terraform.tfvars`. The file is small and stable (project_id, region,
  service_name) and belongs in the repo. Existing projects: `pnpm sync:apply` will update `.gitignore`, then `git add infra/terraform.tfvars && git commit`.

## v0.1.4

- **Terraform tfstate in GCS** — `template/infra/main.tf` has a `backend "gcs"` block with bucket `<gcp-project>-tfstate` and prefix `docs-web`. Bootstrapping
  the bucket is a one-time step via `gcloud storage buckets create` before the first `terraform init` (see `template/README.md`). For existing projects: create
  the bucket, add the backend block, run `terraform init -migrate-state`, and delete local `terraform.tfstate*` files from git.

## v0.1.3

- **Scaffolder — `--source=git` as default.** The `--source=npm` and `--source=workspace` options were removed (npm publish is not planned). Valid values:
  `git` | `file` (`--dev` shortcut remains).
- **Auth for `nginx-auth`** — `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` are stored in the top-level `variables:` block of `.gitlab-ci.yml` (not in GitLab CI/CD
  Variables). The template has empty placeholders; CI conditionally passes them to `docker build` only when non-empty.
- **README** — the "Scaffolder options" section consolidated into a single table describing all options (including runtime variants for `--server`). New
  sections: "Auth for `nginx-auth`", "Push to GitLab" (push-to-create flow), "Switching an existing project from `nginx` to `nginx-auth`".

## v0.1.2

- **New CLI subcommands** — `gen-diagrams`, `gen-wireframes`, `replace-wireframes` (ported from `lapa_ana/scripts`). Scripts write to
  `<cwd>/docs/public/images/...` and read `<cwd>/docs/v1/index.md`.
- **Build supports `.cjs`** — `scripts/build.mjs` copies `.cjs` files from `src/` to `dist/`.
- **Template — `.prettierignore`** — now includes `pnpm-lock.yaml` and other generated files; `format:check` would otherwise complain about the lockfile. The
  file is in `TRACKED_FILES` in `sync-template`, so existing projects pick it up via `tf-doc-vault sync --apply`.

## v0.1.1

- **CI/Docker fixes in template** — `pnpm install` in the Docker builder now works with `git+ssh` dependencies: the token is passed via
  `--build-arg GITLAB_CI_TOKEN`, the SSH URL is rewritten to HTTPS with `gitlab-ci-token` inside the builder, and `/root/.gitconfig` is deleted after install (
  token doesn't leak into image layers). The builder image got `ca-certificates`, otherwise HTTPS cloning fails with `server certificate verification failed`.
- **CI shell** — the `📦 install` job has `git config insteadOf` in `before_script`, so pnpm git fetch works outside Docker too.
- **Prettier** — template ignores `.pnpm-store/`, otherwise `format:check` complains about pnpm cache contents in CI.
- **TypeScript** — template includes `docs/.vitepress/theme/shims.d.ts` with `declare module "*.css";`, otherwise `tsc` fails with
  `TS2882: Cannot find module ... ./custom.css` when using `module: NodeNext`.
- **CI prerequisite**: the source repo (`techfides/tf-analysis/tf-doc-vault`) must have the consumer project allowed in Settings → CI/CD → Token Access —
  otherwise `CI_JOB_TOKEN` lacks permission to clone.

## v0.1.0

- Initial release.
