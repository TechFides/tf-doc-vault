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
standalone portal. The scaffold is a whole repository, complete with its own
`package.json` and `pnpm-workspace.yaml`, which is why every `host:` step is
off: there is no host repo to integrate with.

The `repo` default carries the analysis group these repositories live in, so the
edit link in `docs/.vitepress/config.ts` arrives pre-filled.
