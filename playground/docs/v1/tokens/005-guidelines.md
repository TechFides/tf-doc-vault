---
title: Guidelines
status: published
updated_at: 2026-06-11
---

## Page title

The theme injects an `<h1>` automatically from the frontmatter `title` field
via the `DocPageTitle` component. **Never add a `# H1` in the markdown body**:
it will render twice.

```md
---
title: My page   ✅ title comes from here
---

# My page ❌ remove this, DocPageTitle already renders it
```

To suppress the auto-generated title on a specific page (e.g. a hero landing
page), add `hideTitle: true` to the frontmatter:

```md
---
title: Home
hideTitle: true
---
```

## Frontmatter fields

| Field        | Type                                             | Purpose                          |
| ------------ | ------------------------------------------------ | -------------------------------- |
| `title`      | `string`                                         | Page title: sidebar + H1         |
| `status`     | `published` \| `draft` \| `review` \| `archived` | Shown as a badge below the title |
| `updated_at` | `YYYY-MM-DD`                                     | Last-updated date in the badge   |
| `hideTitle`  | `boolean`                                        | Suppress the auto H1             |

## Heading hierarchy

Start section headings at `##` (H2); never use `#` (H1) in content.
H1 is reserved for the page title injected by `DocPageTitle`.

```md
## Section ✅

### Subsection ✅

# Oops ❌
```
