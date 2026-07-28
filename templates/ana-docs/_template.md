---
name: ana-docs
label: Analysis documentation portal in its own repository
target:
  mode: new-folder
base: /
sectionNav: true
fields: [name, gcp-project, server, source, section-nav, base, repo, git]
defaults:
  repo: techfides/tf-analysis/__PROJECT__
exclude: []
host:
  packageJsonScripts: false
  devDependencies: false
  gitignore: false
  minimalPackageJson: false
  pnpmWorkspace: false
git:
  init: true
lockfile: true
workspaceWarning: true
---

Business, functional and technical specification of a project, served as a
standalone portal. The scaffold is a whole repository: documentation sources,
VitePress setup, Dockerfile, CI pipeline and Terraform, so nothing from the
boilerplate is excluded. It arrives with its own complete `package.json` and
`pnpm-workspace.yaml`, which is why every `host:` step is off.

The `repo` default carries the analysis group these repositories live in, so the
edit link in `docs/.vitepress/config.ts` arrives pre-filled.
