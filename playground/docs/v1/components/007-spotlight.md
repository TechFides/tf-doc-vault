---
title: Spotlight
status: published
updated_at: 2026-08-13
---

A centred panel carrying one statement. With actions it sends the reader out of the document
to a product site, a demo, a related portal; without them it is the last word on a page.
Either way, use it once per page at most. Two of them on one screen and neither is a
spotlight any more.

<Spotlight title="Forge, náš AI agent, který z ticketu vyrobí draft MR" mark-frame>
  <template #mark>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="m8 12 3 3 5-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </template>

Konec cesty, kterou audit měří, si můžete prohlédnout naživo. Forge dnes běží v provozu a
má vlastní web: s ceníkem, kalkulačkou úspor i možností domluvit si demo.

<template #actions>
<a class="tf-btn tf-btn--primary" href="https://goforge.tech">goforge.tech</a>
<a class="tf-btn" href="/v1/showcase/003-specification">Kam se dá dojít</a>
</template>
</Spotlight>

Every part except the copy is optional. Drop the mark and the actions and the same panel
becomes a closing statement, which is the other thing it is for: the last word on a page,
with nowhere to click.

<Spotlight eyebrow="Kdo audit provádí, TechFides" title="Viděli jste celou metodiku. Teď poznejte firmu, která s ní pracuje.">

Agentic standard, měřená AI zralost, projektový checklist i Forge: všechno, čím jste právě
prošli, je náš každodenní provoz, ne metodika napsaná pro audit. A stojí za ním brněnský
software house založený vývojáři pro vývojáře: 12 let nepřetržitého růstu, 70+ doručených
projektů a kvalita doložená v číslech.

</Spotlight>

## Props

| Prop      | Default | Effect                                           |
| --------- | ------- | ------------------------------------------------ |
| `title`   | —       | Headline. Omit to drop the row.                  |
| `eyebrow` | —       | Small uppercase label above it. Omit to drop it. |

The headline renders as a paragraph, not a heading, so it stays out of the "On this page"
outline. A promotional line listed there reads as a section of the document.

## Slots

| Slot      | Holds                                                                   |
| --------- | ----------------------------------------------------------------------- |
| default   | The copy. Capped at 52 characters per line, narrower than the panel.    |
| `mark`    | A logo or icon above the eyebrow. Inline SVG or `img`, either works.    |
| `actions` | The buttons. Compose them yourself with `tf-btn` and `tf-btn--primary`. |

The actions slot takes your own markup rather than a list prop, so the emphasis is yours to
place: one primary and one quiet, two quiet ones, or a single link.

## Usage

```md
<Spotlight eyebrow="Product" title="Forge, our agent that drafts the MR">
  <template #mark>
    <img src="/logo.svg" alt="" />
  </template>

Body copy. Markdown works here, so a link or `code` behaves as it does anywhere else.

<template #actions>
<a class="tf-btn tf-btn--primary" href="https://goforge.tech">goforge.tech</a>
<a class="tf-btn" href="/where-this-leads">Where this leads</a>
</template>
</Spotlight>
```

Leave a blank line around the Markdown body. Without it the content lands inside the
preceding `<template>` and the copy slot comes out empty.

## Design

Glass rather than the filled slab a promo block usually is: it lies on the backdrop like a
feature card, and a solid accent fill would fight the nebula behind it and force white text
onto a mid-blue ground. What separates it from a card is the light, a bloom contained by the
panel's own overflow, and a static accent hairline along the top in the same colours the
hero's swept rim uses. The sweep itself stays the hero's alone.

The headline is set two steps above the copy rather than one, because the panel exists to
carry a single statement and the statement has to win. That is also what lets the same panel
work with the actions removed: with nothing to click, the headline is the whole point. Below
480px it steps back down, where the desktop size would read as a page title dropped inside a
card.

The mark stands free rather than sitting in a tinted tile. A brand mark carries its own
shape and colour and framing it fights both, while an icon glyph reads fine unframed. Only
its height is capped, at 40px, which is what makes a wide wordmark and a square glyph sit at
the same optical size; a mark wider than the panel shrinks to fit instead of overflowing.

Below 480px the buttons go full width, because two pills side by side wrap into an uneven
pair on a phone.
