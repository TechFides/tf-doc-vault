---
title: Colors
status: published
updated_at: 2026-05-22
---

# Colors

Source priority:

1. **Original CSO spec** (Google Doc kap. 3.2) — wins where defined.
2. **David's DS** (`01-tokens.md`, `DESIGN.md`) — fills the gaps.

## Brand palette (CSO spec)

| Token                    | Hex       | Role                                    |
| ------------------------ | --------- | --------------------------------------- |
| `--tf-primary`           | `#0074c8` | Active items, CTAs, links, focus        |
| `--tf-secondary`         | `#00a0e3` | Icons, decoration, hover on dark        |
| `--tf-navy`              | `#092646` | Dark mode, hero, footer                 |
| `--tf-nav-navy`          | `#082850` | Text, sidebar in dark mode              |
| `--tf-surface`           | `#f5f7fa` | Section background, tables, cards       |

## Interaction states (David's DS)

| Token                    | Hex       | Use                              |
| ------------------------ | --------- | -------------------------------- |
| `--tf-primary-hover`     | `#0f75c5` | CTA hover                        |
| `--tf-primary-active`    | `#092646` | Active / pressed link            |

## Status (David's DS)

| Token            | Hex       |
| ---------------- | --------- |
| `--tf-success`   | `#00dd0a` |
| `--tf-warning`   | `#e08800` |
| `--tf-danger`    | `#c8232c` |
| `--tf-info`      | `#0074c8` |

## WCAG note

Body text uses `#333333` (David's "Charcoal") instead of `#7E8890`
(David's "Slate") — the latter only hits 3.58:1 against white,
the CSO spec requires WCAG AA ≥ 4.5:1.
