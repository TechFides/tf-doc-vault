---
title: Pattern classes
status: published
updated_at: 2026-08-13
order: 2
---

The classes in `src/theme/styles/patterns.css`, written straight into Markdown.
They exist so a page can hold a card grid or a row of figures without the author
reaching for a Vue component or an inline style.

## Eyebrow and lead

<span class="tf-eyebrow">Platform</span>

### One agent, five projects

<p class="tf-lead">
A lead paragraph is muted and one step up in size. Use it once, directly under
the heading it belongs to.
</p>

## Figures

Numbers use tabular figures, so a row of them lines up on the digits regardless
of value.

<div class="tf-cards">
  <div class="tf-card">
    <div class="tf-stat">
      <span class="tf-stat__value tf-grad-text">145</span>
      <span class="tf-stat__label">Draft merge requests delivered</span>
    </div>
  </div>
  <div class="tf-card">
    <div class="tf-stat">
      <span class="tf-stat__value">97 %</span>
      <span class="tf-stat__label">Passed mandatory checks first time</span>
    </div>
  </div>
  <div class="tf-card">
    <div class="tf-stat">
      <span class="tf-stat__value">90</span>
      <span class="tf-stat__label">Days in production</span>
    </div>
  </div>
</div>

## Cards with a tile and an icon

<div class="tf-cards">
  <div class="tf-card">
    <div class="tf-tile tf-tile--grad"><i class="ph ph-git-pull-request"></i></div>
    <strong>Draft merge request</strong>
    <span class="tf-stat__label">Opened by the agent, never merged by it.</span>
  </div>
  <div class="tf-card">
    <div class="tf-tile"><i class="ph ph-shield-check"></i></div>
    <strong>Mandatory checks</strong>
    <span class="tf-stat__label">Lint, types and tests run before review.</span>
  </div>
  <div class="tf-card">
    <div class="tf-tile"><i class="ph ph-user"></i></div>
    <strong>Human review</strong>
    <span class="tf-stat__label">Approval and merge stay with a person.</span>
  </div>
</div>

## Animated edge

`data-tf-edge` draws a gradient hairline in the border box and sweeps it around
the element on a sixteen-second loop.

<div class="tf-card" data-tf-edge>
  <strong>The one card that moves</strong>
  <span class="tf-stat__label">
    Spend this on the element a reader should land on, not on every card.
  </span>
</div>

## Chips

<div class="tf-chips">
  <span class="tf-chip tf-chip--accent"><i class="ph ph-sparkle"></i> Recommended</span>
  <span class="tf-chip"><i class="ph ph-code"></i> TypeScript</span>
  <span class="tf-chip"><i class="ph ph-git-branch"></i> GitLab</span>
  <span class="tf-chip"><i class="ph ph-cpu"></i> Node 24</span>
  <span class="tf-chip"><i class="ph ph-key"></i> OIDC</span>
</div>

## Steps

Numbered markers, used here because the content genuinely is a sequence.

<div class="tf-rows">
  <div><span><span class="tf-step">1</span> Label the ticket in Jira</span><span>anyone</span></div>
  <div><span><span class="tf-step">2</span> Agent plans the change</span><span>~2 min</span></div>
  <div><span><span class="tf-step">3</span> Mandatory checks run</span><span>~6 min</span></div>
  <div><span><span class="tf-step">4</span> Draft merge request opens</span><span>~1 min</span></div>
  <div><span><span class="tf-step">5</span> Human reviews and merges</span><span>you</span></div>
</div>

## Buttons

<p>
  <a class="tf-btn tf-btn--primary" href="/v1/tokens/">Browse the tokens <i class="ph ph-arrow-right"></i></a>
  <a class="tf-btn" href="/v1/showcase/001-elements">Every element</a>
</p>

## Fact rows

<dl class="tf-rows">
  <div><dt>Package</dt><dd>@techfides/tf-doc-vault</dd></div>
  <div><dt>Node</dt><dd>&gt;= 24</dd></div>
  <div><dt>Body face</dt><dd>IBM Plex Sans</dd></div>
  <div><dt>Display face</dt><dd>Inter</dd></div>
  <div><dt>Icon set</dt><dd>Phosphor, regular</dd></div>
</dl>

## Divider

<hr class="tf-divider" />

## Icons

Forty-seven Phosphor glyphs carry a rule in `icons.css`. An icon without one
renders as nothing at all, which is the trap to remember when adding a new name.

<div class="tf-chips">
  <span class="tf-chip"><i class="ph ph-check"></i> check</span>
  <span class="tf-chip"><i class="ph ph-info"></i> info</span>
  <span class="tf-chip"><i class="ph ph-x"></i> x</span>
  <span class="tf-chip"><i class="ph ph-file-text"></i> file-text</span>
  <span class="tf-chip"><i class="ph ph-folders"></i> folders</span>
  <span class="tf-chip"><i class="ph ph-kanban"></i> kanban</span>
  <span class="tf-chip"><i class="ph ph-key"></i> key</span>
  <span class="tf-chip"><i class="ph ph-lightning"></i> lightning</span>
  <span class="tf-chip"><i class="ph ph-robot"></i> robot</span>
  <span class="tf-chip"><i class="ph ph-seal-check"></i> seal-check</span>
  <span class="tf-chip"><i class="ph ph-sliders"></i> sliders</span>
  <span class="tf-chip"><i class="ph ph-stack"></i> stack</span>
  <span class="tf-chip"><i class="ph ph-tag"></i> tag</span>
  <span class="tf-chip"><i class="ph ph-trend-up"></i> trend-up</span>
  <span class="tf-chip"><i class="ph ph-clipboard-text"></i> clipboard-text</span>
  <span class="tf-chip"><i class="ph ph-map-pin"></i> map-pin</span>
</div>
