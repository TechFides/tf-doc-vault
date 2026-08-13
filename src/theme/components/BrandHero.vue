<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

const { frontmatter } = useData();

const eyebrow = computed(
  () => frontmatter.value.hero?.eyebrow ?? "Documentation",
);
</script>

<template>
  <!-- data-tf-edge is the swept gradient rim from patterns.css, used only here. -->
  <div v-if="frontmatter.hero" class="brand-hero" data-tf-edge>
    <div class="brand-hero__bloom" aria-hidden="true" />
    <div class="brand-hero__field" aria-hidden="true">
      <span class="brand-hero__stars brand-hero__stars--near" />
      <span class="brand-hero__stars brand-hero__stars--far" />
    </div>
    <div class="brand-hero__inner">
      <p v-if="eyebrow" class="brand-hero__eyebrow">{{ eyebrow }}</p>
      <h1 class="brand-hero__title">
        {{ frontmatter.hero.title ?? frontmatter.title }}
      </h1>
      <div v-if="$slots.subtitle" class="brand-hero__subtitle">
        <slot name="subtitle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * The hero is where the galaxy concentrates: the page backdrop stays faint because a
 * document sits on it, and here the same material is turned up. Glass rather than a
 * surface of its own, so PageBackdrop still reads through the largest panel on the site.
 */
.brand-hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  margin-top: 0;
  margin-bottom: var(--tf-spacing-6);
  padding: var(--tf-spacing-lg) var(--tf-spacing-8);
  border-radius: var(--tf-radius-xl);
  background: var(--tf-color-panel-glass);
  backdrop-filter: var(--tf-glass-filter);
  box-shadow: var(--tf-shadow-2);
}

/* patterns.css puts the rim at z-index 0, which paints it in the same step as the bloom
   and the field, and so under them in DOM order. */
.brand-hero::before {
  z-index: 2;
}

/* Two gradients on one layer: a wide wash, and a tighter core it comes from. */
.brand-hero__bloom {
  position: absolute;
  inset: -30% -10%;
  pointer-events: none;
  background-image:
    radial-gradient(
      42% 58% at 74% 44%,
      color-mix(in oklab, var(--tf-color-accent-2) 42%, transparent),
      transparent 68%
    ),
    radial-gradient(
      68% 84% at 88% 22%,
      color-mix(in oklab, var(--tf-color-accent) 30%, transparent),
      transparent 72%
    );
  opacity: var(--tf-hero-bloom-opacity);
  animation: tf-bloom-drift 90s ease-in-out infinite;
  will-change: transform;
}

/* Masked away from the band the text occupies: a star behind a headline reads as dirt
   on the screen. */
.brand-hero__field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--tf-hero-stars-opacity);
  -webkit-mask-image: radial-gradient(
    78% 86% at 16% 50%,
    transparent 0 52%,
    #000 100%
  );
  mask-image: radial-gradient(78% 86% at 16% 50%, transparent 0 52%, #000 100%);
}

/* Percentage-positioned gradients rather than the backdrop's box-shadow copies: the hero
   is a bounded box that changes width, and pixel offsets would not scale with it. */
.brand-hero__stars {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  animation: tf-star-pulse var(--tf-ease-out) infinite;
}

.brand-hero__stars--near {
  animation-duration: 13s;
  background-image:
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-accent-2) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    );
  background-size: 3px 3px;
  background-position:
    54% 22%,
    71% 63%,
    83% 31%,
    92% 74%,
    64% 86%;
}

.brand-hero__stars--far {
  animation-duration: 19s;
  animation-delay: 4s;
  background-image:
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-accent-2) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    ),
    radial-gradient(
      circle closest-side,
      var(--tf-color-sheen) 100%,
      transparent
    );
  background-size: 2px 2px;
  background-position:
    48% 71%,
    61% 38%,
    77% 15%,
    88% 52%,
    95% 27%,
    69% 92%;
}

.brand-hero__inner {
  position: relative;
  max-width: var(--layout-max-width-narrow, 800px);
}

.brand-hero__eyebrow {
  display: flex;
  align-items: center;
  gap: var(--tf-spacing-3);
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-caption-sm);
  font-weight: 500;
  letter-spacing: var(--tf-tracking-eyebrow);
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  margin: 0 0 var(--tf-spacing-5);
}

.brand-hero__eyebrow::after {
  content: "";
  flex: 1;
  max-width: var(--tf-spacing-xl);
  height: 1px;
  background: var(--tf-grad-line);
}

.dark .brand-hero__eyebrow {
  color: var(--tf-color-accent-2);
}

.brand-hero__title {
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-display);
  font-weight: 600;
  line-height: var(--tf-leading-tight);
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
  border-top: none;
  margin: 0 0 var(--tf-spacing-5);
  padding-top: 0;
}

.brand-hero__subtitle {
  font-size: var(--tf-text-lead);
  line-height: var(--tf-leading-body);
  color: var(--tf-color-muted);
  margin: 0;
}

.brand-hero__subtitle :deep(strong) {
  color: var(--tf-color-fg);
  font-weight: 600;
}

.brand-hero__subtitle :deep(p) {
  margin: 0;
  max-width: 62ch;
}

@media (min-width: 640px) {
  .brand-hero {
    padding: var(--tf-spacing-xl) var(--tf-spacing-lg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-hero__bloom {
    animation: none;
    will-change: auto;
  }

  .brand-hero__field {
    display: none;
  }
}
</style>
