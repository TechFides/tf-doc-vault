---
title: tf-doc-vault
aside: false
hero:
  title: tf-doc-vault
features:
  - icon: business
    title: Components
    description: Vue components available in every docs site — DocMeta, FeatureCards, BrandHero, ImageLightbox, task lists, and more.
    link: /v1/components/
    linkText: Browse components
  - icon: technical
    title: Config & Sidebar
    description: makeConfig() factory, sidebar and nav generator, version handling, and all VitePress integration options.
    link: /v1/config/
    linkText: Read the docs
  - icon: functional
    title: Design Tokens
    description: Brand colors, typography scale, spacing, surface and border tokens — the visual foundation of every site built on this platform.
    link: /v1/tokens/
    linkText: Explore tokens
---

<BrandHero>
  <template #subtitle>
    VitePress theme, config factory, and CLI tooling for TechFides documentation sites.
  </template>
</BrandHero>
<FeatureCards/>

---

## Playground

A local sandbox wired directly to `src/theme/` via Vite HMR.
Open [v1/](/v1/) to see DocMeta, code blocks, Mermaid diagrams, and tables with real content.

Edit anything under `src/theme/` and the preview updates instantly — no rebuild needed.

### Getting started

```bash
pnpm install      # builds dist/ via prepare
pnpm dev:docs     # starts the playground at localhost:5173
```

### Structure

| Path | Purpose |
|---|---|
| `src/theme/` | Vue components, styles, composables |
| `src/config/` | `makeConfig()` factory and VitePress integration |
| `src/sidebar/` | Sidebar and nav generator |
| `src/cli/` | `tf-doc-vault` and `create-ana` CLI entrypoints |
| `playground/docs/` | This sandbox — not published |
