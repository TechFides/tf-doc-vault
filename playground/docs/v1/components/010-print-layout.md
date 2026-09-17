---
title: PrintLayout
status: published
updated_at: 2026-08-13
order: 11
---

The layout the print and PDF export renders into. Not a component you drop into a page: it
is a VitePress layout, chosen by frontmatter, and it wraps the page's own content in a
header carrying the site title.

There is no live example on this page on purpose. `PrintLayout` renders `<Content />`, so
placing it inside a page's content would nest that page inside itself.

## What it renders

```
print-layout
├── print-header      site title
└── print-content     <Content />
```

That is the whole structure. The styling that makes it a printable document, page breaks,
the flattened panel, hidden chrome, lives in `theme/styles/print.css`, which the theme
imports first so the screen rules can override it.

## How you get it

`src/scripts/build-print-page.ts` generates one Markdown file that concatenates every page
in the docs tree and opens it with:

```md
---
title: Dokumentace (kompletní výstup)
layout: PrintLayout
---
```

So you never write the layout yourself. Run the script, or the PDF export that calls it, and
it produces the page that uses it. The generated file also carries a table of contents and
the page count.

To use the layout by hand on a single page, set the same frontmatter key:

```md
---
layout: PrintLayout
---
```

## Why a layout and not a component

A print sheet is not a document with extra styling: it has no sidebar, no outline, no
navbar, and its content is one continuous flow rather than a route. Replacing the layout is
how VitePress expresses that, and it keeps the print rules out of every screen page.
