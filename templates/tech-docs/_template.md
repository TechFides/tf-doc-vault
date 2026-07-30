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
  repo: techfides/__PROJECT_DASHED__
exclude:
  - README.md
  - eslint.config.js
  - tsconfig.json
  - .prettierrc
  - .prettierignore
  - _gitignore
  - _pnpm-workspace.yaml
  - package.json
  - .claude
  - Dockerfile
  - docker
  - .gitlab-ci.yml
  - infra
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
excluded; what the host `package.json` receives is the `docs:*` scripts and the
documentation dependencies it does not declare yet.

`_pnpm-workspace.yaml` is excluded for the same reason (a host repo owns its own
workspace file), so `host.pnpmWorkspace` merges the pnpm settings the site needs
into the host's file instead. Without the hoist patterns in there, `docs:dev`
serves a blank page.

The deploy files (`Dockerfile`, `docker/`, `.gitlab-ci.yml`, `infra/`) are
excluded as well: the service repo owns building and publishing its
documentation. Those files assume a standalone repository, and a `.gitlab-ci.yml`
inside a subfolder is never read by GitLab anyway.

`config.ts` is renamed to `config.mts` so that esbuild treats the file as ESM,
which it has to be to import from the ESM-only `@techfides/tf-doc-vault`.
