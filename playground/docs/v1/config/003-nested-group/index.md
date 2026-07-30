---
title: Nested group
status: published
updated_at: 2026-07-30
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
| nothing emoji-like, item is `.collapsible` | `default-emoji-folder` | ◼️               |
| nothing emoji-like, item is a leaf         | `default-emoji-file`   | ▪️               |
| an emoji                                   | neither                | the author's own |

The prefixes are `::before` content in `base.css`, not characters in the
title, so they never reach the page text, the outline or the PDF export.

Both defaults carry `U+FE0F`, so Noto Color Emoji paints them and `color`
does nothing: the CSS only sets `font-size: 11px` and a fixed 14 px gutter
that keeps folder and file labels on one left edge. Measured, Noto renders
them `#454545`, which is **8.87:1** against the light sidebar and **2:1**
against the dark one, so they nearly vanish in dark mode. A text symbol
would inherit the label colour instead, see [Symbol pairs](#symbol-pairs).

## Candidate pairs

The pair in use is ◼️ / ▪️. Swapping is a two-line change in `base.css`, so
the alternatives stay here: the decision is easier with the options side by
side. They render at the real sidebar size (14 px) against the real sidebar
colour, which is the only way to judge them: most emoji that look fine in a
heading turn to mush at 14 px.

<div class="icon-candidates">

<div class="cand" style="--fi: '📁 '; --pi: '📄 '">
<p class="cand-label"><b>📁 / 📄</b> previous default</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '📂 '; --pi: '📄 '">
<p class="cand-label"><b>📂 / 📄</b> open folder</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '🗂️ '; --pi: '📄 '">
<p class="cand-label"><b>🗂️ / 📄</b> dividers</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '🗃️ '; --pi: '🗒️ '">
<p class="cand-label"><b>🗃️ / 🗒️</b> box + notepad</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '📚 '; --pi: '📄 '">
<p class="cand-label"><b>📚 / 📄</b> books</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '📚 '; --pi: '📖 '">
<p class="cand-label"><b>📚 / 📖</b> pure book metaphor</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '📘 '; --pi: '📄 '">
<p class="cand-label"><b>📘 / 📄</b> blue book</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '📖 '; --pi: '📃 '">
<p class="cand-label"><b>📖 / 📃</b> open book + curl</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '🗄️ '; --pi: '📄 '">
<p class="cand-label"><b>🗄️ / 📄</b> cabinet</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '📦 '; --pi: '📄 '">
<p class="cand-label"><b>📦 / 📄</b> package</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '🔹 '; --pi: '▫️ '">
<p class="cand-label"><b>🔹 / ▫️</b> abstract</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '📁 '; --pi: '·  '">
<p class="cand-label"><b>📁 / ·</b> folder + middot</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc">Integrace</li></ul>
</div>

</div>

## Symbol pairs

Geometric symbols are the quieter option, and they are not a compromise on
consistency: the Google Fonts build of Open Sans ships a **symbols subset
covering `U+25A0-27BF`**, the whole Geometric Shapes block plus Dingbats.
They arrive from the same web font as the body text.

They also do something no emoji can: they are text, so they inherit
`currentColor` and `font-size`. The icon can be muted to
`--vp-c-text-3` and pick up the brand colour on the active item, which is
why these read as part of the UI rather than as stickers on it.

<div class="icon-candidates symbols">

<div class="cand" style="--fi: '▸ '; --pi: '· '">
<p class="cand-label"><b>▸ / ·</b> file tree</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '◆ '; --pi: '◇ '">
<p class="cand-label"><b>◆ / ◇</b> diamond fill</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '● '; --pi: '○ '">
<p class="cand-label"><b>● / ○</b> circle fill</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '■ '; --pi: '□ '">
<p class="cand-label"><b>■ / □</b> square fill</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '◆ '; --pi: '• '">
<p class="cand-label"><b>◆ / •</b> diamond + bullet</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '❯ '; --pi: '· '">
<p class="cand-label"><b>❯ / ·</b> chevron</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '» '; --pi: '· '">
<p class="cand-label"><b>» / ·</b> guillemet</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '◉ '; --pi: '○ '">
<p class="cand-label"><b>◉ / ○</b> fisheye</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '▣ '; --pi: '▫ '">
<p class="cand-label"><b>▣ / ▫</b> nested square</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '◈ '; --pi: '◇ '">
<p class="cand-label"><b>◈ / ◇</b> diamond inset</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '▾ '; --pi: '– '">
<p class="cand-label"><b>▾ / –</b> caret + dash</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

<div class="cand" style="--fi: '§ '; --pi: '· '">
<p class="cand-label"><b>§ / ·</b> section sign</p>
<ul><li class="grp">Architektura</li><li class="doc">Přehled</li><li class="doc act">Integrace</li></ul>
</div>

</div>

The third row in each card is styled as the active item, to show the
symbol taking the brand colour.

Two ranges to stay out of. **Box drawing** (`│ ├ └ ─`, `U+2500-257F`) falls
between the Open Sans subsets and is covered by neither web font, so the OS
decides how it looks. And any symbol carrying the Unicode `Emoji` property,
`▪ U+25AA` and `▫ U+25AB` among them, gets handed to Noto Color Emoji by
Chrome even though Open Sans covers it: measured in the live stack `▪` comes
out 49.81 px wide against Open Sans' 14.19 px, so it renders as a chunky
colour square instead of a text mark. `▣ / ▫` above shows that effect.

<style scoped>
.icon-candidates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px 20px;
  margin: 20px 0;
}
.icon-candidates .cand {
  background: var(--vp-sidebar-bg-color);
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  padding: 10px 12px;
}
.icon-candidates .cand-label {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.icon-candidates .cand-label b {
  font-weight: 400;
}
.icon-candidates ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.icon-candidates li {
  font-size: 14px;
  line-height: 28px;
  color: #2d3748;
  white-space: nowrap;
}
.dark .icon-candidates li {
  color: rgba(255, 255, 255, 0.85);
}
.icon-candidates li.grp::before {
  content: var(--fi);
}
.icon-candidates li.doc {
  padding-left: 16px;
}
.icon-candidates li.doc::before {
  content: var(--pi);
}

/* Symbols are text, so unlike the emoji cards these prefixes can be sized
   and coloured independently of the label. */
.icon-candidates.symbols li::before {
  color: var(--vp-c-text-3);
  font-size: 11px;
}
.icon-candidates.symbols li.act,
.icon-candidates.symbols li.act::before {
  color: var(--brand-primary);
}
.dark .icon-candidates.symbols li.act,
.dark .icon-candidates.symbols li.act::before {
  color: var(--brand-secondary);
}
</style>
