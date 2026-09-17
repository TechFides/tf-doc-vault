---
title: Icons
status: published
updated_at: 2026-08-13
order: 18
---

Two ways to put a glyph on a page, and they are not interchangeable. The icon font covers
the 47 marks the theme ships; the Vue components cover the five the theme draws itself.

## The icon font

A self-hosted Phosphor subset, so a page renders the same offline and behind a proxy. Add
`ph` plus the glyph's own class to any inline element:

<p>
  <i class="ph ph-shield-check"></i>
  <i class="ph ph-git-pull-request"></i>
  <i class="ph ph-lightning"></i>
  <i class="ph ph-robot"></i>
  <i class="ph ph-trend-up"></i>
</p>

```md
<i class="ph ph-shield-check"></i>
```

The glyph inherits `color` and sits at `--tf-icon-md`, so it takes the size and colour of the
text around it. Set `font-size` to scale it. It is `pointer-events: none`, so a glyph inside
a button never swallows the click.

Add `aria-hidden="true"` when the glyph repeats what the adjacent text already says, which is
most of the time. When it carries meaning on its own, give it a label instead.

### Every name

<div class="tf-chips">
  <span class="tf-chip"><i class="ph ph-arrow-clockwise"></i> arrow-clockwise</span>
  <span class="tf-chip"><i class="ph ph-arrow-right"></i> arrow-right</span>
  <span class="tf-chip"><i class="ph ph-arrow-u-up-left"></i> arrow-u-up-left</span>
  <span class="tf-chip"><i class="ph ph-buildings"></i> buildings</span>
  <span class="tf-chip"><i class="ph ph-calendar-blank"></i> calendar-blank</span>
  <span class="tf-chip"><i class="ph ph-caret-down"></i> caret-down</span>
  <span class="tf-chip"><i class="ph ph-caret-left"></i> caret-left</span>
  <span class="tf-chip"><i class="ph ph-caret-right"></i> caret-right</span>
  <span class="tf-chip"><i class="ph ph-check"></i> check</span>
  <span class="tf-chip"><i class="ph ph-circle-dashed"></i> circle-dashed</span>
  <span class="tf-chip"><i class="ph ph-circle-notch"></i> circle-notch</span>
  <span class="tf-chip"><i class="ph ph-clipboard-text"></i> clipboard-text</span>
  <span class="tf-chip"><i class="ph ph-cloud"></i> cloud</span>
  <span class="tf-chip"><i class="ph ph-code"></i> code</span>
  <span class="tf-chip"><i class="ph ph-cpu"></i> cpu</span>
  <span class="tf-chip"><i class="ph ph-envelope-simple"></i> envelope-simple</span>
  <span class="tf-chip"><i class="ph ph-facebook-logo"></i> facebook-logo</span>
  <span class="tf-chip"><i class="ph ph-file-text"></i> file-text</span>
  <span class="tf-chip"><i class="ph ph-folders"></i> folders</span>
  <span class="tf-chip"><i class="ph ph-git-branch"></i> git-branch</span>
  <span class="tf-chip"><i class="ph ph-git-pull-request"></i> git-pull-request</span>
  <span class="tf-chip"><i class="ph ph-github-logo"></i> github-logo</span>
  <span class="tf-chip"><i class="ph ph-info"></i> info</span>
  <span class="tf-chip"><i class="ph ph-instagram-logo"></i> instagram-logo</span>
  <span class="tf-chip"><i class="ph ph-kanban"></i> kanban</span>
  <span class="tf-chip"><i class="ph ph-key"></i> key</span>
  <span class="tf-chip"><i class="ph ph-lifebuoy"></i> lifebuoy</span>
  <span class="tf-chip"><i class="ph ph-lightning"></i> lightning</span>
  <span class="tf-chip"><i class="ph ph-linkedin-logo"></i> linkedin-logo</span>
  <span class="tf-chip"><i class="ph ph-list"></i> list</span>
  <span class="tf-chip"><i class="ph ph-map-pin"></i> map-pin</span>
  <span class="tf-chip"><i class="ph ph-minus"></i> minus</span>
  <span class="tf-chip"><i class="ph ph-phone"></i> phone</span>
  <span class="tf-chip"><i class="ph ph-plug"></i> plug</span>
  <span class="tf-chip"><i class="ph ph-plus"></i> plus</span>
  <span class="tf-chip"><i class="ph ph-robot"></i> robot</span>
  <span class="tf-chip"><i class="ph ph-seal-check"></i> seal-check</span>
  <span class="tf-chip"><i class="ph ph-shield-check"></i> shield-check</span>
  <span class="tf-chip"><i class="ph ph-sliders"></i> sliders</span>
  <span class="tf-chip"><i class="ph ph-sparkle"></i> sparkle</span>
  <span class="tf-chip"><i class="ph ph-stack"></i> stack</span>
  <span class="tf-chip"><i class="ph ph-star"></i> star</span>
  <span class="tf-chip"><i class="ph ph-tag"></i> tag</span>
  <span class="tf-chip"><i class="ph ph-trash"></i> trash</span>
  <span class="tf-chip"><i class="ph ph-trend-up"></i> trend-up</span>
  <span class="tf-chip"><i class="ph ph-user"></i> user</span>
  <span class="tf-chip"><i class="ph ph-x"></i> x</span>
</div>

Adding a glyph means adding its `content` rule to `theme/styles/icons.css`, since the font is
a subset rather than the whole Phosphor set. The font file is fetched only once a page renders
one of these classes, so a site that uses no icon pays nothing for them.

## The Vue icon components

Five marks the theme draws as SVG rather than taking from the font, because they are used at
sizes and in places where a font glyph would be wrong. They come off the `icons` namespace:

```ts
import { icons } from "@techfides/tf-doc-vault/theme";
// icons.IconBusiness, icons.IconFunctional, icons.IconTechnical,
// icons.IconCheck, icons.LogoSymbol
```

| Component        | Where the theme uses it                               |
| ---------------- | ----------------------------------------------------- |
| `IconBusiness`   | `FeatureCards`, the `business` icon and the fallback. |
| `IconFunctional` | `FeatureCards`, the `functional` icon.                |
| `IconTechnical`  | `FeatureCards`, the `technical` icon.                 |
| `IconCheck`      | The check inside a ticked task-list box.              |
| `LogoSymbol`     | The brand mark on the 404 page.                       |

They are exported rather than internal, so a consumer can reuse them, but they are not
registered globally: import them in your own theme entry and register them there if you want
them in Markdown.
