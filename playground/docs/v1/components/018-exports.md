---
title: Exports
status: published
updated_at: 2026-08-13
order: 19
---

What `@techfides/tf-doc-vault/theme` hands you beyond the components. Two of these were
exported and documented nowhere, which is how this page came about.

```ts
import {
  createTheme,
  useScrollSpy,
  icons,
  i18n,
  // plus every component, see the section index
} from "@techfides/tf-doc-vault/theme";
```

## createTheme(options)

The theme factory. Every option is optional.

| Option        | Default | Effect                                                                      |
| ------------- | ------- | --------------------------------------------------------------------------- |
| `widthToggle` | `false` | Adds [WidthToggle](./003-width-toggle) to the navbar.                       |
| `brandFooter` | `true`  | Allows [BrandFooter](./013-brand-footer). It still needs `branding.footer`. |
| `backdrop`    | `true`  | Mounts [PageBackdrop](./011-page-backdrop).                                 |

To add your own components on top, spread the result and call the original `enhanceApp`
inside yours. Skipping that call is a quiet way to lose every globally registered component
and the i18n setup:

```ts
const base = createTheme({ widthToggle: true });

export default {
  ...base,
  enhanceApp(ctx) {
    base.enhanceApp?.(ctx); // <- without this, no BrandHero, no Spotlight, no i18n
    ctx.app.component("MyComponent", MyComponent);
  },
};
```

## useScrollSpy()

Highlights the sidebar link for the heading currently in view, by adding `scroll-active` to
the matching anchor. Call it once from a layout or a component that lives for the whole page:

```ts
import { useScrollSpy } from "@techfides/tf-doc-vault/theme";

useScrollSpy();
```

It takes nothing and returns nothing. It reads the headings after each route change, matches
sidebar hrefs on their hash suffix, and throttles on `requestAnimationFrame`. Nothing in the
theme calls it today, so the styling for `.scroll-active` is yours to add if you want the
effect.

## icons

The five SVG marks the theme draws itself, namespaced. See [Icons](./017-icons) for the list
and for the icon font, which is the other, larger half of this surface.

## i18n

The `vue-i18n` instance the theme's own strings live in, exported so a consumer can add
messages to the same bundle rather than standing up a second one. `createTheme()` installs it
and sets the locale from `siteData.lang`, so importing it is only needed to extend it.

The keys the theme owns are `docMeta.*`, `notFound.*`, `feature.cta` and the table strings.
Overwriting one changes the theme's own wording; adding your own alongside them is safe.
