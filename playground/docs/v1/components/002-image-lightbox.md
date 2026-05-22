---
title: ImageLightbox
status: published
updated_at: 2026-05-22
---

# ImageLightbox

Click any inline image or Mermaid diagram to open it in a full-screen
overlay with pan/zoom. Mounted via the `layout-bottom` slot, so it's
available on every doc page without authors adding markup.

## Triggers

Cursor changes to `zoom-in` on hover (see `base.css`):

```css
.vp-doc img,
.vp-doc svg {
  cursor: zoom-in;
}
```

## Example

```mermaid
sequenceDiagram
    User->>Image: click
    Image->>Lightbox: open with src
    Lightbox->>User: full-screen overlay
    User->>Lightbox: Esc / outside click
    Lightbox->>User: close
```
