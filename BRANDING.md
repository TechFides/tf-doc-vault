# Branding & customization

`@techfides/tf-doc-vault` ships with TechFides defaults (palette, logo, Open
Sans, footer style), but every default is overridable from your consumer
config. This document shows what you can swap and how.

## TL;DR — minimum viable rebrand

Two files in your consumer repo, no fork of the package required:

```ts
// docs/.vitepress/config.ts
import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "acme-docs",
  branding: {
    siteTitle: "Acme",
    logo: { src: "/logo.svg", alt: "Acme" },
    navLinks: [{ text: "Web", link: "https://acme.example" }],
    footer: {
      websiteUrl: "https://acme.example",
      email: "hello@acme.example",
    },
  },
});
```

```css
/* docs/.vitepress/theme/custom.css */
:root {
  --brand-primary: #ff6600;
  --brand-secondary: #ffaa66;
  --brand-navy: #2a1a3f;
  --brand-nav-navy: #1d1230;
  --brand-surface: #fff5ed;
  --brand-primary-hover: #e65c00;
  --brand-primary-active: #cc5200;
  --brand-primary-soft: rgba(255, 102, 0, 0.1);
}
```

`custom.css` is already imported by the scaffolded theme entry
(`docs/.vitepress/theme/index.ts` — see [`template/`](./template/)).

---

## The `branding` option

Full type is exported from `@techfides/tf-doc-vault/config` as `Branding`:

| Field       | Type                               | Default                    | Effect                                                               |
| ----------- | ---------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `siteTitle` | `string`                           | resolved `strings.title`   | Navbar title. Pass `""` to hide.                                     |
| `logo`      | `string \| { src; alt? } \| false` | bundled TechFides SVG mark | Navbar logo. `false` hides it. String is shorthand for `{ src }`.    |
| `navLinks`  | `{ text: string; link: string }[]` | `[]`                       | Extra nav items at the right end of the navbar.                      |
| `footer`    | `BrandingFooter \| false`          | nothing rendered           | Bottom-of-page footer (website link, email, address). `false` hides. |
| `fonts`     | `"google" \| "none"`               | `"google"`                 | `"google"` injects Open Sans `<link>` tags. `"none"` skips them.     |

`BrandingFooter`:

```ts
interface BrandingFooter {
  websiteUrl?: string;
  websiteLabel?: string; // defaults to host name of websiteUrl
  email?: string;
  address?: string;
}
```

If you don't pass `footer`, no footer is rendered — there are **no
TechFides defaults that leak through**. Same for `navLinks`.

---

## CSS tokens

Brand color, layout, and breakpoint tokens are defined as CSS custom
properties in `src/theme/styles/base.css` and cascaded through every
component. Override them in `docs/.vitepress/theme/custom.css`.

### Color tokens

| Token                    | Default     | Where it shows up                                    |
| ------------------------ | ----------- | ---------------------------------------------------- |
| `--brand-primary`        | `#0074c8`   | CTAs, links, sidebar active item, focus ring         |
| `--brand-secondary`      | `#00a0e3`   | Dark-mode accents, icon tint on dark                 |
| `--brand-navy`           | `#092646`   | Hero background, footer accents                      |
| `--brand-nav-navy`       | `#082850`   | Navbar / sidebar background in dark mode             |
| `--brand-surface`        | `#f5f7fa`   | Table row stripes, icon backgrounds, code block tint |
| `--brand-primary-hover`  | `#0f75c5`   | Button & link hover                                  |
| `--brand-primary-active` | `#092646`   | Pressed / active link                                |
| `--brand-primary-soft`   | `rgba(...)` | Focus ring, soft highlight                           |
| `--brand-text-default`   | `#333333`   | Body text (WCAG AA contrast)                         |
| `--brand-text-muted`     | `#7e8890`   | Secondary text, captions                             |
| `--brand-text-disabled`  | `#acb2b7`   | Disabled / placeholder                               |
| `--brand-bg-page`        | `#ffffff`   | Light-mode page background                           |
| `--brand-bg-subtle`      | `#eeeeee`   | Code block background                                |
| `--brand-border-default` | `#e9e9e9`   | Dividers, table borders                              |
| `--brand-border-strong`  | `#7e8890`   | Stronger borders                                     |
| `--brand-success`/`-bg`  | `#00dd0a`   | Status/feedback (not used by core components yet)    |
| `--brand-warning`/`-bg`  | `#e08800`   | "                                                    |
| `--brand-danger`/`-bg`   | `#c8232c`   | "                                                    |
| `--brand-info`/`-bg`     | `#0074c8`   | "                                                    |

### Layout & breakpoint tokens

| Token                            | Default             | Notes                                                                       |
| -------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `--layout-max-width-narrow`      | `800px`             | Hero inner width                                                            |
| `--layout-max-width-content`     | `1440px`            | Default content max width                                                   |
| `--layout-max-width-wide`        | `1800px`            | `html.layout-wide` mode                                                     |
| `--layout-side-padding-sm/md/lg` | `24/48/64px`        | Hero / footer side padding                                                  |
| `--bp-sm/md/lg/xl`               | `480/640/768/960px` | Breakpoints (also duplicated in `@media` rules — see comment in `base.css`) |

### Font family

```css
:root {
  --vp-font-family-base: "Inter", -apple-system, sans-serif;
}
```

