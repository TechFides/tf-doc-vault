---
title: Nested group
status: published
updated_at: 2026-08-13
---

This folder exists so the sidebar renders a **collapsible group**. Look at the left
menu: this item carries the default square marker, its children carry a dot, and one
child overrides both with an emoji of its own.

Nothing else in the playground was nested, so the folder branch of
`SidebarDefaultEmoji.vue` had no live example and a regression in it would have gone
unnoticed.

## What produces a group

`buildSidebarItems()` in `src/sidebar/index.ts` maps a **directory** to a group with
`collapsed: true` and recurses into it. A `.md` file becomes a leaf item. So the only
thing that creates a folder in the sidebar is a subdirectory on disk.

The group's label comes from this `index.md`'s `title:`. Without an `index.md` the
generator falls back to the directory name and the group gets no link, only a toggle.

## Where the markers come from

`SidebarDefaultEmoji.vue` walks `.VPSidebar .VPSidebarItem > .item .text` and tags
each label:

| Label starts with                          | Class / DOM            | Rendered marker  |
| ------------------------------------------ | ---------------------- | ---------------- |
| nothing emoji-like, item is `.collapsible` | `default-emoji-folder` | 6px square       |
| nothing emoji-like, item is a leaf         | `default-emoji-file`   | 5px dot          |
| an emoji                                   | `span.tf-sb-marker`    | the author's own |

All three land in the same slot, `--tf-sb-marker-slot` wide. The slot is absolutely
positioned in the label's padding, so it adds no width and every label starts at the
padding edge no matter what the marker is. That is why the emoji row lines up with
the others: the component moves the glyph out of the text and into the slot.

The indent step per nesting level is the slot width too, so a child's marker sits in
the column where its parent's label starts. The drawn markers are a centred
background in `--tf-color-disabled`, the active entry's takes the accent, and
`content: "" / ""` keeps the accessible name blank so screen readers skip them.

## Aligning it was not a matter of taste

Three marker kinds in the text flow meant three label positions: a 6px square, a 4px
dot and a ~17px emoji each pushed their label to a different x, and the emoji row sat
12px left of the rest because it had no slot at all. On top of that VitePress indents
a level-1 group's children by 24px and a level-0 group's by nothing, so the same
nesting move cost a different amount of space depending on how deep it happened.

Both are structural, not cosmetic, which is why the fix is a slot and one step rather
than adjusted numbers.

## Why the defaults are drawn, not written

The defaults used to be the emoji ◼️ and ▪️. Anything carrying `U+FE0F` is handed to
Noto Color Emoji, and that font paints its own colour: ◼️ arrives near-black and ◻️
near-white whatever `color` says. That is why there were two glyph pairs instead of
one pair recoloured, and why the theme had to swap them per mode to keep either one
legible against the sidebar.

A filled box reads the tokens like every other surface in the theme, so the mode swap
and the second glyph pair are both gone, and the marker can follow the accent on the
active entry.

## The `U+FE0F` trap is still live

It applies to any emoji you put in a `title:`, and to symbols that merely look like
plain text. Anything carrying the Unicode `Emoji` property, `▪ U+25AA` and
`▫ U+25AB` among them, goes to Noto Color Emoji in Chrome even without `U+FE0F` and
even though the body font covers it. Measured in the live stack at 14px, `▪` comes out
17.44 px wide through the body stack against 7.09 px when IBM Plex Sans is forced,
so it lands nearly two and a half times wider than the text around it.
**Box drawing** (`│ ├ └ ─`,
`U+2500-257F`) has the opposite problem: it falls between the web font subsets and is
covered by neither, so the OS decides how it looks.

Geometric shapes outside those ranges are safe and behave as text: `■ □ ◆ ◇ ● ○` in
`U+25A0-27BF` arrive from the same web font as the body text and inherit
`currentColor` and `font-size`.
