---
title: Deeper group
status: published
updated_at: 2026-07-30
---

A group inside a group: `buildSidebarItems()` recurses, so nesting has no
depth limit and every level gets its own ◼️.

VitePress indents each level and only renders the toggle for `collapsed`
items, so a deep tree stays readable, but three levels is already a lot to
ask of a reader. Prefer a flatter layout and let the numeric filename
prefixes carry the order.
