# Changelog

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
