---
title: Typography
status: published
updated_at: 2026-05-22
---

# Typography

Font family follows the CSO spec; weights and scale are David's DS.

## Family

```css
--vp-font-family-base: "Open Sans", "Inter", -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Loaded from Google Fonts with three weights: **400** (body),
**500** (headings), **700** (labels, buttons).

## Scale

| Element  | Size  | Weight | Line-height |
| -------- | ----- | ------ | ----------- |
| H1       | 32 px | 500    | 1.25        |
| H2       | 24 px | 500    | _default_   |
| H3       | 20 px | 500    | _default_   |
| Body     | 16 px | 400    | 1.6         |
| Label    | 16 px | 700    | _default_   |

Letter-spacing stays at **0** everywhere. No tracking, no UPPERCASE
unless semantically justified (e.g. status badges).
