---
title: Page status
status: published
updated_at: 2026-06-11
---

The `DocMeta` component renders a status badge and last-updated date at the top
of every page that has either field set in frontmatter.

```md
---
title: My page
status: published       # published | draft | review | archived
updated_at: 2026-06-11  # YYYY-MM-DD
---
```

Both fields are optional and independent — you can set either one alone.

---

## published

<span class="doc-status-badge" data-status="published">Published</span>

Content is complete and accurate. Default state for pages that are live and
actively maintained.

```md
status: published
```

---

## draft

<span class="doc-status-badge" data-status="draft">Draft</span>

Work in progress. Content may be incomplete, inaccurate, or not yet reviewed.
Use during initial authoring — before anyone else relies on the page.

```md
status: draft
```

---

## review

<span class="doc-status-badge" data-status="review">In review</span>

Content is written but awaiting review or sign-off before publishing. Signals
to readers that the page is not final yet.

```md
status: review
```

---

## archived

<span class="doc-status-badge" data-status="archived">Archived</span>

Content is outdated or superseded. Kept for historical reference but no longer
actively maintained. Prefer linking to the replacement page in the body text.

```md
status: archived
```

---

## Color tokens

All badge colors are defined as CSS custom properties in `base.css` so they
adapt to dark mode automatically.

| Status      | `bg`                              | `text`                          | `border`                          |
| ----------- | --------------------------------- | ------------------------------- | --------------------------------- |
| `published` | `--brand-badge-published-bg`      | `--brand-badge-published-text`  | `--brand-badge-published-border`  |
| `draft`     | `--brand-badge-draft-bg`          | `--brand-badge-draft-text`      | `--brand-badge-draft-border`      |
| `review`    | `--brand-badge-review-bg`         | `--brand-badge-review-text`     | `--brand-badge-review-border`     |
| `archived`  | `--brand-badge-archived-bg`       | `--brand-badge-archived-text`   | `--brand-badge-archived-border`   |

## Suppressing the title

`DocMeta` shares the `doc-before` slot with `DocPageTitle`. To hide the
auto-generated H1 while keeping the badge, add `hideTitle: true`:

```md
---
title: My page
status: draft
hideTitle: true
---
```
