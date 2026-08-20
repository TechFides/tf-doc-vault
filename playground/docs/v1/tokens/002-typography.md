---
title: Typography
status: published
updated_at: 2026-05-22
order: 2
---

## Family

The theme exposes two font-family tokens:

```css
--vp-font-family-base:
  "Open Sans", "Inter", "Noto Color Emoji", -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;

--vp-font-family-mono:
  ui-monospace, "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New",
  "Noto Color Emoji", monospace;
```

Open Sans and Noto Color Emoji are both loaded by default
(`branding.fonts: "google"`); switch to `"none"` and self-host to swap
them. Three weights are used: **400** (body), **500** (headings), **700**
(labels, buttons).

Noto Color Emoji sits behind the text fonts so that only emoji reach it,
and ahead of the system stack so the OS emoji font never wins. See
[Emoji](./008-emoji.md) for the catalogue and the reasoning.

## Scale

The theme applies this scale automatically to `.vp-doc` headings and body
text, so there are no per-size tokens to set. You just write Markdown:

| Element | Size  | Weight | Line-height |
| ------- | ----- | ------ | ----------- |
| H1      | 32 px | 500    | 1.25        |
| H2      | 24 px | 500    | _default_   |
| H3      | 20 px | 500    | _default_   |
| Body    | 16 px | 400    | 1.6         |
| Label   | 16 px | 700    | _default_   |

Letter-spacing stays at **0** everywhere. No tracking, no UPPERCASE
unless semantically justified (e.g. status badges).
