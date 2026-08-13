---
title: Pattern classes
status: published
updated_at: 2026-08-13
---

The theme's author-facing CSS. These are classes you write in Markdown, not Vue components,
which is why they lived only on a showcase page until now. From a maintenance point of view
that split was the wrong one: whether a thing is a `.vue` file or a class is the theme's
business, not the writer's. This page is the reference; [Pattern
classes](../showcase/002-patterns) stays as the visual sheet for judging them side by side.

They live in `theme/styles/patterns.css`, imported last, so a class you put in Markdown
outranks the chrome rules that style the page around it.

## Type

| Class          | Effect                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| `tf-eyebrow`   | Uppercase accent label above a heading, so the heading needs no prefix. |
| `tf-lead`      | Larger muted opening paragraph.                                         |
| `tf-grad-text` | Gradient-filled text for one figure or phrase.                          |

<p class="tf-eyebrow">Section label</p>
<p class="tf-lead">A lead paragraph, one step up in size and muted, for the sentence that opens a page.</p>
<p><strong class="tf-grad-text">70+ projects</strong> in gradient text.</p>

```md
<p class="tf-eyebrow">Section label</p>
<p class="tf-lead">The sentence that opens a page.</p>
<strong class="tf-grad-text">70+ projects</strong>
```

The gradient clips to the whole block, so a phrase broken over two lines runs one gradient
across both. Without `background-clip: text` support it falls back to the flat accent rather
than vanishing.

## Cards and figures

| Class            | Effect                                                       |
| ---------------- | ------------------------------------------------------------ |
| `tf-cards`       | Auto-fitting grid, one column at a time as the space allows. |
| `tf-card`        | A single panel inside it.                                    |
| `tf-stat`        | Wrapper for one figure and its label.                        |
| `tf-stat__value` | The figure. Display face, tabular figures.                   |
| `tf-stat__label` | The caption under it.                                        |
| `tf-tile`        | Square icon tile, for a card that opens with a glyph.        |
| `tf-tile--grad`  | The same tile filled with the accent gradient.               |

<div class="tf-cards">
  <div class="tf-card">
    <div class="tf-stat">
      <div class="tf-stat__value">12</div>
      <div class="tf-stat__label">Years of growth</div>
    </div>
  </div>
  <div class="tf-card">
    <div class="tf-stat">
      <div class="tf-stat__value">70+</div>
      <div class="tf-stat__label">Projects delivered</div>
    </div>
  </div>
  <div class="tf-card">
    <div class="tf-stat">
      <div class="tf-stat__value">30+</div>
      <div class="tf-stat__label">Systems designed</div>
    </div>
  </div>
</div>

```md
<div class="tf-cards">
  <div class="tf-card">
    <div class="tf-stat">
      <div class="tf-stat__value">12</div>
      <div class="tf-stat__label">Years of growth</div>
    </div>
  </div>
</div>
```

The grid's column floor is 180px rather than 240px, because the reading column is sized to
the measure and a larger floor drops a three-card row to two.

## Chips and steps

| Class             | Effect                                         |
| ----------------- | ---------------------------------------------- |
| `tf-chips`        | Row of chips, wrapping.                        |
| `tf-chip`         | One chip.                                      |
| `tf-chip--accent` | The same chip in the accent.                   |
| `tf-step`         | Numbered circle marker.                        |
| `tf-checks`       | Turns a plain list into check rows. See below. |

<div class="tf-chips">
  <span class="tf-chip">Node 24</span>
  <span class="tf-chip">TypeScript 6</span>
  <span class="tf-chip tf-chip--accent">Recommended</span>
</div>

<p><span class="tf-step">1</span> A step marker beside its line.</p>

```md
<div class="tf-chips">
  <span class="tf-chip">Node 24</span>
  <span class="tf-chip tf-chip--accent">Recommended</span>
</div>

<span class="tf-step">1</span>
```

Only reach for `tf-step` when the content really is a sequence. On an unordered set the
numbers claim an order that is not there.

`tf-checks` goes on the element holding a list, and the items keep their own markup:

<div class="tf-checks">

- **A settled point**: the term takes the page's colour, the explanation stays quiet.
- **Another one**: the check is masked from the same shape the theme's checked box uses.

</div>

```md
<div class="tf-checks">

- **A settled point**: with its explanation.

</div>
```

Use it rather than a task list where the items are established facts. Real checkboxes are
interactive, and a page of them invites a reader to click things that do nothing.
[StepCard](./019-step-card) and [ReferenceCard](./020-reference-card) both apply it for you.

## Buttons

| Class             | Effect                    |
| ----------------- | ------------------------- |
| `tf-btn`          | Quiet button or link.     |
| `tf-btn--primary` | The accent gradient fill. |

<p>
  <a class="tf-btn tf-btn--primary" href="./016-pattern-classes">Primary</a>
  <a class="tf-btn" href="./016-pattern-classes">Quiet</a>
</p>

```md
<a class="tf-btn tf-btn--primary" href="/somewhere">Primary</a>
<a class="tf-btn" href="/somewhere">Quiet</a>
```

Works on both `a` and `button`. The colour declarations carry `!important`, because no class
selector beats `.dark .vp-doc a` on an anchor: that is (0,2,1) while `:is(a, button).tf-btn`
is (0,1,1), `:is()` taking the specificity of its heaviest argument.

## Rows and rules

| Class        | Effect                                                |
| ------------ | ----------------------------------------------------- |
| `tf-rows`    | Label and value pairs separated by hairlines.         |
| `tf-divider` | Gradient rule, for a break stronger than white space. |

<dl class="tf-rows">
  <dt>Runtime</dt>
  <dd>Node 24</dd>
  <dt>Package manager</dt>
  <dd>pnpm 11.1.3</dd>
</dl>

<hr class="tf-divider" />

```md
<dl class="tf-rows">
  <dt>Runtime</dt>
  <dd>Node 24</dd>
</dl>

<hr class="tf-divider" />
```

`tf-rows` accepts a `dl` with `dt`/`dd` pairs, or any element whose children each hold two
elements. Use the `dl` where the pairs really are terms and definitions.

## Attributes

| Attribute          | Effect                                                               |
| ------------------ | -------------------------------------------------------------------- |
| `data-tf-edge`     | The swept gradient rim. Used by `BrandHero`; available to any panel. |
| `data-tf-reveal`   | Fades this element's children in as they enter the viewport.         |
| `data-tf-skeleton` | Shimmering placeholder block, for content that is still loading.     |

<div class="tf-card" data-tf-edge>
  <p>A card carrying the swept rim.</p>
</div>

<div data-tf-reveal>
  <p>These children fade in on scroll.</p>
</div>

<div data-tf-skeleton style="height: 2rem"></div>

```md
<div class="tf-card" data-tf-edge>…</div>
<div data-tf-reveal>…</div>
<div data-tf-skeleton style="height: 2rem"></div>
```

`data-tf-reveal` and `data-tf-skeleton` were shipped and never demonstrated anywhere until
this page. Every animation among them stops under `prefers-reduced-motion`, and the reveal
leaves its children visible rather than hidden when motion is off.

## What is not here

`tf-table` and the sidebar marker classes exist too, but the theme applies them itself:
`TableEnhancer` tags tables, and `SidebarDefaultEmoji` tags sidebar rows. Writing them by
hand is not the intended use, so they are not part of this surface.
