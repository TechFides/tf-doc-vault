---
name: tech-docs
label: Technical documentation inside an existing service repo
target:
  mode: subfolder
  path: tech-docs
base: /tech-docs/
sectionNav: false
fields: [service-id, project, repo, deploy-files]
defaults:
  deploy-files: false
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
deployFiles:
  - Dockerfile
  - docker
  - .gitlab-ci.yml
  - infra
renames:
  docs/.vitepress/config.ts: docs/.vitepress/config.mts
host:
  packageJsonScripts: true
  gitignore: true
  minimalPackageJson: true
git:
  init: false
lockfile: false
workspaceWarning: false
---

Documentation of one service, living in a subfolder of that service's
repository. The host repo keeps its own tooling and dependencies, so the
boilerplate configs are excluded and only the `docs:*` scripts are merged into
the host `package.json`.

`config.ts` is renamed to `config.mts` so that esbuild treats the file as ESM,
which it has to be to import from the ESM-only `@techfides/tf-doc-vault`.
