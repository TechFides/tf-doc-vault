---
title: 🎯 Custom icon
status: published
updated_at: 2026-07-30
order: 2
---

This page's `title:` starts with an emoji, so no default marker is added: the
author's 🎯 replaces the dot a leaf would otherwise get.

`EMOJI_RE` in `SidebarDefaultEmoji.vue` is
`/^(\p{Emoji_Presentation}|\p{Emoji}️)/u`. The second branch needs the variation
selector `U+FE0F`, so a text-presentation character only counts when it is written
as an emoji: `ℹ️` suppresses the default icon, a bare `ℹ` does not.

In the sidebar the component moves the glyph into the marker slot and marks it
`aria-hidden`, so it lines up with the drawn markers and the link still reads
"Custom icon". Everywhere else it stays what it is: real text in the title, so it
does reach the browser tab and the PDF bookmarks. That is the difference from the
defaults, which are `::before` content and never part of the title at all.
