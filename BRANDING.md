# Branding & customization

`@techfides/tf-doc-vault` ships with TechFides defaults (palette, logo, Inter and
IBM Plex Sans, footer style), but every default is overridable from your consumer
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
  --brand-surface: #fff5ed;
}
```

Four tokens, because everything else derives from them: hover and active states,
panel and border tints, gradients, focus rings and the soft washes are all computed
from these. `custom.css` is already imported by the scaffolded theme entry
(`docs/.vitepress/theme/index.ts`, see [`boilerplate/`](./boilerplate/)).

---

## The `branding` option

Full type is exported from `@techfides/tf-doc-vault/config` as `Branding`:

| Field       | Type                               | Default                    | Effect                                                                                                   |
| ----------- | ---------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `siteTitle` | `string`                           | resolved `strings.title`   | Navbar title. Pass `""` to hide.                                                                         |
| `logo`      | `string \| { src; alt? } \| false` | bundled TechFides SVG mark | Navbar logo. `false` hides it. String is shorthand for `{ src }`.                                        |
| `navLinks`  | `{ text: string; link: string }[]` | `[]`                       | Extra nav items at the right end of the navbar.                                                          |
| `footer`    | `BrandingFooter \| false`          | nothing rendered           | Bottom-of-page footer (website link, email, address). `false` hides.                                     |
| `favicon`   | `string \| false`                  | bundled `favicon.ico`      | URL/path to a favicon. `false` injects none. Omit for the default.                                       |
| `fonts`     | `"google" \| "none"`               | `"google"`                 | `"google"` injects the Inter + IBM Plex Sans/Mono + Noto Color Emoji `<link>` tags. `"none"` skips them. |

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

Tokens live in `src/theme/styles/tokens.css` in three layers, and the direction
between them decides what you override:

| Layer       | Holds                                                                         | Override it?                               |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| `--brand-*` | Brand inputs: the hues and the key surfaces                                   | **Yes**, in `custom.css`. This is the API. |
| `--tf-*`    | The design system derived from them: panels, lines, type scale, radii, motion | Rarely, and only a single token at a time  |
| `--vp-*`    | What VitePress itself reads                                                   | No, it is mapped from the two above        |

Setting `--brand-primary` recolours the accent, the gradients, the focus ring, the
sidebar rail, the table header and the tile fills, because every one of them
resolves through `--tf-color-accent: var(--brand-primary)`. Nothing points the
other way, so a one-line override still works.

### Color tokens

| Token                    | Default (light)      | Where it shows up                                            |
| ------------------------ | -------------------- | ------------------------------------------------------------ |
| `--brand-primary`        | `#0074c8`            | CTAs, links, sidebar rail, focus ring, gradients             |
| `--brand-secondary`      | `#00a0e3`            | Gradient start, dark-mode links and accents                  |
| `--brand-navy`           | `#092646`            | The tint light surfaces, borders and shadows are pulled from |
| `--brand-nav-navy`       | `#101219` (dark)     | Navbar / sidebar surface in dark mode                        |
| `--brand-surface`        | `#eef2f8`            | Table row stripes, alternate bands, code block tint          |
| `--brand-primary-hover`  | derived              | Button & link hover                                          |
| `--brand-primary-active` | `var(--brand-navy)`  | Pressed / active link                                        |
| `--brand-primary-soft`   | derived              | Focus ring, soft highlight                                   |
| `--brand-text-default`   | `#16202e`            | Body text (15:1 on the page)                                 |
| `--brand-text-muted`     | `#5a6678`            | Secondary text, captions (5.2:1, passes AA)                  |
| `--brand-text-disabled`  | `#98a3b2`            | Disabled / placeholder                                       |
| `--brand-bg-page`        | `#f7f9fc`            | Page background: tinted, so panels can be white above it     |
| `--brand-bg-subtle`      | `#eef2f8`            | Code block background                                        |
| `--brand-border-default` | `rgba(9,38,70,.10)`  | Dividers, table borders                                      |
| `--brand-border-strong`  | `rgba(9,38,70,.18)`  | Stronger borders                                             |
| `--brand-success`/`-bg`  | `oklch(.47 .14 155)` | Status, badges                                               |
| `--brand-warning`/`-bg`  | `oklch(.50 .13 70)`  | Also drives the Mermaid note in light mode                   |
| `--brand-danger`/`-bg`   | `oklch(.51 .19 25)`  | "                                                            |
| `--brand-info`/`-bg`     | `oklch(.49 .15 245)` | "                                                            |
| `--brand-tobe-add`       | `#ff5630`            | TO-BE tags: content marked for addition                      |
| `--brand-tobe-del`       | `#97a0af`            | TO-BE tags: content marked for removal, struck               |

