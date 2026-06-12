---
title: DocMeta
status: published
updated_at: 2026-05-22
---

Status pill + "Updated" date that renders above every doc page
(skipped on hero pages). The badge above is rendered by `DocMeta`
reading this file's frontmatter. Labels and date format follow the
site's `lang` setting (Czech by default, English when `lang: en-*`).

## Status variants

| status      | English label | Czech label |
| ----------- | ------------- | ----------- |
| `published` | Published     | Publikováno |
| `draft`     | Draft         | Koncept     |
| `review`    | In review     | K revizi    |
| `archived`  | Archived      | Archivováno |

## Source

```ts
// src/theme/components/DocMeta.vue
import { useData } from "vitepress";
const { frontmatter } = useData();
const isHeroPage = !!frontmatter.value?.hero;
```

The badge picks colors from `data-status` and adapts to dark mode.
