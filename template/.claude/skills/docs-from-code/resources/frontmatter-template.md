# Frontmatter templates

Canonical frontmatter and HTML-comment blocks for every `.md` file the
skills generate. All example labels are in Czech with diacritics — as
they will appear in the final docs (§7 of `CLAUDE.md`).

## Content page (general)

```markdown
---
title: Název stránky
status: draft
updated_at: 2026-04-23
---

<!--
confluence:
  space: CNG
  title: Název stránky
  parent: Nadřazená stránka
-->

<!-- generated: 2026-04-23 | source: v1.4.2 -->

# Název stránky

…
```

## Section index — `<section>/index.md`

```markdown
---
title: Funkční dokumentace
status: draft
updated_at: 2026-04-23
order: 1
---

<!--
confluence:
  space: CNG
  title: Funkční dokumentace
  parent: Dokumentace v1
-->

# Funkční dokumentace

Krátký úvodní odstavec (1–2 věty).
```

No `<!-- generated: … -->` stamp on index files (§5 of `CLAUDE.md`).

## Group index — `<section>/<group>/index.md`

```markdown
---
title: Scénáře
status: draft
updated_at: 2026-04-23
order: 11
---

<!--
confluence:
  space: CNG
  title: Scénáře
  parent: Funkční dokumentace
-->

# Scénáře

Krátký úvodní odstavec.
```

## Field rules

| Field        | Allowed values                                | Missing                      |
| ------------ | --------------------------------------------- | ---------------------------- |
| `title`      | Czech, with diacritics                        | required                     |
| `status`     | `published` / `draft` / `review` / `archived` | default `draft`              |
| `updated_at` | `YYYY-MM-DD` or `YYYY-MM-DD HH:MM`            | required; from `currentDate` |
| `order`      | integer, only on `index.md`                   | required on `index.md`       |

## Confluence mark rules (§6 of CLAUDE.md)

- `space` — Confluence space key (project decides; default `CNG`).
- `title` — matches the page title for top-level synced pages.
- `parent` — Czech title of the parent page (use `docs/vN` label at the
  top level).
- **NEVER** omit the Confluence mark on files that belong to a synced
  section.

## Generation stamp rules (§5 of CLAUDE.md)

- Only on content pages, not on `index.md`.
- Format: `<!-- generated: YYYY-MM-DD | source: vX.Y.Z -->`.
- Source version resolved from git tag → `package.json`; if neither,
  use `⚠️ TODO: source version`.
