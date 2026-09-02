# PDF export

How `tf-doc-vault pdf` turns a docs tree into a document that can be sent to a
customer, and why each part is shaped the way it is.

## Chain

```
tf-doc-vault pdf
  build-print-page.js      docs/**            -> docs/print.md
  vitepress build docs     docs/print.md      -> docs/.vitepress/dist
  export-pdf.js            /print             -> artifacts/<name>.pdf
                                              -> artifacts/.pagemap.json
  (repeat, this time with --pages)
```

The chain runs twice. A table of contents cannot carry page numbers until the
document has been paginated, so the first pass exists to produce the anchor to
page map and the second one prints it. Numbering can in principle repaginate the
document, so the CLI compares the map between passes and repeats while it moves,
up to `PDF_MAX_PASSES` (3). If it still moves after that, the command exits
non-zero and says the contents may be a page out; the PDF of that last pass is
left in `artifacts/` and must not be sent.

## What goes into print.md

Every page the sidebar shows: `.md` files at any depth under `docs/<version>/`,
including those directly under the version directory, plus each group's
`index.md` as the page that opens it. A group without an `index.md` is not a page
and gets no anchor, but it still occupies a row in the contents, labelled by its
folder name the way the sidebar labels it: the contents indents by depth, so a
level that contributed nothing would leave its children hanging one level up.

Page titles are emitted as raw HTML, not Markdown:

```html
<h2 class="tf-page-title tf-page-title--d1">Analýza produktu</h2>
```

The level follows the page's depth so Chromium's `outline` option builds a
bookmark tree that mirrors the sidebar. The size follows the depth class instead,
or a group opener would shrink into a body heading. Raw HTML also keeps
VitePress' header anchor out of the bookmark label.

A page's own headings shift down by `HEADING_SHIFT` (2), counted from `h2` rather
than from their own level. The shift is a constant rather than the page's depth: a
page title never goes below `h3`, so a level counted from `h2` and shifted by 2
always lands below it, and a `##` then renders as `h4` wherever its page sits in
the tree, which is what keeps one look at every depth. Counting from `h2` is what
stops a page's own `# Heading` from landing on `h3` beside the title of a page
nested two levels down.

Two Czech authoring conventions are recognised:

- A `## Obsah` or `## Obsah skupiny` section is dropped. The generated contents
  replaces it, and two next to each other read as a bug.
- A `**Obrázek N** …` line is bound to the figure below it inside a `<figure>`.
  Wrapping rather than only reordering is what keeps the pair on one sheet; as
  sibling blocks the caption gets torn off into the page footer. Markdown images
  and raw `<img>` both count as the figure, and consecutive tags fold into one
  because a theme-dependent diagram ships as a light and dark pair. A caption
  whose figure is a Mermaid block has no tag to bind to and stays where it is.

## Branding

`tf-doc-vault.json` in the project root, `pdf` key. Absent means defaults: no
cover, no letterhead, `artifacts/docs-full.pdf`. Present but unparseable exits
non-zero rather than silently dropping a cover the author meant to have.

The generator and the exporter are separate Node processes that never load the
VitePress config, which is why this is a file of its own rather than a
`makeConfig` option.

```json
{
  "pdf": {
    "fileName": "TechFides-nabidka-acme.pdf",
    "mark": "TechFides",
    "footerLabel": "Nabídka pro Acme",
    "cover": {
      "eyebrow": "Návrh spolupráce pro Acme",
      "title": "Název nabídky",
      "subtitle": "Jedna věta.",
      "vendor": "TechFides Solutions s.r.o.",
      "website": "techfides.cz",
      "recipient": "Acme",
      "validUntil": "30. září 2026",
      "contact": "Jméno · e-mail",
      "confidentiality": "Důvěrné."
    }
  }
}
```

Every `cover` field except `title` is optional and its row is left off when
unset: a blank validity line on an offer reads worse than no line.

## Rendering

`export-pdf` emulates **print** media. Emulating screen switches off every
`@media print` rule the theme ships, which is what used to print the site navbar
onto the first sheet; it also makes this export and a browser's Ctrl+P agree.

The URL it loads is not the server root. `vitepress preview` serves the site under
its configured `base` and 404s everything outside it, and every scaffold sets a
`base`, so the exporter reads the base off the asset URLs of the built
`print.html` rather than from the config, which this process never loads.

Header and footer are Chromium templates. Chromium lays them out in their own
document with no access to the page stylesheet and no clipping to the page
margin, so every value is inline and the offsets (`HEADER_TOP`, `FOOTER_TOP`) are
measured against a rendered sheet rather than derived from the margins. The
header is a letterhead, not a running head: `printToPDF` renders one template on
every sheet and cannot know which section a page belongs to.

`tagged: true` plus `outline: true` give the PDF a structure tree and bookmarks.

## Paper stylesheet

`theme/styles/print.css`. Three things it does that are not obvious:

- It redefines the `--tf-text-*` and `--tf-spacing-*` tokens inside
  `@media print`. patterns.css and every theme component sizes itself from those,
  so one block carries the whole design system down to paper; without it a page
  mixes 9pt prose with 14px cards. This only works because `theme/index.ts`
  imports print.css **last**: tokens.css declares the same tokens on the same
  `:root`, and a tie on specificity is settled by order alone, media query or not.
- Its own palette is built from `--brand-navy` and `--brand-primary`, not from
  the `--tf-color-*` tokens. Those flip with the theme, so printing from a
  dark-mode browser would put pale ink on white paper.
- The cover block sits outside `@media print`, because the /print route is also
  read on screen while an offer is being written, but its selectors still carry
  `.print-layout` for weight: `.print-layout h1` and `.print-layout p` would
  otherwise resize the cover title and flatten every margin on the sheet.

Page economy comes from three rules: only a section opens a fresh sheet, a table
may split (header repeated, break forbidden only inside a row), and a figure is
capped in height. Together these took a real 47 page offer to 43 while raising
the body size from 9pt to 10pt.

## Known limits

- Chromium renders the same footer on every sheet, so the cover carries a page
  number. Removing it needs a second document and a merge step.
- `FeatureCard` renders its title as `<h3>`, so those titles land in the bookmark
  tree beside real pages. `ReferenceCard` uses `<p>` for the same thing.
- A page title stops at `h3`, so from the fourth level down the bookmark tree
  flattens: those pages all sit at the same level and share one size.
