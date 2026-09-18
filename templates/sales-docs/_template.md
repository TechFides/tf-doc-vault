---
name: sales-docs
label: Sales offer portal, one folder inside the offers monorepo
target:
  mode: new-folder
base: /
sectionNav: false
fields: [name, source, section-nav, base, repo, repo-subdir, git, analytics]
defaults:
  repo: TechFides/tf-sales-private-offers
  git: false
exclude: []
host:
  packageJsonScripts: false
  devDependencies: false
  gitignore: false
  minimalPackageJson: false
  pnpmWorkspace: false
git:
  init: false
lockfile: true
workspaceWarning: true
skillsBundle: docs
---

A commercial offer for one customer, served as its own portal from one folder
of the `tf-sales-private-offers` monorepo: one folder, one VitePress site, one
Vercel project. The scaffold is a complete standalone project, so every `host:`
step is off, exactly as for `ana-docs`.

What differs from `ana-docs` are the defaults an offer always wants. `git` is
off: the folder lives inside a repository that already exists, and `git init`
in a subfolder would nest one. `sectionNav` is off: offers navigate through the
sidebar only. `repo` points at the monorepo, so the edit link is right without
a flag.

The skills are the same `docs` bundle as `ana-docs`. In the library's v2 set,
"commercial offer" is a setting in the `docs/README.md` contract that the
`docs-workflow` skill asks about on first use, not a different set of skills.
