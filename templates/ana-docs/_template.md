---
name: ana-docs
label: Analysis documentation portal in its own repository
target:
  mode: new-folder
base: /
sectionNav: true
fields: [name, gcp-project, server, source, git]
exclude: []
host:
  packageJsonScripts: false
  gitignore: false
  minimalPackageJson: false
git:
  init: true
lockfile: true
workspaceWarning: true
---

Business, functional and technical specification of a project, served as a
standalone portal. The scaffold is a whole repository: documentation sources,
VitePress setup, Dockerfile, CI pipeline and Terraform, so nothing from the
boilerplate is excluded.
