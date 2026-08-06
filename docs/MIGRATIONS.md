# Migrations

Breaking-change guides for major package versions. Each is self-contained; skip straight to the version you are upgrading past.

## Migration to 0.3

Version 0.3.0 removes the Express/NestJS tech-docs mount and replaces `create-ana` and `init-tech-docs` with a single interactive `setup` wizard. This is a breaking change, but it is **not forced**: scaffolded repos pin an exact version, and a service repo that keeps its docs inside itself typically depends on `@techfides/tf-doc-vault` with a caret range, which under `0.x` semver rules does not include `0.3.0`. Nothing pulls an existing repo onto `0.3.0` automatically; `0.2.x` keeps working until someone raises the pinned version by hand. Plan and communicate the transition outside the package; the build only breaks once someone does that.

**`setupTechDocs()` and `createTechDocsHandler()` are gone.** Remove the `@techfides/tf-doc-vault/setup/express` or `/setup/nest` import and the call from `main.ts`, stop setting `TECH_DOCS_PASSWORD`, and drop the docs-build Dockerfile stage.

**Documentation inside a service repo has no deploy story in this package.** The scaffold writes the Markdown sources and the VitePress setup, merges the `docs:*` scripts plus the documentation dependencies into the host `package.json`, and merges the pnpm settings the site needs (Mermaid's hoist patterns, `allowBuilds`) into the host `pnpm-workspace.yaml`; after `pnpm install`, `docs:build` produces a static site in `tech-docs/docs/.vitepress/dist`. Publishing that output is the host repo's own pipeline. The base path baked into the build is `/tech-docs/` by default and configurable with `--base`, so it can match wherever the host serves the site from. To deploy documentation as a standalone portal with its own image, pipeline and Terraform, use the `ana-docs` template instead.

**CLI:** the `create-ana` bin and the `create`/`init-tech-docs` subcommands are gone. Replace them:

- `create-ana <name> --gcp-project=X --server=Y --source=Z [--no-git]` → `tf-doc-vault setup <name> --template=ana-docs --gcp-project=X --server=Y --source=Z [--no-git]`
- `tf-doc-vault init-tech-docs --service-id=ID --project=P --repo=R` → `tf-doc-vault setup --template=tech-docs --service-id=ID --project=P --repo=R`

Without a TTY, `setup` never prompts: pass every required flag or it exits with an error listing what is missing. CI scripts that called `create-ana` or `init-tech-docs` need to switch to the flag form above; the `pnpm dlx @techfides/tf-doc-vault@latest create ...` command documented previously no longer works once `0.3.0` is published under `@latest`.

**Subpath exports:** `./template` and `./template-tech-docs` are replaced by the wildcard exports `./boilerplate/*` and `./templates/*`. The old bare-directory exports never resolved anything, so nothing that worked before stops working.

**`peerDependencies` no longer list `express` or `@nestjs/common`.**

**Existing scaffolded repos keep working.** The scaffold is one-shot: a generated repo's `.gitlab-ci.yml` calls only subcommands that still exist (`docs:validate`, `docs:print`, `docs:build`), and `tf-doc-vault sync` is a manual script, not a CI job. After the upgrade, `sync` compares against `boilerplate/` with the same tracked file set, except a missing counterpart is now reported as an error instead of silently marked "ok".

**New scaffolds no longer copy `.claude/settings.local.json`.**

**Adding a template needs no code change:** drop a folder under `templates/<name>/` with a `_template.md` manifest and Markdown content; `tf-doc-vault setup` lists it automatically.

## Migration to 0.4

Version 0.4.0 removes the GitLab/GCP deploy stack from `boilerplate/` (`.gitlab-ci.yml`, `Dockerfile`, `docker/`, `infra/`) and replaces it with GitHub
Actions + Vercel: a generic `.github/workflows/ci.yml`, `vercel.json`, and a Basic-auth `middleware.ts` that runs on Vercel's edge. This is a breaking change
to the `ana-docs` template's wizard fields, but **existing scaffolded repos are untouched**: the scaffold is one-shot, nothing rewrites a repo's already-generated
files. A repo keeps its `.gitlab-ci.yml`/`Dockerfile`/`infra/` until someone rescaffolds it or runs `tf-doc-vault sync --apply` against the new boilerplate.

**Wizard fields removed:** `--gcp-project` and `--server` are gone (no Docker image, no GCP project to configure). **Added:** `--repo-subdir` (edit-link
subfolder prefix, auto-detected inside a monorepo) and `--analytics` (adds `@vercel/analytics`, off by default and traceless when off).

**Git detection.** Scaffolding an `ana-docs` folder that already sits inside a git repository (the "one folder per offer" monorepo pattern) now
auto-detects that: `git init` is skipped, and `--repo`/`--repo-subdir` default to the repo's own `origin` remote and the folder's path within it, instead of
the manifest's static default. `--no-git` still works as an explicit override.

**`makeConfig`'s `editLink.host` default changes from `https://gitlab.com` to `https://github.com`.** A GitLab consumer relying on the old default must now
pass `host: "https://gitlab.com"` explicitly. `EditLink` also gains an optional `path` field: a subfolder prefix for a docs site that lives inside a monorepo
rather than at its repo's root.

**`sync`'s tracked file set changes:** `Dockerfile`, `docker/nginx*.conf` and `infra/*.tf` are dropped; `vercel.json`, `middleware.ts` and
`.github/workflows/ci.yml` are added.
