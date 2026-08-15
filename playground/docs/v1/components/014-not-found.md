---
title: NotFound
status: published
updated_at: 2026-08-13
---

The 404 page, mounted into VitePress' `not-found` slot so it replaces the default one.

To see it, put a path that does not exist in the address bar, such as this page's URL with a
few characters appended. There is no link to it from here on purpose: VitePress fails the
build on dead links, and one placed for convenience would have to be excused in the config,
which would blunt the check for every real link in the site.

## What it renders

The site's logo mark, then the code, a heading, a line of explanation and a link home. Every
string comes from the theme's i18n bundle under `notFound.*`, so a Czech site gets Czech
without touching the component.

| Key                | Shown as                   |
| ------------------ | -------------------------- |
| `notFound.code`    | The small `404` label      |
| `notFound.heading` | The heading                |
| `notFound.message` | The line under it          |
| `notFound.link`    | The label of the home link |

## Where the home link points

At `theme.logoLink`, which `makeConfig()` sets to the site's effective base, and at
`site.base` if that is missing. Never at a bare `/`: on a site served under a subpath, such
as GitLab Pages or a versioned deploy, `/` would leave the site altogether.

That fallback order is the reason to configure the base properly rather than patching this
component. Get `base` right and the 404 leads home from every deploy target.
