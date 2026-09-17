[← All guides](./README.md)

# Editing &amp; publishing docs

The day-to-day loop for working on an existing documentation site, whether it's a [tech-docs](./tech-docs.md) tree or an [ana-docs](./ana-docs.md) repo.

To edit an existing document, open the relevant `.md` file under `docs/` and make your changes.
Update the `updated_at` field in the frontmatter to today's date:

```yaml
---
title: My page
status: published
updated_at: 2026-05-12
order: 3
---
```

## Sidebar and nav order

The `order` field in frontmatter is the sort key for the sidebar, the top nav and the print page, within a folder:

1. `index.md` is always first and does not compete for a position.
2. Items with a valid `order` (an integer) come next, ascending.
3. Everything else follows, alphabetically.
4. A page's key is its own `order`; a subfolder's key comes from its `index.md`. Files and subfolders in the same folder share one number space, so a page and a subfolder there cannot both be `order: 2`.

Two siblings with the same `order` fall back to `localeCompare(name, "cs")` between them, so the rendered order stays deterministic; `docs:validate` still reports the duplicate as an error.

A missing or non-integer `order` does not break the sidebar, it just sorts to the alphabetical tail, but `docs:validate` reports it as an error. `order` is required on every page inside a version folder; a file sitting directly in `docs/` (including `docs/index.md`) and each version's own `index.md` are exempt, since neither is part of a sibling set that anything sorts.

**Preview locally** while editing:

```bash
npm run docs:dev   # http://localhost:5173/tech-docs/
```

VitePress reloads automatically on file save, no restart needed.

**Before committing**, optionally validate and auto-fix common issues:

```bash
npm run docs:validate   # check frontmatter, links, images, markdown lint
npm run docs:fix        # auto-fix line endings, normalize frontmatter, run linter
```

**Publish changes** by committing and pushing to git:

```bash
git add tech-docs/
git commit -m "docs: update <page name>"
git push
```

The CI pipeline rebuilds the docs image and deploys the updated documentation automatically.
