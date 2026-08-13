---
title: Components
order: 1
---

Every Vue component the shared theme ships, and how you get it. Most of them you never
write: the theme mounts them into VitePress' layout slots, and they are here so you can see
what is already working for you. The handful you do place yourself are in the first table.

## You place these

Registered globally by `createTheme()`, so Markdown can use them with no import.

| Component      | What it is                                                              | Page                                |
| -------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| `BrandHero`    | Landing banner. Renders only on a page with a `hero` frontmatter block. | [BrandHero](./006-brand-hero)       |
| `FeatureCards` | The row of cards on a landing page, driven by `features` frontmatter.   | [FeatureCards](./009-feature-cards) |
| `Spotlight`    | A centred panel that sends the reader out of the document to one thing. | [Spotlight](./007-spotlight)        |
| `AuthorCard`   | Who stands behind the document: name, role, and the record behind them. | [AuthorCard](./008-author-card)     |
| `PrintLayout`  | Print header carrying the site title, for the PDF export.               | —                                   |

## The theme mounts these

Nothing to write. They arrive with `createTheme()` and hang off VitePress' layout slots.

| Component             | What it does                                                                            | Page                                  |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| `PageBackdrop`        | The nebula and star field behind the site. Off with `createTheme({ backdrop: false })`. | —                                     |
| `DocMeta`             | Status badge, updated date and author line above the title.                             | [DocMeta](./001-doc-meta)             |
| `DocPageTitle`        | The page title, unless the page has a `hero` or sets `hideTitle`.                       | —                                     |
| `ImageLightbox`       | Click an image in the content to open it full size.                                     | [ImageLightbox](./002-image-lightbox) |
| `TableEnhancer`       | Sortable columns, column type detection, unbreakable single-token columns.              | [Tables](../tokens/007-tables)        |
| `SidebarDefaultEmoji` | Aligns sidebar labels by hoisting a leading emoji into the marker slot.                 | [Emoji](../tokens/008-emoji)          |
| `BrandFooter`         | The footer, only when `branding.footer` is configured.                                  | —                                     |
| `NotFound`            | The 404 page.                                                                           | —                                     |

## You opt into this one

| Component     | How                                  | Page                              |
| ------------- | ------------------------------------ | --------------------------------- |
| `WidthToggle` | `createTheme({ widthToggle: true })` | [WidthToggle](./003-width-toggle) |

## Shipped but not wired

`VersionSwitcher` is in the package and complete: it reads `site.locales` and needs no
props. Nothing imports or registers it, though, so no site renders it today. `knip.json`
silences the unused-file warning for exactly this reason. Either wire it into the navbar the
way `WidthToggle` is wired, or drop it. Until then, treat it as unavailable.

## Not components

Two pages in this section demonstrate Markdown features rather than Vue components, because
this is where you would look for them:

- [Diagrams](./004-diagrams), Mermaid rendering and its theming.
- [Task lists](./005-task-lists), checkbox lists and their styling.