State colours are set per mode. Light sits near `L 0.50`, calibrated against the worst
ground each state actually lands on: its own badge or alert chip, tinted by `--tf-tint` of
itself, over the bare page colour. That is the phone layout, where the reading panel
carries no fill; clearing 4.5:1 there clears it on the panel too. Dark lifts them to
`L 0.66-0.80`, which needs a dark ground. The `-bg` variants are `color-mix` of the state
colour, so recolouring the state recolours its wash.

The accent has three derived forms, and which one a rule takes is the whole reason there
are almost no `.dark` overrides left in `base.css`:

| Token                    | Light                     | Dark                  | For                                                        |
| ------------------------ | ------------------------- | --------------------- | ---------------------------------------------------------- |
| `--tf-color-accent-ink`  | 30 % navy into the accent | `--tf-color-accent-2` | The accent as text on a tint of itself                     |
| `--tf-color-link`        | `--brand-primary`         | `--tf-color-accent-2` | Anything that reads as a link, plus `-hover` and `-active` |
| `--tf-color-accent-soft` | `--brand-primary-soft`    | same                  | The accent as a wash: hovers, tinted tiles, chips          |

`--tf-color-accent-ink` exists because the brand blue clears 4.5:1 on bare white by only
0.2, which is gone the moment the text sits on a tint of itself, so the active sidebar
item, the accent chip and the forward pager link take the ink token instead.

`DocMeta` status badges read `--brand-badge-{published,draft,review,archived}-{bg,text,border}`.
Each one is a `color-mix` of a state colour rather than a hardcoded pair, so
overriding `--brand-success` moves the published pill in both modes.

### Design-system tokens

Worth knowing about even though you rarely override them. Full list in
`tokens.css`; the names match the `ticket-forge-offer` stylesheet one for one.

| Group   | Tokens                                                                             |
| ------- | ---------------------------------------------------------------------------------- |
| Surface | `--tf-color-bg`, `-surface-1`, `-panel`, `-panel-2`, `-panel-hi`, `-inset`         |
| Line    | `--tf-color-line`, `-line-2`, `-line-hi`                                           |
| Type    | `--tf-text-display` … `--tf-text-caption-sm`, `--tf-tracking-*`, `--tf-leading-*`  |
| Measure | `--tf-measure` (`72ch`) and `--tf-panel-max`, the panel sized around it            |
| Space   | `--tf-spacing-1` … `-8`, `-lg`, `-xl`, `-2xl`                                      |
| Shape   | `--tf-radius-check/xs/sm/lg/xl/pill`                                               |
| Depth   | `--tf-shadow-1/2/3`, `--tf-blur-panel`, `--tf-glass-saturate`, `--tf-glass-filter` |
| Motion  | `--tf-dur-1/2/3`, `--tf-ease-out`, `--tf-ease-spring`, `--tf-t-base`               |
| Accent  | `--tf-grad-accent`, `-accent-h`, `--tf-grad-line`                                  |
| Marks   | `--tf-rail`, `--tf-rail-width`, `--tf-check-mask`                                  |
| Diagram | `--tf-mermaid-surface`, `-ink`, `-label-bg`, `-edge-bg`, `-note-bg`, `-note-line`  |

`--tf-rail` is the active-item bar the sidebar, the outline, the selected search result
and the callouts all share; anything carrying it must square its own left corners,
because an inset shadow and a border both follow `border-radius` and would bend the bar
into a hook. `--tf-check-mask` is the task-list tick, a mask rather than a glyph so the
gradient behind it shows through and the mark needs no colour of its own.

