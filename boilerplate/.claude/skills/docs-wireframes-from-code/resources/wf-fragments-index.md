# wf-fragments index

Mirror of `wf-fragments/` at repository root. This file is a **decision
matrix** (situation → fragment) plus a cache of fragment metadata; it is
kept in sync with `wf-fragments/README.md`, not a replacement for it.

## Source of truth

- The real fragments live in `wf-fragments/<name>.svg` at repo root.
- The canonical registry is `wf-fragments/README.md`. Whenever that file
  changes, this index must be updated in the same PR.
- If the real folder is missing (fresh repo), the wireframes skill asks
  the user to bootstrap it before generating any SVG.

## Decision matrix: situation → fragment

The table below maps **what you are drawing** to **which fragment to start
from**. Fragment names are conventional; the real names come from
`wf-fragments/README.md`; this table tracks the canonical shape.

| Situation                                | Fragment (suggested name) | Notes                                                              |
| ---------------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| Mobile shell, light theme                | `shell-mobile-light`      | Base canvas, status bar, safe area; compose child fragments inside |
| Mobile shell, dark theme                 | `shell-mobile-dark`       | Same structure as light, inverted palette                          |
| Desktop shell, light theme               | `shell-desktop-light`     | 1280×800 canvas, top bar, optional side nav                        |
| Desktop shell, dark theme                | `shell-desktop-dark`      | —                                                                  |
| Top bar with title and back arrow        | `header-back`             | Parametrized title via `<!-- title -->`                            |
| Top bar with title and right-side action | `header-action`           | Action icon via `<!-- action-icon -->`                             |
| Bottom tab bar (mobile)                  | `tab-bar`                 | Up to 5 tabs, active-tab index via `<!-- active -->`               |
| Side navigation (desktop)                | `side-nav`                | Collapsible; item list via repeated block                          |
| Primary action button                    | `btn-primary`             | Label via `<!-- label -->`                                         |
| Secondary / ghost button                 | `btn-secondary`           | —                                                                  |
| Destructive button                       | `btn-destructive`         | Red accent; label via `<!-- label -->`                             |
| Text input field                         | `input-text`              | Label + input + optional hint via placeholders                     |
| Password input field                     | `input-password`          | Masked; visibility toggle icon                                     |
| Date / time input                        | `input-datetime`          | —                                                                  |
| Select / dropdown                        | `input-select`            | Options list rendered as separate fragment when needed             |
| Checkbox row                             | `checkbox-row`            | Label via `<!-- label -->`                                         |
| Radio row                                | `radio-row`               | —                                                                  |
| Avatar, small (32×32)                    | `avatar-sm`               | Circular; see `avatar-rules.md`                                    |
| Avatar, medium (48×48)                   | `avatar-md`               | —                                                                  |
| Avatar, large (96×96)                    | `avatar-lg`               | Profile screens                                                    |
| Conversation / list row with avatar      | `row-conversation`        | Avatar + primary text + secondary text + timestamp                 |
| Settings row with right-side value       | `row-settings`            | Label on left, value / chevron on right                            |
| Card, information                        | `card-info`               | Title + body; icon optional                                        |
| Card, action                             | `card-action`             | Card with embedded primary button                                  |
| Modal, confirmation                      | `modal-confirm`           | Title, body, cancel/confirm buttons                                |
| Modal, form                              | `modal-form`              | Title + inputs + submit button                                     |
| Snackbar / toast                         | `snackbar`                | Single-line message + optional action                              |
| Empty state                              | `empty-state`             | Illustration area + title + subtitle                               |
| Loading / skeleton row                   | `skeleton-row`            | Used for list placeholders only                                    |
| Error banner                             | `banner-error`            | Red background, icon + message                                     |
| Success banner                           | `banner-success`          | Green background                                                   |
| Validation error under input             | `input-error-hint`        | Used with any `input-*` fragment                                   |

If the situation is not in the table, fall back to composing inline and
trigger the Step 5 retrospective fragment proposal; do **NOT** silently
invent an un-registered reusable block.

## Fragment metadata conventions

Every fragment in `wf-fragments/` carries a small header comment with:

- `<!-- fragment: <name> -->`: machine-readable id.
- `<!-- params: <p1>, <p2>, … -->`: placeholders the fragment expects.
- `<!-- device: mobile | desktop | any -->`: intended canvas.
- `<!-- skin: light | dark | any -->`: intended theme.

When picking a fragment, match device and skin first; only mix themes when
the source (screenshot / scenario) explicitly calls for it.

## Parameter placeholders

- Placeholders use the shape `<!-- param-name -->` inside attribute values
  or text nodes.
- Numeric expressions like `<!-- y+34 -->` are evaluated at substitution
  time and replaced with the computed integer (§9 CLAUDE.md).
- **NEVER** leave a placeholder unsubstituted in the final SVG; the
  sanitizer treats any remaining `<!-- -->` token with `param` prefix as
  an error.

## Updating this index

When adding / modifying a fragment:

1. Edit `wf-fragments/<name>.svg` and register it in
   `wf-fragments/README.md` (canonical).
2. Mirror the change in this file: add / update the row in the decision
   matrix, keeping the same wording used in the canonical README.
3. If a fragment is deprecated, mark the row with `⚠️ deprecated: use
<replacement>` and do not remove it until call-sites migrate.

## Rules

- **ALWAYS** prefer an existing fragment over inline SVG, even if the
  match is not perfect (variants are cheaper to add than one-offs).
- **NEVER** edit fragments in place during a wireframe run; propose the
  change in Step 5 (retrospective fragment update) and let the user
  approve.
- **ALWAYS** keep this index aligned with `wf-fragments/README.md`;
  diverging indices cause the Step 1 planner to pick the wrong fragment.
