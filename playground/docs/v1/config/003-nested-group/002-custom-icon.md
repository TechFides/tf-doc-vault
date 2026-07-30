---
title: 🎯 Custom icon
status: published
updated_at: 2026-07-30
---

This page's `title:` starts with an emoji, so no default marker is added:
the author's 🎯 wins over ▪️.

`EMOJI_RE` in `SidebarDefaultEmoji.vue` is
`/^(\p{Emoji_Presentation}|\p{Emoji}️)/u`. The second branch needs the
variation selector `U+FE0F`, so a text-presentation character only counts
when it is written as an emoji: `ℹ️` suppresses the default icon, a bare
`ℹ` does not.

Unlike the `::before` prefixes, an emoji in `title:` is real text. It
reaches the nav label, the browser tab and the PDF bookmarks, which is why
the theme keeps the defaults decorative and out of the title.
