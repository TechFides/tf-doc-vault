---
title: Sidebar generator
status: published
updated_at: 2026-05-22
---

`generateSidebar()` and `generateNav()` walk the `docs/<version>/`
tree and produce the VitePress sidebar / nav structures automatically.
No manual config needed — file system layout is the source of truth.

## Layout

```
docs/
  v1/
    index.md                  ← v1 overview (root)
    components/               ← section (top nav item)
      index.md                ← section title + group landing
      001-doc-meta.md         ← page (numeric prefix = order)
      002-image-lightbox.md
    tokens/
      index.md
      001-colors.md
      002-typography.md
```

## Ordering

- `index.md` always comes first inside its folder.
- Other files sort by their filename (Czech-locale aware).
- Use `001-`, `002-` prefixes for explicit order.
- `order:` in frontmatter applies to section/group `index.md` files.

## Section title

The section's top-nav label is read from `<section>/index.md`'s
frontmatter `title:`. Same for groups (`<group>/index.md`).
