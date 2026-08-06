---
name: ana-docs
label: Analysis documentation portal in its own repository
target:
  mode: new-folder
base: /
sectionNav: true
fields: [name, source, section-nav, base, repo, repo-subdir, git, analytics]
defaults:
  repo: TechFides/__PROJECT__
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

The `repo` default carries the `TechFides` GitHub org, so the edit link in
`docs/.vitepress/config.ts` arrives pre-filled. When the target folder already
sits inside a git repository (the "one folder per offer" monorepo use case),
`repo` and `repo-subdir` are instead derived from that repo's own `origin`
remote and the folder's path within it, and `git` defaults off: scaffolding a
second offer must not nest a repository inside the one it already lives in.