Override `--vp-font-family-base` to swap the typeface site-wide. See the
[Font family](#font-family) section for the full self-host flow.

---

## Logo

```ts
branding: { logo: { src: "/logo.svg", alt: "Acme" } }
// or string shorthand:
branding: { logo: "/logo.svg" }
// or disable entirely:
branding: { logo: false }
```

Place the SVG/PNG under `docs/public/` so VitePress serves it from the
site root. Data URLs work too. The default (bundled TechFides mark) is
read from the package at build time.

---

## Favicon

There is no `branding.favicon` option yet — favicons go through the
`head` array on `makeConfig()`:

```ts
makeConfig({
  // ...
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  ],
});
```

> **Caveat**: the package always tries to load its own bundled
> `favicon.ico` and inject it as a data URL into `<head>`. Your `head`
> entry sits alongside it. Most browsers pick the first declared icon —
> in practice the package's data-URL favicon ends up earlier in `<head>`
> than your `head[]` entries, so you may need to override visually
> distinct content. If this matters for your project, file an issue
> (or send a PR adding `branding.favicon?: string | false`).

---

## Font family

`branding.fonts` only controls whether the Google Fonts `<link>` tags
for Open Sans are injected. The font **family name** lives in CSS. Full
swap is a three-step flow:

1. Skip the Google fetch:

   ```ts
   branding: {
     fonts: "none";
   }
   ```

2. Self-host or load your font another way. With
   [`@fontsource`](https://fontsource.org/):

   ```ts
   // docs/.vitepress/theme/index.ts
   import "@fontsource/inter/400.css";
   import "@fontsource/inter/500.css";
   import "@fontsource/inter/700.css";
   ```

3. Point the CSS variable at your font:

   ```css
   /* docs/.vitepress/theme/custom.css */
   :root {
     --vp-font-family-base:
       "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
   }
   ```

---

## Footer & nav links

```ts
branding: {
  footer: {
    websiteUrl: "https://acme.example",
    websiteLabel: "acme.example",  // optional, defaults to host name
    email: "hello@acme.example",
    address: "Karlovo náměstí 1, Praha 2",
  },
  navLinks: [
    { text: "GitHub", link: "https://github.com/acme/docs" },
    { text: "Status", link: "https://status.acme.example" },
  ],
}
```

Pass `footer: false` to suppress the footer entirely even if some other
default would render it.

---

## Known limitations

Items below are **not** cleanly rebrandable today without patching the
package itself. They are tracked but not yet exposed as `branding`
knobs:

- **Mermaid diagram colors** — light-mode palette is hardcoded as hex
  values in `themeVariables` inside `makeConfig.ts`. Dark-mode appearance
  is enforced by CSS rules in `base.css` under `.dark .mermaid` with
  `!important`, mixing `var(--brand-*)` and hardcoded `#ffffff` for
  text. Overriding `--brand-primary` will recolor nodes/edges in dark
  mode but not light mode (the latter ignores our CSS for diagrams).
- **DocMeta status badges** — published/draft/review/archived badge
  colors are hex values inline in `src/theme/components/DocMeta.vue`,
  not CSS variables. Overriding requires patching the component.
- **NotFound logo** — the 404 page renders `LogoSymbol`, the
  TechFides mark, directly. There is no slot or prop. To replace it,
  re-implement `NotFound` in your own theme and substitute it via
  VitePress' `not-found` slot.
- **`bin/create-ana.mjs` scaffolder** — generates a TechFides-branded
  project by default. There is no `--brand-preset` flag yet. After
  scaffolding, edit `docs/.vitepress/config.ts` to add your `branding:
{...}` block manually.

If you need any of these closed before they happen organically, open
an issue with your use case.

---

## End-to-end example

A complete consumer setup for a fictional "Acme" brand (orange,
self-hosted Inter, no TechFides links anywhere):

```ts
// docs/.vitepress/config.ts
import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "acme",
  branding: {
    siteTitle: "Acme",
    logo: { src: "/logo.svg", alt: "Acme" },
    fonts: "none",
    navLinks: [{ text: "acme.example", link: "https://acme.example" }],
    footer: {
      websiteUrl: "https://acme.example",
      email: "hello@acme.example",
    },
  },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  ],
});
```

```ts
// docs/.vitepress/theme/index.ts
import { createTheme } from "@techfides/tf-doc-vault/theme";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "./custom.css";

export default createTheme({ widthToggle: true });
```

```css
/* docs/.vitepress/theme/custom.css */
:root {
  --brand-primary: #ff6600;
  --brand-secondary: #ffaa66;
  --brand-navy: #2a1a3f;
  --brand-nav-navy: #1d1230;
  --brand-surface: #fff5ed;
  --brand-primary-hover: #e65c00;
  --brand-primary-active: #cc5200;
  --brand-primary-soft: rgba(255, 102, 0, 0.1);
  --vp-font-family-base:
    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Place `logo.svg` and `favicon.svg` under `docs/public/`. Run
`pnpm exec vitepress dev docs` and verify:

- Navbar shows Acme logo + title
- Buttons, links, sidebar active items use the orange brand color
- Footer shows `acme.example` and the contact email — no `techfides.cz`
- Mermaid diagrams in dark mode use the orange nodes (light mode keeps
  the package's default palette — see [Known limitations](#known-limitations))
