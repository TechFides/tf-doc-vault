# Tech Docs — instructions for Claude Code / AI agents

This folder contains the technical documentation for the **__SERVICE_ID__** service of the **__PROJECT__** project.

## Structure

```
docs/
  v1/
    <section>/            # sidebar section (= Confluence page with children)
      index.md            # section description
      <group>/            # collapsible group (= nested page with children)
        index.md
        page.md
      list-page.md        # direct child of the section without children of its own
```

The sidebar is generated automatically from the directory structure. Sections without
subfolders list their files directly; sections with subfolders group them into
collapsible groups.

## Editing conventions

**Frontmatter** is required:

```yaml
---
title: Architecture
status: published   # published | draft | review | archived
updated_at: 2026-04-30
---
```

- Update `updated_at` on every content change (format `YYYY-MM-DD`).
- Use Mermaid in code blocks (` ```mermaid `) for diagrams.
- Store images in `tech-docs/docs/public/images/` and reference them absolutely as `/images/foo.png`.

## Rules for AI agents

- When editing any `.md` file, update its `updated_at` to today's date.
- When changing the structure (adding/removing files), update the links in `index.md`.
- Don't touch `docs/.vitepress/config.ts` without an explicit instruction — the sidebar is generated automatically.
- Run `pnpm docs:fix` before committing.

## Local preview

```bash
pnpm docs:dev   # http://localhost:5173
```

## Validation

```bash
pnpm docs:validate   # frontmatter, broken links, missing images, markdown lint
pnpm docs:fix        # LF normalization, frontmatter normalize, lint, validate
```

## Serving from the running service

The documentation is mounted in NestJS `main.ts` via `setupTechDocs(...)` at `/tech-docs`,
protected by Basic auth from the `TECH_DOCS_PASSWORD` env var. Available on non-prod
environments only.
