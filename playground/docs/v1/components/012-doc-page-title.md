---
title: DocPageTitle
status: published
updated_at: 2026-08-13
order: 13
---

The `DocPageTitle` heading is the one at the top of this page. It renders the page title from
frontmatter as the document's `h1`, mounted with `DocMeta` into the `doc-before` slot, so
every page gets a heading without an author writing one.

That is why the Markdown here starts at `##`. Opening a page with `#` as well would give it
two `h1`s.

## When it stays quiet

It renders nothing in two cases:

| Condition                   | Why                                                            |
| --------------------------- | -------------------------------------------------------------- |
| The page has a `hero` block | `BrandHero` is carrying the title already.                     |
| The page sets `hideTitle`   | You want to open the page with something other than a heading. |

```md
---
title: Not shown as a heading
hideTitle: true
---
```

Both flags only suppress the heading. The title still reaches the browser tab, the sidebar
and the search index, because those read frontmatter rather than the rendered page.

## Where the styling lives

The heading is a plain `h1.doc-page-title`, so it picks up the same type scale and the same
accent hairline as any `h1` in the content. See
[Every element](../showcase/001-elements) for the whole scale in one place.