Light mode is not an inversion of dark. Translucent white over near-black lifts a
panel off the page; the same alpha over white would recess it. Light therefore uses
opaque panels above a tinted page plus a shadow, and Forge's `--color-*-on-bg`
trio has no counterpart here because it compensates for translucency stacking that
light mode does not have.

### Pattern classes

`src/theme/styles/patterns.css` ships classes an author can put straight into
Markdown, so a page can hold a card grid or a row of figures without a component
or an inline style. `tf-eyebrow`, `tf-lead`, `tf-grad-text`, `tf-cards`, `tf-card`
(with `tf-card__icon/__title/__text`), `tf-stat`, `tf-tile`, `tf-chip`, `tf-step`,
`tf-checks`, `tf-btn`, `tf-divider`, `tf-rows`, `tf-logos` for a row of third-party
marks, `tf-light-only` / `tf-dark-only` for a figure exported once per mode, plus
`data-tf-edge` for the animated hairline and `data-tf-reveal` for scroll reveal.
Every animation is off under `prefers-reduced-motion`.

`tf-logos` plates each mark on `--tf-color-plate`, white in both modes: a third-party logo
cannot be recoloured, and a mode-aware plate would leave dark line-work on near-black.

### Page backdrop

`PageBackdrop` mounts a fixed layer behind the whole site: a nebula of four soft accent
clouds that drifts and breathes on a 150 second cycle, plus a star field of four layers
that fade in and out on 11, 14, 17 and 21 second cycles. The staggered periods are what
make the field scintillate rather than blink in unison, and the nebula is slow enough
that you never catch it moving, only notice the sky is not where you left it. Turn the
whole thing off with `createTheme({ backdrop: false })`.

The nebula layer is inset `-8%` so the drift has slack; at inset 0 the translate would
walk the clouds' soft edges into view along the viewport border.

| Token                 | Light      | Dark       | Effect                       |
| --------------------- | ---------- | ---------- | ---------------------------- |
| `--tf-nebula-opacity` | `1`        | `1`        | Strength of the whole nebula |
| `--tf-stars-opacity`  | `0`        | `1`        | Strength of the star field   |
| `--tf-nebula-1/2/3`   | 55/11/38 % | 46/30/38 % | The three clouds             |

The drift keyframes scale their opacity from `--tf-nebula-opacity` rather than setting it
outright, because a keyframe outranks the element's own declaration and a literal there
would leave the token doing nothing.

The stars are off in light mode: white specks on a near-white page read as dust
rather than sky. Raise `--tf-stars-opacity` if you want them anyway.

The two modes place the clouds differently, and `backdrop.css` explains why: dark clouds
read as glow wherever they fall, while light clouds have to be darker than a near-white
page to register at all, which makes them a contrast cost for any text above them. Light
therefore pools its strength behind the frosted sidebar and panel, and keeps the pair over
the outline column faint, since that column has no panel of its own.

Below 768px the reading column is full-bleed and transparent, so there is no gutter and no
glass: every star and every cloud would land on a line of text. The whole backdrop stands
down there, in both modes, and the page keeps its flat colour.

The page colour is on `html`, and `body` plus the VitePress containers are pinned
transparent: the layer paints at `z-index: -1` and any fill above it would bury it.

#### Frosted surfaces

Surfaces that lie on the backdrop are glass rather than opaque, so the nebula reads
through them and the blur turns a star behind them into a soft glow instead of a
speck sitting in a line of text.

| Token                    | Light  | Dark   | Effect                                                    |
| ------------------------ | ------ | ------ | --------------------------------------------------------- |
| `--tf-glass-alpha`       | `80%`  | `72%`  | How much of the surface's own colour it keeps             |
| `--tf-color-panel-glass` | —      | —      | The panel tone at that alpha, for reading panel and cards |
| `--tf-blur-panel`        | `18px` | `18px` | Blur radius behind glass                                  |
| `--tf-glass-saturate`    | `140%` | `170%` | Saturation lift behind glass                              |

