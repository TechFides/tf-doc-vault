# SVG sanitization

Hard rules enforced by `scripts/validate-svg.sh` and by Step 2 item 6 of
`docs-wireframes-from-code`. Wireframes are static visual assets served
from the docs site, so they must NEVER carry executable or side-effecting
content. This document explains **what is forbidden**, **why**, and
**how to rewrite** unsafe constructs so the intent survives.

## Forbidden constructs (hard fail)

The validator rejects any SVG that contains any of the following. If you
encounter one, remove it before saving; there is no `--allow` flag.

### 1. `<script>` elements

**Why**: arbitrary code execution inside the docs site.

```xml
<!-- NEVER -->
<script>alert('hi')</script>
```

**Rewrite**: delete. If the original screenshot shows an animation or
dynamic behavior, capture it in the textual summary above the figure
reference instead; wireframes describe _layout_, not behavior.

### 2. Event-handler attributes (`on*`)

**Why**: inline JS runs on render / interaction.

Any attribute matching `/^on[a-z]+$/i` is forbidden:

```xml
<!-- NEVER -->
<rect onclick="..." onmouseover="..." />
```

**Rewrite**: delete the attribute. The hover / click affordance can be
represented visually (e.g. a second SVG showing the hover state) or
described in the scenario text.

### 3. `javascript:` URIs

**Why**: executes on navigation.

```xml
<!-- NEVER -->
<a href="javascript:doThing()">…</a>
```

**Rewrite**: delete the `<a>` wrapper or replace the `href` with `#` if
the visual underline / color is load-bearing. Link targets in wireframes
are illustrative; real navigation is described in the scenario page.

### 4. `<foreignObject>` with executable HTML/JS

**Why**: HTML inside `<foreignObject>` can contain `<script>`, event
handlers, or `javascript:` URIs, the same attack surface as the above, just
tunneled through SVG.

```xml
<!-- NEVER -->
<foreignObject>
  <xhtml:div onclick="…">…</xhtml:div>
</foreignObject>
```

**Rewrite**: convert the HTML to native SVG primitives (`<text>`,
`<rect>`, `<g>`). A `foreignObject` with pure static HTML (no scripts,
no handlers) MAY pass the validator, but the house preference is to
avoid it entirely; static SVG renders consistently across viewers.

### 5. External references to non-whitelisted origins

**Why**: network requests at render time (tracking, content tampering).

Forbidden:

- `<image href="https://external.example.com/…" />`
- `<use href="https://…#symbol" />`
- CSS `@import url("https://…")`
- Fonts referenced via `https://` URL.

**Whitelist**: none by default. All assets must be either inline or live
inside the docs tree (`docs/**`). If an external asset is truly needed,
download it into `docs/public/` first and reference it by relative path.

### 6. Unresolved placeholders

**Why**: an `<!-- param-name -->` comment left in the final SVG signals
a bug in substitution; the fragment author expected a value.

```xml
<!-- NEVER survive to the final file -->
<text x="<!-- x -->" y="<!-- y+34 -->">…</text>
```

**Rewrite**: compute the value (arithmetic placeholders are evaluated)
or delete the element if the context does not provide one. The
validator treats any `<!-- ... -->` whose content matches a known
parameter name as an error.

## Soft warnings (resolve before shipping)

These pass the validator but the skill should self-correct:

- **Mixed namespaces without declaration**: if using `xhtml:` or
  `xlink:` prefixes, declare the namespace on the root `<svg>`.
- **Unreferenced `id` attributes**: clutter; remove or reference.
- **Inline `style` with `expression()`** (legacy IE): strip.
- **Comments containing `-->` inside CDATA-like tricks**: normalize
  comment syntax.

## XML well-formedness

On top of the content rules, the validator parses the file as XML and
rejects malformed documents:

- Tags must be closed (`<rect … />` or `<rect>…</rect>`).
- Attribute values must be quoted.
- A single root `<svg>` element.
- UTF-8 encoding (no BOM).

## Recommended attributes on the root `<svg>`

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 <w> <h>"
     width="<w>" height="<h>"
     role="img"
     aria-labelledby="title">
  <title id="title"><Czech caption></title>
  <desc>Stručný popis obrazovky pro čtečky obrazovky.</desc>
  <!-- content -->
</svg>
```

- `role="img"` + `<title>` + `<desc>` give accessibility parity with the
  caption in Markdown without introducing executable content.
- The `<title>` text mirrors the **Obrázek N** caption in the host page.

## Sanitization procedure (when validator fails)

1. Read the validator output; it names the offending line and
   construct.
2. Remove or rewrite the construct using the guidance above. Do not add
   an exception list.
3. Re-run the validator. Repeat until clean.
4. If the offending construct came from a fragment, the fragment itself
   is broken; fix it in `wf-fragments/` and add a regression note in
   `wf-fragments/README.md`.

## Rules

- **NEVER** ship an SVG that fails `scripts/validate-svg.sh`.
- **NEVER** add executable or side-effecting content to a fragment "for
  convenience"; the fragment lives in the docs tree and will reach
  every consumer.
- **NEVER** rely on soft warnings going away on their own; fix them
  before the run completes.
- **ALWAYS** prefer native SVG primitives over `<foreignObject>`.
- **ALWAYS** keep the accessibility pair (`<title>` + `<desc>`) in
  sync with the host page caption.
