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
---
```

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
