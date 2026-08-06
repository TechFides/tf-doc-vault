---
name: tech-docs
label: Technical documentation inside an existing service repo
target:
  mode: subfolder
  path: tech-docs
base: /tech-docs/
sectionNav: false
fields: [service-id, project, section-nav, base, repo, source]
defaults:
  repo: TechFides/__PROJECT_DASHED__
exclude:
  - README.md
  - eslint.config.js
  - _tsconfig.json
  - .prettierrc
  - .prettierignore
  - _gitignore
  - _pnpm-workspace.yaml
  - package.json
  - .claude
  - vercel.json
  - middleware.ts
  - .github
renames:
  docs/.vitepress/config.ts: docs/.vitepress/config.mts
host:
  packageJsonScripts: true
  devDependencies: true
  gitignore: true
  minimalPackageJson: true
  pnpmWorkspace: true
git:
  init: false
lockfile: false
workspaceWarning: false
---

Documentation of one service, living in a subfolder of that service's
repository. The host repo keeps its own tooling, so the boilerplate configs are
excluded and the host `package.json` receives only the `docs:*` scripts and the
documentation dependencies it does not declare yet.

A host repo owns its own workspace file, so `_pnpm-workspace.yaml` is excluded
and `host.pnpmWorkspace` merges the pnpm settings into the host's file instead.
Without the hoist patterns in there, `docs:dev` serves a blank page.

The deploy files (`vercel.json`, `middleware.ts`, `.github/`) assume a
standalone repository, and a workflow inside a subfolder is never read by
GitHub (it only reads `.github/workflows/` at the repo root), so the service
repo owns publishing its own documentation.

`config.ts` is renamed to `config.mts` so that esbuild treats the file as ESM,
which it has to be to import from the ESM-only `@techfides/tf-doc-vault`.
