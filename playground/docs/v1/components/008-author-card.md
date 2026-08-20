---
title: AuthorCard
status: published
updated_at: 2026-08-13
order: 9
---

Who stands behind the document. A byline with evidence: the name and role carry the claim,
the slot carries what backs it up. Put it at the head of an analysis, or at the foot of a
decision record next to the person who signed it.

<AuthorCard name="Václav Mičulka" role="CTO a co-founder TechFides" avatar="/avatar-placeholder.svg">

- 12 let vedení vývojového týmu TechFides.
- Analytika a návrh architektury 30+ komplexních systémů.
- Odpovědnost a dohled nad realizací 70+ softwarových projektů.

</AuthorCard>

Without a portrait it collapses to the text alone, so a page can carry a byline before
anyone has supplied a photo:

<AuthorCard name="Anna Dvořáková" role="Lead analyst">

Owns the requirements catalogue and the glossary. Ask here before adding a term.

</AuthorCard>

## Props

| Prop     | Default | Effect                                                          |
| -------- | ------- | --------------------------------------------------------------- |
| `name`   | —       | The person's name. Required.                                    |
| `role`   | —       | Shown under the name. Omit to drop the line.                    |
| `avatar` | —       | Portrait path, resolved against the site base. Omit to drop it. |
| `alt`    | `""`    | Alternative text for the portrait. See below before setting it. |

`alt` is empty on purpose. The name sits beside the portrait in text, so a screen reader
announcing the photo as well would only repeat it. Set `alt` when the picture carries
something the name does not.

## Slots

| Slot    | Holds                                                                             |
| ------- | --------------------------------------------------------------------------------- |
| default | The evidence. A Markdown list, a paragraph, or both. Leave blank lines around it. |

## Usage

```md
<AuthorCard name="Václav Mičulka" role="CTO a co-founder TechFides" avatar="/team/vaclav.jpg">

- 12 let vedení vývojového týmu TechFides.
- Analytika a návrh architektury 30+ komplexních systémů.

</AuthorCard>
```

Keep the opening tag on one line, however long it gets, and leave a blank line above the
content. Prettier reflows a tag split across lines and drops a blank line before the `>`,
which ends the HTML block early and fails the page build with `Invalid end tag`.

## Design

The quietest of the three panels. It is glass on the backdrop like the feature cards and
the spotlight, but it takes neither the bloom nor the accent hairline: a credential should
not compete with a call to action. The portrait's accent ring is a shadow rather than a
border, because a border would shrink the image inside the circle and pull the crop
off-centre.

The role sits on its own line instead of trailing the name behind a separator. A role runs
long in Czech, and any glyph placed between the two has to survive both languages.

Below 560px the portrait moves above the text. The list keeps the accent markers it gets
from the reading column, so it matches every other list on the page.
