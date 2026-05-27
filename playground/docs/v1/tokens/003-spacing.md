---
title: Spacing
status: draft
updated_at: 2026-05-22
---

# Spacing

Layout follows an **8-point grid** — paddings, gaps and margins are
multiples of 8px (with an occasional 4px half-step for tight inline gaps
like a badge next to its icon).

## Layout tokens

These are the spacing-related CSS custom properties the theme actually
exposes (in `base.css`). Override them in your `custom.css`:

| Token                        | Value  | Use                                 |
| ---------------------------- | ------ | ----------------------------------- |
| `--layout-side-padding-sm`   | 24 px  | Hero / footer side padding (small)  |
| `--layout-side-padding-md`   | 48 px  | Hero / footer side padding (medium) |
| `--layout-side-padding-lg`   | 64 px  | Hero / footer side padding (large)  |
| `--layout-max-width-narrow`  | 800 px | Hero inner width                    |
| `--layout-max-width-content` | 1440px | Default content max width           |
| `--layout-max-width-wide`    | 1800px | `html.layout-wide` mode             |

## Whitespace rule

If the layout feels cramped, the **first thing to grow** is card
padding or section gap — never the font size.
