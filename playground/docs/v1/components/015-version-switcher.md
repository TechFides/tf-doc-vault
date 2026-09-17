---
title: VersionSwitcher
status: review
updated_at: 2026-08-13
---

A dropdown that switches between doc versions. Complete, shipped in the package, and
rendered by nothing. This page documents it as it stands rather than pretending it is
available.

::: warning Not wired, and not reachable
Nothing imports or registers it, so no site renders it. It is also absent from the `theme`
export, and `package.json` exposes no `./theme/components/*` subpath, so a consumer cannot
reach it even deliberately. `knip.json` silences the unused-file warning for exactly this
reason.
:::

There is no live example here because rendering it would need registering it, and registering
it is the decision this page exists to inform.

## What it would do

It reads `site.locales`, which `makeConfig()` builds from the versions it discovers, and
lists one entry per locale. The label comes from the current path: `/v1/…` shows `v1`. Picking
an entry routes to that version's root. No props, no configuration.

## Why it never got wired

`makeConfig()` already solves this. When a docs tree has more than one version it puts a
version dropdown straight into the navbar:

```ts
// makeConfig.ts, per locale
nav: [
  ...sectionNav,
  ...(versions.length > 1 ? [versionDropdown(v)] : []),
  ...navLinks,
];
```

So a multi-version site gets version switching from the config, through VitePress' own nav,
with no component involved. This playground has one version, `v1`, which is why there is no
dropdown in the navbar above.

That leaves `VersionSwitcher` as a second implementation of a solved problem. It is kept
because nothing here is being deleted without knowing what depends on it, even though the
export surface says nothing can.

## If you want it anyway

It would need the same treatment `WidthToggle` gets: an option on `createTheme()` and a slot
to mount into.

```ts
// theme/index.ts, sketch
if (versionSwitcher) {
  slots["nav-bar-content-before"] = () => h(VersionSwitcher);
}
```

Before doing that, compare it with the navbar dropdown on a real two-version site and decide
which one you want to keep. Two controls doing the same thing in the same navbar is worse
than either alone.
