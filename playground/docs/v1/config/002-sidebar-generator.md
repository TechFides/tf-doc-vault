---
title: Sidebar generator
status: published
updated_at: 2026-05-22
---

`generateSidebar()` and `generateNav()` walk the `docs/<version>/`
tree and produce the VitePress sidebar / nav structures automatically.
No manual config needed; the file system layout is the source of truth.

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
- Everything else sorts by filename (Czech-locale aware), directories and
  files in one list.
- Use `001-`, `002-` prefixes for explicit order. They are the only
  ordering mechanism: the generator reads nothing from frontmatter except
  `title:`.

## Section title

The section's top-nav label is read from `<section>/index.md`'s
frontmatter `title:`. Same for groups (`<group>/index.md`).

## Groups and their icons

A **subdirectory** becomes a collapsible group (`collapsed: true`) and the
generator recurses into it; a `.md` file becomes a leaf. That is the whole
rule, and it is what drives the default sidebar markers: a square on a group, a
dot on a leaf, nothing when the `title:` already starts with an emoji.

[Nested group](./003-nested-group/) is the live example, two levels deep,
with one page overriding the default icon.
