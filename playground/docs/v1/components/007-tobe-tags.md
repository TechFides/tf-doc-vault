---
title: TO-BE tags
status: published
updated_at: 2026-08-13
---

Tagging for planned, not-yet-deployed changes in a functional specification,
rendered by the package's own markdown-it rules (`src/config/toBeTags.ts`,
enabled by the `toBeTags` option on `makeConfig`). `ADD` marks content that will
appear, `DEL` content that will be removed. The ticket number links to the issue
tracker.

The ticket is taken verbatim, so any tracker's format works. It has to be one
whitespace-free token, which is what marks the end of the marker.

## Inline form

Use it inside a paragraph, including mid-sentence.

The page is skipped when the entry point is passed explicitly {ADD DOC-9693}and
the client is redirected to the business category page{/ADD}.

{DEL DOC-9694}This whole paragraph is scheduled for removal, so it renders struck
through in grey.{/DEL}

A tag can contain **bold**, `code` and [links](https://example.com):
{ADD DOC-1}text with **emphasis** and an `identifier` inside{/ADD}.

## Block form

For anything spanning more than one paragraph, wrap whole blocks. Headings,
lists and tables keep working inside.

::: add DOC-9700

### A newly added section

- first point
- second point

| Field          | Type      | Required |
| -------------- | --------- | -------- |
| `applLoanType` | `string`  | yes      |
| `smeSelected`  | `boolean` | no       |

A closing paragraph.
:::

::: del DOC-9701

### A section being removed

Everything inside renders struck through, headings and tables included.
:::

## Unpaired markers degrade to text

An opener with no closer renders literally rather than bleeding colour into the
rest of the page, which makes the mistake visible to the author:

{ADD DOC-1}this opener is never closed, so the braces stay visible

Ordinary braces are untouched, so JSON and template placeholders are safe:
`{ "key": "value" }` and {something else}.
