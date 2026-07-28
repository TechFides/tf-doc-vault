# Branding & customization

`@techfides/tf-doc-vault` ships with TechFides defaults (palette, logo, Open
Sans, footer style), but every default is overridable from your consumer
config. This document shows what you can swap and how.

## TL;DR: minimum viable rebrand

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
(`docs/.vitepress/theme/index.ts`, see [`boilerplate/`](./boilerplate/)).

---

## The `branding` option

Full type is exported from `@techfides/tf-doc-vault/config` as `Branding`:

| Field       | Type                               | Default                    | Effect                                                               |
| ----------- | ---------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `siteTitle` | `string`                           | resolved `strings.title`   | Navbar title. Pass `""` to hide.                                     |
| `logo`      | `string \| { src; alt? } \| false` | bundled TechFides SVG mark | Navbar logo. `false` hides it. String is shorthand for `{ src }`.    |
| `navLinks`  | `{ text: string; link: string }[]` | `[]`                       | Extra nav items at the right end of the navbar.                      |
| `footer`    | `BrandingFooter \| false`          | nothing rendered           | Bottom-of-page footer (website link, email, address). `false` hides. |
| `favicon`   | `string \| false`                  | bundled `favicon.ico`      | URL/path to a favicon. `false` injects none. Omit for the default.   |
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

If you don't pass `footer`, no footer is rendered; there are **no
TechFides defaults that leak through**. Same for `navLinks`.

---

## CSS tokens

Brand color and layout tokens are defined as CSS custom properties in
`src/theme/styles/base.css` and cascaded through every component. Override
them in `docs/.vitepress/theme/custom.css`.

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
| `--brand-warning`/`-bg`  | `#e08800`   | Also drives Mermaid note styling                     |
| `--brand-danger`/`-bg`   | `#c8232c`   | "                                                    |
| `--brand-info`/`-bg`     | `#0074c8`   | "                                                    |

`DocMeta` status badges read `--brand-badge-{published,draft,review,archived}-{bg,text,border}`
(separate light/dark values in `base.css`); override those to recolor the
status pills.

### Layout tokens

| Token                            | Default      | Notes                      |
| -------------------------------- | ------------ | -------------------------- |
| `--layout-max-width-narrow`      | `800px`      | Hero inner width           |
| `--layout-max-width-content`     | `1440px`     | Default content max width  |
| `--layout-max-width-wide`        | `1800px`     | `html.layout-wide` mode    |
| `--layout-side-padding-sm/md/lg` | `24/48/64px` | Hero / footer side padding |

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

Set `branding.favicon` to a URL/path served from your site root. It
replaces the bundled default (no duplicate icon):

```ts
makeConfig({
  // ...
  branding: { favicon: "/favicon.svg" },
});
```

Pass `favicon: false` to inject no favicon at all. Omit the option to keep
the package's bundled `favicon.ico`.

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

## Component copy (i18n)

Built-in component strings (DocMeta status badges, the 404 page, the
lightbox close label, the feature-card CTA) live in the theme's
[vue-i18n](https://vue-i18n.intlify.dev/) catalogs (`cs` default, `en`
fallback). The active locale follows `site.lang` (`en-*` → English, else
Czech). Override any string from your theme entry:

```ts
// docs/.vitepress/theme/index.ts
import { createTheme, i18n } from "@techfides/tf-doc-vault/theme";

i18n.global.mergeLocaleMessage("cs", {
  docMeta: { author: "Vytvořeno klientem X" },
});

export default createTheme();
```

Keys: `docMeta.{updated,author}`, `docMeta.status.{published,draft,review,archived}`,
`notFound.{code,heading,message,link}`, `lightbox.close`, `feature.cta`.

---

## Known limitations

Items below are **not** cleanly rebrandable today without patching the
package itself. They are tracked but not yet exposed as `branding`
knobs:

- **NotFound logo**: the 404 page renders `LogoSymbol`, the
  TechFides mark, directly. There is no slot or prop. To replace it,
  re-implement `NotFound` in your own theme and substitute it via
  VitePress' `not-found` slot.
- **`setup` wizard** (`src/cli/setup.ts`) generates a TechFides-branded
  project by default. There is no `--brand-preset` flag yet. After
  scaffolding, edit `docs/.vitepress/config.ts` to add your `branding:
{...}` block manually.
- **Navbar logo fill is baked at build**: the navbar logo renders as
  an `<img>` whose fill is inlined into a data URL at build time
  (mirroring `--brand-primary`). An `<img>` cannot inherit
  `currentColor`, so overriding `--brand-primary` in `custom.css`
  recolors everything _except_ the navbar logo, which stays the bundled
  blue. To recolor it, override the logo as a whole via `branding.logo`
  (pointing at your own asset) rather than the CSS token.

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
- Footer shows `acme.example` and the contact email, no `techfides.cz`
- Mermaid diagrams use the orange brand color in both light and dark mode
  (they read the `--brand-*` tokens)
