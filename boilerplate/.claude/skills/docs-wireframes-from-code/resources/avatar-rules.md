# Avatar rules

Canonical rules for rendering circular avatars inside wireframes. Applies
to every fragment in the `avatar-*` family (`avatar-sm`, `avatar-md`,
`avatar-lg`) and to any inline avatar composed outside a fragment.

The rules exist because avatars are the single most frequent source of
layout regressions in SVG wireframes; a one-pixel offset on the text
baseline or a label drawn inside the circle breaks the visual.

## Shape and sizing

- Avatar is **always** a `<circle>`. Never a rounded `<rect>`, never an
  ellipse.
- Canonical diameters:
  - `avatar-sm`: 32 px (r = 16).
  - `avatar-md`: 48 px (r = 24).
  - `avatar-lg`: 96 px (r = 48).
- Stroke (if used): 1 px, inside the circle (`stroke-alignment` is not
  universally supported; use a slightly smaller `r` and overlay a thin
  border circle if needed).

## Positioning rule: `y == cy`

Text inside the circle (initials, icon) MUST satisfy:

```xml
<circle cx="<X>" cy="<Y>" r="<R>" />
<text x="<X>" y="<Y>" dominant-baseline="central" text-anchor="middle">
  <initials>
</text>
```

- `y` on the `<text>` element **equals** `cy` on the `<circle>`; do
  NOT pre-compensate for baseline yourself.
- `dominant-baseline="central"` is mandatory; without it the initials
  drift downward in Firefox and Safari.
- `text-anchor="middle"` is mandatory; it keeps the initials horizontally
  centered.

### Why

Default SVG baseline is alphabetic, which places the text below the
center. `dominant-baseline="central"` re-centers the text vertically on
`y`, so the combination `y == cy` puts the glyph's optical center at the
circle's center. Pre-compensating (`y = cy + 4`) breaks fonts that have
different metrics.

## Label placement: below the circle

Name / label / caption associated with an avatar is rendered **below** the
circle, outside the colored area:

```xml
<circle cx="80" cy="80" r="24" fill="#4B7BEC" />
<text x="80" y="80" dominant-baseline="central" text-anchor="middle"
      fill="#FFFFFF" font-size="18">JK</text>

<!-- Label below, outside the circle -->
<text x="80" y="124" text-anchor="middle" fill="#1F2937" font-size="12">
  Jan Kovář
</text>
```

- The label's `y` is at least `cy + r + 12` (circle radius + 12 px
  breathing room).
- Label color is the **foreground text color** of the canvas, never the
  avatar fill color.
- Long names wrap to a second line using a second `<text>` element at
  `y + 14`; do NOT use `<foreignObject>` for wrapping.

### Why not inside

Labels inside the circle:

- reduce the colored area's function as an identifier,
- collide with the initials,
- look inconsistent against dark / light avatar fills,
- do not match production UIs in this project.

## Initials

- Default: first letter of first name + first letter of last name,
  uppercase (`Jan Kovář` → `JK`).
- Maximum 2 glyphs; truncate further names.
- If only a single name is known, use the first two letters (`Admin` →
  `AD`).
- Diacritics in initials are kept (`Čeněk Žák` → `ČŽ`).

## Colors

- Pick the fill from the project's avatar palette if defined in
  `wf-fragments/README.md`; otherwise use a deterministic palette based
  on a hash of the name (keeps same person consistent across
  wireframes).
- Initials color is always a **high-contrast** counterpart:
  - Light-theme avatars use white (`#FFFFFF`) initials on saturated
    fills.
  - Dark-theme avatars use `#F9FAFB` initials on slightly darker fills.
- Never use pure red (`#FF0000`); reserve red for destructive UI.

## Image-backed avatars

When the source (screenshot / scenario) shows a photo rather than
initials:

```xml
<defs>
  <clipPath id="avatar-clip-<id>">
    <circle cx="<X>" cy="<Y>" r="<R>" />
  </clipPath>
</defs>
<image href="<local path or data URI>"
       x="<X-R>" y="<Y-R>"
       width="<2R>" height="<2R>"
       clip-path="url(#avatar-clip-<id>)" />
```

- `href` must be a **local** path (`../assets/…`) or a data URI, never
  an external URL (`svg-sanitization.md` §5).
- Clip the image to a circle via `clipPath`; never rely on CSS
  `border-radius` inside `<foreignObject>`.
- If the avatar image is not available, fall back to initials; do NOT
  leave a blank circle.

## Accessibility

Avatar groups should carry a short accessible description:

```xml
<g role="img" aria-label="Avatar uživatele Jan Kovář">
  <circle … />
  <text …>JK</text>
</g>
```

The label on the `<g>` supersedes per-element labels and matches the
visible text. If the visible label is a real full name, keep the
accessible label identical (avoid abbreviating).

## Common mistakes to avoid

- `y = cy + 4`: pre-compensation. Use `dominant-baseline="central"`
  instead.
- `dominant-baseline="middle"`: not equivalent to `central`, renders
  differently across browsers.
- Label inside the circle; breaks the visual identifier role.
- External image URL; forbidden by the sanitizer.
- Rounded rectangle instead of circle; use `<circle>` only.
- Missing `text-anchor="middle"`; initials drift to the right of the
  circle's center.
- Stroke drawn outside the circle; looks inconsistent at small sizes,
  prefer inside-stroke or a separate thinner border circle.

## Rules

- **ALWAYS** use `<circle>` and `dominant-baseline="central"` with
  `y == cy` for initials.
- **ALWAYS** render labels **below** the circle, with ≥ 12 px breathing
  room.
- **ALWAYS** keep initials uppercase, 1–2 glyphs, diacritics preserved.
- **NEVER** reference external image URLs; local paths or data URIs
  only.
- **NEVER** use `<foreignObject>` for avatar wrapping or labels.
