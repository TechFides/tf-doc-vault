# Unversioned layout

## Goal

A project can keep its pages directly in `docs/<section>/…` instead of
`docs/<version>/<section>/…`. The use case is a repo whose `docs/` tree predates
the site and is read by other tools (an XWiki sync, links from other repos), so
moving everything under `docs/v1/` is not an option.

## Switch

`versioned: false` in `tf-doc-vault.json`, in the project root (the parent of
the docs root):

```json
{ "versioned": false }
```

Missing file or missing key keeps today's versioned layout, so the change is
opt-in and ships as a minor release. A value other than a boolean fails loudly.
A key other than `pdf` or `versioned` prints a warning that names it: a misspelt
`Versioned` is visible, while a file carrying `$schema` or a note keeps building.

The file is the only place the setting lives. `validate`, `normalize` and
`print` run as separate Node processes that never load the VitePress config, and
`tf-doc-vault.json` is already the channel the PDF branding uses for exactly that
reason. A `makeConfig` option plus a CLI flag would be two switches that can
disagree, and a forgotten flag fails silently (sections sorted alphabetically in
the PDF, `order` not checked on sections).

## Behaviour

`docs/` plays the role a version folder plays in the versioned layout:

|                            | versioned                                                 | unversioned                                      |
| -------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| section URL                | `/v1/process/`                                            | `/process/`                                      |
| navbar                     | sections of `docs/v1/`, version dropdown with 2+ versions | sections of `docs/`                              |
| sidebar keys               | `/v1/`, `/v1/<section>/`                                  | `/`, `/<section>/`                               |
| head of the sidebar / PDF  | `docs/v1/index.md`                                        | `docs/index.md`                                  |
| `order` required           | below `docs/<version>/`, except its `index.md`            | everywhere below `docs/`, except `docs/index.md` |
| section without `index.md` | reported from `docs/<version>/<section>/` down            | reported from `docs/<section>/` down             |

`print.md` is generated into `docs/` in both layouts. In the unversioned layout
that is inside the walked tree, so the sidebar, `normalize`, `print` and
`validate` skip `docs/print.md`. A page named `print.md` inside a section stays
a page and is validated.

A folder that holds no pages (`docs/images/`, `docs/attachments/`) is not a
section: the nav, the sidebar, the PDF and `normalize` all skip it, as
`validate` already did. Legacy trees keep such folders next to their pages, and
counting one as a section would add a navbar link to a 404 and switch the
sidebar to per-section mode.

## Out of scope

- The setup wizard keeps scaffolding `docs/v1/`. A project switches by adding
  the file and moving its pages.
- The Confluence importer needs no change: it resolves links against the docs
  root, whatever sits under it.
- `VersionSwitcher` stays unregistered.