`backdrop-filter` is the expensive part, so it goes only on surfaces that sit
directly on the backdrop: the reading panel, the sidebar and the feature cards.
Tables, code blocks and callouts are translucent but carry no blur of their own,
because they already lie on the frosted panel and a second blur would only re-blur
the parent's result at full cost. Keep that rule if you add a surface: translucent
always, blurred only when nothing frosted is already behind it.

### Icons

`src/theme/styles/icons.css` self-hosts the Phosphor icon font (regular weight) and
carries a `content` rule for 47 glyphs. Use one as `<i class="ph ph-check"></i>`.

The font file is the whole 1530-glyph set, but a browser only downloads it once a
page actually renders a glyph from the family, so a site that uses no icon pays
nothing. An icon **without** a rule in `icons.css` renders as nothing at all: to add
one, look its codepoint up in the [Phosphor docs](https://phosphoricons.com/) and
add the rule.

### Layout tokens

| Token                            | Default      | Notes                      |
| -------------------------------- | ------------ | -------------------------- |
| `--layout-max-width-narrow`      | `800px`      | Hero inner width           |
| `--layout-max-width-content`     | `1440px`     | Default content max width  |
| `--layout-max-width-wide`        | `1800px`     | `html.layout-wide` mode    |
| `--layout-side-padding-sm/md/lg` | `24/48/64px` | Hero / footer side padding |

### Font family

Two faces with different jobs: Inter carries headings, numbers and UI chrome,
IBM Plex Sans carries running text. Plex has the larger x-height of the two, which
is why it reads better over the length of a specification.

```css
:root {
  --tf-font-display: "Inter", system-ui, sans-serif;
  --tf-font-body:
    "IBM Plex Sans", "Noto Color Emoji", -apple-system, sans-serif;
  --tf-font-mono: "IBM Plex Mono", ui-monospace, "Menlo", monospace;
}
```

Override `--tf-font-body` to swap the text face site-wide, `--tf-font-display` for
headings. Keep `"Noto Color Emoji"` in the body list unless you want emoji to come
from the reader's OS, and keep it **behind** the text face: Noto carries `0`-`9` for
keycaps and would otherwise claim every digit on the page. See the
[Font family](#font-family-1) section for the full self-host flow.

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

`branding.fonts` only controls whether the Google Fonts `<link>` tags for Inter,
IBM Plex Sans, IBM Plex Mono and Noto Color Emoji are injected. The font
**family name** lives in CSS. Full swap is a three-step flow:

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
   import "@fontsource/inter/600.css";
   import "@fontsource/ibm-plex-sans/400.css";
   import "@fontsource/ibm-plex-sans/600.css";
   ```

3. Point the CSS variables at your font:

   ```css
   /* docs/.vitepress/theme/custom.css */
   :root {
     --tf-font-display: "Inter", system-ui, sans-serif;
     --tf-font-body:
       "IBM Plex Sans", "Noto Color Emoji", -apple-system, BlinkMacSystemFont,
       "Segoe UI", sans-serif;
   }
   ```

   The Phosphor icon font is self-hosted by the package and unaffected by
   `branding.fonts`.

### Emoji

Emoji render from **Noto Color Emoji** rather than the reader's OS font, so
a ✅ or a 🚀 in a spec looks the same on Windows, macOS, Linux, Android and
in the exported PDF. Every surface that declares a font stack lists it:

| Surface                     | Where it is set                     |
| --------------------------- | ----------------------------------- |
| Prose and UI chrome         | `--tf-font-body` (`tokens.css`)     |
| Headings, table headers, UI | `--tf-font-display` (`tokens.css`)  |
| Code blocks, inline code    | `--tf-font-mono` (`tokens.css`)     |
| Mermaid diagram labels      | `mermaid.fontFamily` (`makeConfig`) |
| PDF export                  | `.print-layout` (`PrintLayout.vue`) |

Mermaid needs its own entry because it writes `#mermaid-N { font-family }`
into the generated SVG, an ID selector that site CSS cannot outrank.

In every stack the family sits **behind** the text fonts and **ahead** of
the system fonts. Behind, because Noto Color Emoji also carries `#`, `*`
and `0`–`9` for keycap sequences: put it first and ordinary digits render
as emoji glyphs (roughly double width). Ahead, because otherwise Apple
Color Emoji or Segoe UI Emoji claims the codepoint first and the platform
difference is back.

Two consequences worth knowing:

- With `fonts: "none"` (or a network that blocks fonts.gstatic.com) emoji
  degrade to the OS font. Nothing breaks, but cross-platform sameness is
  gone. Self-host [`@fontsource/noto-color-emoji`](https://fontsource.org/fonts/noto-color-emoji)
  to keep it offline.
- Keeping the family name in a custom `--vp-font-family-base` is what
  preserves the behaviour. Drop it and the OS font takes emoji back.

### Sidebar markers

Every sidebar entry leads with one marker slot, `--tf-sb-marker-slot` wide (20px).
A collapsible group gets a 6px square in it, a page a 5px dot, both drawn as a
centred background in `--tf-color-disabled`; the active entry's marker takes the
accent.

**One slot width is the point.** The slot is absolutely positioned in the label's own
padding, so it contributes no width and every label starts at exactly the padding
edge, whether its marker is a square, a dot, or an author's emoji. While the marker
sat in the text flow, those three pushed their labels to three different x positions.
For the same reason the indent step per nesting level _is_ the slot width, so a
child's marker lands in the column where its parent's label starts.

They are drawn rather than written on purpose. The markers used to be the emoji ◼️
and ▪️, which carry `U+FE0F` and are therefore painted by Noto Color Emoji in its
own colour: `color` could not reach them, so dark mode had to swap in different
glyphs to stay legible. A background reads the tokens like everything else, so the
mode swap and the second glyph pair are both gone.

A `title:` that **starts with an emoji** suppresses the default and the author's
emoji is used instead. This is the per-page escape hatch, no CSS needed:

```md
---
title: 🚀 Deployment
---
```

To change the defaults site-wide, override the two `::before` rules. The shape is a
background, so `background-image` picks the mark and `background-size` its size; the
slot itself stays put. Widen the whole column with `--tf-sb-marker-slot`, which moves
the indent step with it:

```css
/* docs/.vitepress/theme/custom.css */
.VPSidebar {
  --tf-sb-marker-slot: 24px;
}
.VPSidebarItem .text.default-emoji-folder::before {
  background-image: linear-gradient(var(--brand-primary) 0 0);
  background-size: 8px 2px; /* a dash instead of a square */
}
.VPSidebarItem .text.default-emoji-file::before {
  background-size: 4px 4px;
}
```

Going back to an emoji works, but then `color` stops applying and you own the
light/dark difference yourself. Keep `content: "" / ""` if you replace the rules
wholesale: the second half is the accessible name, and blanking it is what stops a
screen reader announcing the marker before every label. An author's emoji is hoisted
into the slot by `SidebarDefaultEmoji.vue` and marked `aria-hidden` there, so the link
reads "Deployment" rather than the glyph's name plus the label. Markers never become
characters in the title, so they stay out of the page text, the outline, search and
the PDF export.

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
import "@fontsource/inter/600.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./custom.css";

export default createTheme({ widthToggle: true });
```

```css
/* docs/.vitepress/theme/custom.css */
:root {
  --brand-primary: #ff6600;
  --brand-secondary: #ffaa66;
  --brand-navy: #2a1a3f;
  --brand-surface: #fff5ed;
  --tf-font-display: "Inter", system-ui, sans-serif;
  --tf-font-body: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

Place `logo.svg` and `favicon.svg` under `docs/public/`. Run
`pnpm exec vitepress dev docs` and verify:

- Navbar shows Acme logo + title
- Buttons, links, sidebar active items use the orange brand color
- Footer shows `acme.example` and the contact email, no `techfides.cz`
- Mermaid diagrams outline their nodes in the orange brand color in both modes
  (`--brand-primary`; their fills and labels come from `--tf-mermaid-*`)
