---
title: Components
order: 1
---

Everything the shared theme gives you: the Vue components, the CSS classes you write in
Markdown, the icons and the rest of the export surface. Most of the components you never
write, because the theme mounts them into VitePress' layout slots, and they are listed so you
can see what is already working for you.

| Beyond the components                    | What is in it                                   |
| ---------------------------------------- | ----------------------------------------------- |
| [Pattern classes](./016-pattern-classes) | The `tf-*` classes and `data-tf-*` attributes.  |
| [Icons](./017-icons)                     | The 47 icon-font glyphs and the five SVG marks. |
| [Exports](./018-exports)                 | `createTheme` options, `useScrollSpy`, `i18n`.  |

## You place these

Registered globally by `createTheme()`, so Markdown can use them with no import.

| Component                  | What it is                                                               | Page                                  |
| -------------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| `BrandHero`                | Landing banner. Renders only on a page with a `hero` frontmatter block.  | [BrandHero](./006-brand-hero)         |
| `FeatureCards`             | The row of cards on a landing page, driven by `features` frontmatter.    | [FeatureCards](./009-feature-cards)   |
| `Spotlight`                | A centred panel that sends the reader out of the document to one thing.  | [Spotlight](./007-spotlight)          |
| `AuthorCard`               | Who stands behind the document: name, role, and the record behind them.  | [AuthorCard](./008-author-card)       |
| `StepCard`                 | One numbered point of a method: a claim, its checks, and its terms.      | [StepCard](./019-step-card)           |
| `ReferenceCard`            | One delivered project: the client, the work, and who vouches for it.     | [ReferenceCard](./020-reference-card) |
| `Timeline`, `TimelineItem` | A dated sequence: how something got here, newest first.                  | [Timeline](./021-timeline)            |
| `PrintLayout`              | The layout the print and PDF export renders into, chosen by frontmatter. | [PrintLayout](./010-print-layout)     |

## The theme mounts these

Nothing to write. They arrive with `createTheme()` and hang off VitePress' layout slots.

| Component             | What it does                                                                            | Page                                  |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| `PageBackdrop`        | The nebula and star field behind the site. Off with `createTheme({ backdrop: false })`. | [PageBackdrop](./011-page-backdrop)   |
| `DocMeta`             | Status badge, updated date and author line above the title.                             | [DocMeta](./001-doc-meta)             |
| `DocPageTitle`        | The page title, unless the page has a `hero` or sets `hideTitle`.                       | [DocPageTitle](./012-doc-page-title)  |
| `ImageLightbox`       | Click an image in the content to open it full size.                                     | [ImageLightbox](./002-image-lightbox) |
| `TableEnhancer`       | Sortable columns, column type detection, unbreakable single-token columns.              | [Tables](../tokens/007-tables)        |
| `SidebarDefaultEmoji` | Aligns sidebar labels by hoisting a leading emoji into the marker slot.                 | [Emoji](../tokens/008-emoji)          |
| `BrandFooter`         | The footer, only when `branding.footer` is configured.                                  | [BrandFooter](./013-brand-footer)     |
| `NotFound`            | The 404 page.                                                                           | [NotFound](./014-not-found)           |

## You opt into this one

| Component     | How                                  | Page                              |
| ------------- | ------------------------------------ | --------------------------------- |
| `WidthToggle` | `createTheme({ widthToggle: true })` | [WidthToggle](./003-width-toggle) |

## Shipped but not wired

| Component         | State                                                                | Page                                      |
| ----------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `VersionSwitcher` | Complete, registered nowhere, and not reachable through the exports. | [VersionSwitcher](./015-version-switcher) |

`makeConfig()` already puts a version dropdown in the navbar for a multi-version site, so
this is a second implementation of a solved problem. Nothing is being deleted, though; its
page has the detail and what wiring it would take.

## Not components

Two pages in this section demonstrate Markdown features rather than Vue components, because
this is where you would look for them:

- [Diagrams](./004-diagrams), Mermaid rendering and its theming.
- [Task lists](./005-task-lists), checkbox lists and their styling.
