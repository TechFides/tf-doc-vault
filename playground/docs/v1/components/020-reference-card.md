---
title: ReferenceCard
status: published
updated_at: 2026-08-13
---

One delivered project: whose it was, what it was, what it involved, and who will vouch for it.
Built to sit in a grid of these, so it is a column rather than a band and nothing in it depends
on the card being wide.

<div class="tf-cards">
<ReferenceCard logo="/logo-placeholder.svg" client="ExampleFin" title="Komplexní systém pro nebankovní půjčky" contact="Václav Hradec" contact-role="CTO, reference k dispozici">

- Refactoring a následné přepsání původního zastaralého systému.
- Dodání nových modulů a finančních produktů.
- Business analýza se zaměřením na efektivní tvorbu návrhů s využitím AI nástrojů.

<template #tags>
<span class="tf-chip">Analýza</span>
<span class="tf-chip">Vývoj</span>
<span class="tf-chip">QA</span>
<span class="tf-chip">PM</span>
<span class="tf-chip">Cloud</span>
</template>

</ReferenceCard>

<ReferenceCard title="Interní portál pro správu smluv" contact="Anna Dvořáková" contact-role="Head of Operations">

- Migrace ze sdílených tabulek do jednoho systému.
- Napojení na fakturaci a na Jiru.

</ReferenceCard>
</div>

The second card has no logo and no tags, which is what a reference looks like before the
client has approved either. Both sit in a `tf-cards` grid, which is how they are meant to be
placed.

## Props

| Prop            | Default | Effect                                                             |
| --------------- | ------- | ------------------------------------------------------------------ |
| `logo`          | —       | Client logo, resolved against the site base. Omit to drop the row. |
| `client`        | `""`    | The client's name, used as the logo's alternative text.            |
| `title`         | —       | What was delivered. Omit to drop the row.                          |
| `contact`       | —       | Who vouches for it. Omit to drop the whole footer.                 |
| `contactRole`   | —       | A quiet line under the name.                                       |
| `contactAvatar` | —       | Their photo. Without one the footer uses their initials.           |
| `initials`      | derived | Override, for a name the first letters get wrong.                  |

Initials come from the first letters of the first two words: `Václav Hradec` gives `VH`. Set
`initials` where that is wrong, such as a name carrying a title or a middle particle.

## Slots

| Slot    | Holds                                                            |
| ------- | ---------------------------------------------------------------- |
| default | What the work involved, as a plain Markdown list.                |
| `tags`  | The chips above the footer. Use `tf-chip` and `tf-chip--accent`. |

## Usage

```md
<ReferenceCard logo="/clients/examplefin.svg" client="ExampleFin" title="Komplexní systém pro nebankovní půjčky" contact="Václav Hradec" contact-role="CTO, reference k dispozici">

- Refactoring a následné přepsání původního zastaralého systému.
- Dodání nových modulů a finančních produktů.

<template #tags>
<span class="tf-chip">Analýza</span>
<span class="tf-chip">Vývoj</span>
</template>

</ReferenceCard>
```

Wrap several in `<div class="tf-cards">` to get the grid. Keep each opening tag on one line;
Prettier reflows a tag split across lines and fails the page build.

## Design

The logo is flattened to one ink colour and sits straight on the glass. A row of references is a
logo wall, and a wall of full-colour marks reads as a ransom note; one colour makes it a set.
It also lets the card keep its own material instead of carrying a white rectangle that belonged
to nothing else on the page.

`brightness(0)` collapses the mark to black for light mode and dark mode inverts that to white,
so **give it a logo with a transparent background**. A baked-in white one flattens to a solid
block.

Without a photo the contact gets their initials on an accent tint rather than a generic avatar
glyph: initials say who it is, a silhouette says only that somebody is missing. Both the
initials and a photo take the same accent ring, so the two are interchangeable in a row.

The hairline above the footer belongs to the footer rather than to a separate divider, so a
card with no contact has no rule dangling at its foot.

The check rows come from `tf-checks`, documented under [Pattern
classes](./016-pattern-classes) and shared with [StepCard](./019-step-card). Write the points
as a plain list; the class draws the checks.
