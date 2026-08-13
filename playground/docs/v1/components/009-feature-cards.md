---
title: FeatureCards
status: published
updated_at: 2026-08-13
features:
  - icon: business
    title: Components
    description: A card with a link. The whole card is the target, it lifts on hover, and the row at the foot says where it goes.
    link: /v1/components/
    linkText: Browse components
  - icon: technical
    title: Config & Sidebar
    description: The link text is yours to set. Leave it out and the card falls back to the theme's own wording for the locale.
    link: /v1/config/
  - icon: functional
    title: Runs on Node 24
    description: No link on this one, so it is a statement rather than a door. Not clickable, no hover lift, no row at the foot.
---

The row of cards on a landing page. Driven by frontmatter rather than props, so the page
declares its own cards and the component renders whatever it finds. A page without a
`features` block can place the component safely and get nothing.

<FeatureCards />

Three of the cards above are the component's whole surface: the first has a link and its own
link text, the second has a link and takes the theme's wording, the third has no link at
all.

## Frontmatter

Each entry in `features` takes:

| Key           | Default               | Effect                                                       |
| ------------- | --------------------- | ------------------------------------------------------------ |
| `title`       | —                     | Card heading. Required.                                      |
| `description` | —                     | The body copy. Required.                                     |
| `icon`        | `business`            | One of `business`, `functional`, `technical`.                |
| `link`        | —                     | Where the card leads. Omit for a card that is not clickable. |
| `linkText`    | theme's `feature.cta` | The label at the foot. Only used when `link` is set.         |

## No link, no door

Omit `link` and the card renders as a plain block: no anchor, no pointer, no hover lift, no
row at the foot. Use it for a fact that has nowhere to go, such as a constraint or a
version, next to cards that do lead somewhere.

The distinction is carried by the element itself. With a link the card is an `<a>`, without
one it is a `<div>`, and every interactive style hangs off `a.feature-card`. So a card
without a link cannot pick up hover or focus behaviour by accident.

## Usage

```md
---
features:
  - icon: business
    title: Components
    description: Everything the theme ships.
    link: /v1/components/
    linkText: Browse components
  - icon: functional
    title: Runs on Node 24
    description: A statement, not a door.
---

<FeatureCards />
```

## Design

Glass on the backdrop, like the spotlight and the author card, because the row sits outside
the reading panel and has to soften the stars behind it itself. On hover a linked card lifts
two pixels, its border takes the accent, and the icon tile fills with the accent gradient
while the glyph flips to white: the card's own colour arriving rather than a generic
highlight. The lift is dropped under `prefers-reduced-motion`.

One column below 480px, two up to 768px, three above it.
