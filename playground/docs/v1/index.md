---
title: Overview
status: published
updated_at: 2026-05-22
---

Local sandbox for theme + config development. Edit anything under
`src/theme/components/*.vue`, `src/theme/styles/*.css`, or
`src/config/makeConfig.ts` and Vite HMR re-renders the page instantly
— no `pnpm build`, no restart.

## What to test here

- **Theme components** — `DocMeta`, `ImageLightbox`, `PrintLayout`,
  `WidthToggle`, plus the branding components when they live on the
  branding branch
- **Brand tokens + dark mode** — `theme/styles/base.css`
- **Config factory** — `makeConfig()` behavior (sidebar, nav, locales)
- **Mermaid + images** — lightbox cursor, dark-mode contrast

## Sections

Browse the sections in the top nav (Components, Tokens, Config) to see
sidebar navigation, inactive menu states, and how the theme handles
multi-page docs.
