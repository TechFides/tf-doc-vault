---
title: Nested group
status: published
updated_at: 2026-07-31
---

This folder exists so the sidebar renders a **collapsible group**. Look at
the left menu: this item carries the default ◼️ marker, its children carry
▪️, and one child overrides both.

Nothing else in the playground was nested, so the folder branch of
`SidebarDefaultEmoji.vue` had no live example and a regression in it would
have gone unnoticed.

## What produces a group

`buildSidebarItems()` in `src/sidebar/index.ts` maps a **directory** to a
group with `collapsed: true` and recurses into it. A `.md` file becomes a
leaf item. So the only thing that creates a folder in the sidebar is a
subdirectory on disk.

The group's label comes from this `index.md`'s `title:`. Without an
`index.md` the generator falls back to the directory name and the group
gets no link, only a toggle.

## Where the icons come from

`SidebarDefaultEmoji.vue` walks `.VPSidebar .VPSidebarItem > .item .text`
and tags each label:

| Label starts with                          | Class                  | Rendered prefix  |
| ------------------------------------------ | ---------------------- | ---------------- |
| nothing emoji-like, item is `.collapsible` | `default-emoji-folder` | ◼️ (dark: ◻️)    |
| nothing emoji-like, item is a leaf         | `default-emoji-file`   | ▪️ (dark: ▫️)    |
| an emoji                                   | neither                | the author's own |

The prefixes are `::before` content in `base.css`, not characters in the
title, so they never reach the page text, the outline or the PDF export.
Each one carries `/ ""` so screen readers skip it.

## The `U+FE0F` trap

All four defaults carry `U+FE0F`, which hands the codepoint to Noto Color
Emoji. That font paints its own colour, so `color` does nothing and the
light and dark markers have to be two different glyph pairs rather than one
pair recoloured. Measured in the live stack:

| Pair                 | Noto paints        | Sidebar   | Contrast |
| -------------------- | ------------------ | --------- | -------- |
| ◼️ / ▪️ (light mode) | `rgb(70,70,70)`    | `#f4f6fb` | 8.7:1    |
| ◻️ / ▫️ (dark mode)  | `rgb(219,219,219)` | `#030f21` | 13.9:1   |

Keeping the dark glyphs in dark mode would have left them at 2:1, which is
where the split came from.

The same applies to symbols that look like plain text. Anything carrying
the Unicode `Emoji` property, `▪ U+25AA` and `▫ U+25AB` among them, goes to
Noto Color Emoji in Chrome even without `U+FE0F` and even though Open Sans
covers it: measured in the live stack `▪` comes out 49.81 px wide against
Open Sans' 14.19 px. **Box drawing** (`│ ├ └ ─`, `U+2500-257F`) has the
opposite problem: it falls between the Open Sans subsets and is covered by
neither web font, so the OS decides how it looks.

Geometric shapes outside those ranges are safe and behave as text: the
Google Fonts build of Open Sans ships a symbols subset covering
`U+25A0-27BF`, so `■ □ ◆ ◇ ● ○` arrive from the same web font as the body
text and inherit `currentColor` and `font-size`.
