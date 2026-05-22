---
title: Spacing
status: draft
updated_at: 2026-05-22
---

# Spacing

Strict **8-point grid** per the CSO spec. David's DS uses a wider
4-point base — for this project, the CSO spec wins.

## Scale

| Token         | Value | Use                             |
| ------------- | ----- | ------------------------------- |
| _(half-step)_ | 4 px  | Inline gap (badge + icon)       |
| `space-2`     | 8 px  | Form field gap inside a label   |
| `space-4`     | 16 px | Card padding (mobile), gaps     |
| `space-6`     | 24 px | Card padding (desktop), gutters |
| `space-8`     | 32 px | Section gaps inside a page      |
| `space-10`    | 40 px | Major section breaks            |
| `space-12`    | 48 px | Hero / footer padding (mobile)  |
| `space-16`    | 64 px | Hero / footer padding (desktop) |

## Whitespace rule

If the layout feels cramped, the **first thing to grow** is card
padding or section gap — never the font size.
