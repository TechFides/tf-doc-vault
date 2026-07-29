---
title: BrandHero
status: published
updated_at: 2026-07-29
hero:
  title: BrandHero
  eyebrow: Component demo
---

<BrandHero>
  <template #subtitle>
    The gradient banner above is this page's own <strong>BrandHero</strong>, with
    <code>eyebrow: Component demo</code> set in the frontmatter.
  </template>
</BrandHero>

Landing-page banner used on `index.md`. It renders only on pages whose
frontmatter contains a `hero` block, so a page without one can place the
component safely and get nothing.

## Frontmatter

| Key            | Default         | Effect                                                                         |
| -------------- | --------------- | ------------------------------------------------------------------------------ |
| `hero.title`   | `title`         | Headline inside the banner.                                                    |
| `hero.eyebrow` | `Documentation` | Small uppercase label above the headline. Set `""` or `false` to drop the row. |

## Usage

```md
---
title: lapa (dokumentační portál)
aside: false
hero:
  title: lapa
  eyebrow: Analýza
---

<BrandHero>
  <template #subtitle>
    Byznys, funkční a technická specifikace projektu <strong>lapa</strong>.
  </template>
</BrandHero>
```

## Slots

`#subtitle` renders below the headline. Inline HTML is allowed (`<strong>`,
`<code>`, links); Markdown inside a component slot is not parsed.
