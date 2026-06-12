---
title: Diagrams
status: published
updated_at: 2026-05-22
---

Three different Mermaid diagram types, all picking up the brand
palette from the `--brand-*` CSS tokens (light and dark mode).

## Flowchart — process with decisions

```mermaid
flowchart TD
    Start([User opens docs]) --> Search{Search box used?}
    Search -- Yes --> Match{Result match?}
    Search -- No --> Browse[Browse sidebar]
    Match -- Yes --> Page[Open page]
    Match -- No --> Empty[Empty state shown]
    Browse --> Page
    Page --> Read[Read content]
    Empty --> Browse
    Read --> End([Done])
```

## Sequence — DocMeta rendering

```mermaid
sequenceDiagram
    participant MD as Markdown
    participant VP as VitePress
    participant DM as DocMeta
    participant UI as Browser

    MD->>VP: frontmatter (status, updated_at)
    VP->>DM: useData() → frontmatter
    DM->>DM: format date by site.lang
    DM->>UI: render badge + date
    UI-->>DM: page mounted
    DM-->>UI: show "Created by Techfides"
```

## Class — theme component tree

```mermaid
classDiagram
    class Theme {
        +extends DefaultTheme
        +Layout() VNode
        +enhanceApp(app)
    }

    class DocMeta {
        +frontmatter
        +isEnglish
        +formatDate(value)
    }

    class NotFound {
        +labels
        +homeLink
    }

    class ImageLightbox {
        +open(src)
        +close()
    }

    class BrandFooter {
        +websiteUrl
        +email
        +address
    }

    Theme --> DocMeta : mounts in doc-before
    Theme --> NotFound : mounts in not-found
    Theme --> ImageLightbox : mounts in layout-bottom
    Theme --> BrandFooter : mounts in layout-bottom
```
