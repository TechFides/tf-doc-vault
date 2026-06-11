---
title: Info panels
status: published
updated_at: 2026-06-11
---

VitePress supports 5 types of info panels (custom blocks). Syntax:
`::: <type> [optional title]` … `:::`.

| Type      | Default title | Usage                                       |
| --------- | ------------- | ------------------------------------------- |
| `info`    | INFO          | Neutral supplementary information           |
| `tip`     | TIP           | Recommendations, best practices             |
| `warning` | WARNING       | Cautions, things to watch out for           |
| `danger`  | DANGER        | Critical warnings, destructive actions      |
| `details` | Details       | Collapsible section with additional content |

---

## info

::: info
Default info panel without a custom title.
:::

```md
::: info
Default info panel without a custom title.
:::
```

::: info Custom title
Info panel with a custom title. Use for contextual notes that are
neither a warning nor a tip.
:::

```md
::: info Custom title
Info panel with a custom title. Use for contextual notes that are
neither a warning nor a tip.
:::
```

---

## tip

::: tip
Default tip panel without a custom title.
:::

```md
::: tip
Default tip panel without a custom title.
:::
```

::: tip Recommendation
Tip panel with a custom title. Use for best practices and recommended
approaches — not for required steps.
:::

```md
::: tip Recommendation
Tip panel with a custom title. Use for best practices and recommended
approaches — not for required steps.
:::
```

---

## warning

::: warning
Default warning panel without a custom title.
:::

```md
::: warning
Default warning panel without a custom title.
:::
```

::: warning Mind the order
Warning panel with a custom title. Use when skipping or misordering
steps causes a problem but does not destroy data.
:::

```md
::: warning Mind the order
Warning panel with a custom title. Use when skipping or misordering
steps causes a problem but does not destroy data.
:::
```

---

## danger

::: danger
Default danger panel without a custom title.
:::

```md
::: danger
Default danger panel without a custom title.
:::
```

::: danger Irreversible action
Danger panel with a custom title. Reserve for truly critical warnings —
data deletion, irreversible migrations, production-only risks.
:::

```md
::: danger Irreversible action
Danger panel with a custom title. Reserve for truly critical warnings —
data deletion, irreversible migrations, production-only risks.
:::
```

---

## details — collapsible panel

::: details
Default collapsible panel without a custom title — click to expand.
:::

```md
::: details
Default collapsible panel without a custom title — click to expand.
:::
```

::: details Show full command output

```bash
pnpm install
pnpm build
pnpm test
```

:::

```md
::: details Show full command output

\`\`\`bash
pnpm install
pnpm build
pnpm test
\`\`\`

:::
```

::: details Dependencies and compatibility

Collapsible sections work well for optional or advanced information that
would otherwise clutter the page.

| Version | Status    | Note                             |
| ------- | --------- | -------------------------------- |
| 0.2.x   | ✅ OK     | Currently supported              |
| 0.1.x   | ❌ missing | Custom blocks not yet supported  |

:::

```md
::: details Dependencies and compatibility

| Version | Status    | Note                             |
| ------- | --------- | -------------------------------- |
| 0.2.x   | ✅ OK     | Currently supported              |
| 0.1.x   | ❌ missing | Custom blocks not yet supported  |

:::
```
