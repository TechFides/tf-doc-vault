---
title: PageBackdrop
status: published
updated_at: 2026-08-13
order: 12
---

You are looking at it. The nebula behind this page and, in dark mode, the star field over it
are `PageBackdrop`, mounted once into VitePress' `layout-top` slot. Once per layout rather
than once per route, because remounting would restart the star cycles on every navigation.

Switch the theme with the toggle in the navbar to see both halves: the clouds are in both
modes, the stars only in dark.

## Structure

```
tf-backdrop            fixed, z-index -1, contain: strict
├── tf-backdrop__nebula   four clouds on one layer, drifting on a 150s cycle
└── tf-backdrop__stars    four layers pulsing on 11, 14, 17 and 21s
```

The staggered star periods are what make the field scintillate instead of blinking in
unison. The nebula is slow enough that you never catch it moving, you only notice the sky is
not where you left it.

## Turning it off

```ts
export default createTheme({ backdrop: false });
```

## Tuning it

| Token                 | Light      | Dark       | Effect                       |
| --------------------- | ---------- | ---------- | ---------------------------- |
| `--tf-nebula-opacity` | `1`        | `0.65`     | Strength of the whole nebula |
| `--tf-stars-opacity`  | `0`        | `0.55`     | Strength of the star field   |
| `--tf-nebula-1/2/3`   | 55/11/38 % | 46/30/38 % | The three clouds             |

Full reasoning, including why the two modes place the clouds differently and why light mode
has no stars, is in [BRANDING.md](https://github.com/TechFides/tf-doc-vault/blob/master/BRANDING.md#page-backdrop).

## Two things worth knowing

The page colour lives on `html`, and `body` plus the VitePress containers are pinned
transparent. The layer paints at `z-index: -1`, so any fill above it buries it, and the
result looks exactly like the component failing to mount.

Below 768px the whole backdrop stands down. The reading column goes full-bleed and
transparent there, leaving no gutter and no glass, so every cloud and every star would land
on a line of text. Resize this window past that breakpoint and the sky disappears.
