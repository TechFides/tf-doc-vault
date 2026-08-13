<script setup lang="ts">
defineProps<{
  /** The label in the corner, such as `01`. Omit to drop the column. */
  number?: string;
  /** Emoji or glyph before the title. Omit to drop it. */
  icon?: string;
  /** The card's heading. Omit to drop the row. */
  title?: string;
  /** One sentence under the heading, in muted text. Omit to drop it. */
  lead?: string;
}>();
</script>

<template>
  <aside class="step-card">
    <div class="step-card__bloom" aria-hidden="true" />
    <p v-if="number" class="step-card__number">{{ number }}</p>
    <div class="step-card__body">
      <!-- A paragraph, not a heading: a set of these would otherwise fill the page outline
           with entries that belong to the cards rather than to the document. -->
      <p v-if="title" class="step-card__title">
        <span v-if="icon" class="step-card__icon" aria-hidden="true">{{
          icon
        }}</span>
        {{ title }}
      </p>
      <p v-if="lead" class="step-card__lead">{{ lead }}</p>
      <!-- tf-checks is in patterns.css, shared with ReferenceCard. -->
      <div class="step-card__points tf-checks"><slot /></div>
      <div v-if="$slots.tags" class="step-card__tags"><slot name="tags" /></div>
    </div>
  </aside>
</template>

<style scoped>
/*
 * One numbered point of a method. The number is the whole design: set in the display face at
 * headline size and filled with the accent gradient, it indexes the card as a graphic rather
 * than as a grey label beside the text. Everything else stays quiet so it can.
 *
 * Meant to be used as a set, so the number stays readable rather than decorative: a screen
 * reader announcing "01" before the title is the order the eye takes.
 */
.step-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  gap: var(--tf-spacing-6);
  margin-block: var(--tf-spacing-6);
  padding: var(--tf-spacing-7);
  border: 1px solid var(--tf-color-line);
  border-radius: var(--tf-radius-xl);
  background: var(--tf-color-panel-glass);
  backdrop-filter: blur(var(--tf-blur-panel)) saturate(var(--tf-glass-saturate));
  box-shadow: var(--tf-shadow-1);
}

/* Light gathered behind the number, contained by the card's own overflow. Its centre sits
   outside the panel so only the falloff crosses the content. */
.step-card__bloom {
  position: absolute;
  inset: -70% auto auto -18%;
  width: 55%;
  aspect-ratio: 1;
  pointer-events: none;
  background-image: radial-gradient(
    closest-side,
    color-mix(in oklab, var(--tf-color-accent) 12%, transparent),
    transparent
  );
}

.dark .step-card__bloom {
  background-image: radial-gradient(
    closest-side,
    color-mix(in oklab, var(--tf-color-accent-2) 20%, transparent),
    transparent
  );
}

/*
 * Gradient-filled, which is what turns the index into the card's one graphic element. The clip
 * paints the whole block, so the gradient runs across both digits rather than restarting.
 * min-width in ch keeps a single-digit card on the same axis as its two-digit neighbours.
 */
.step-card__number {
  position: relative;
  flex: none;
  margin: 0;
  min-width: 2.2ch;
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h1);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  background: var(--tf-grad-accent-h);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* Without clip-to-text support a transparent fill would erase the digits entirely. */
@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
  .step-card__number {
    color: var(--tf-color-accent);
    -webkit-text-fill-color: var(--tf-color-accent);
  }
}

.step-card__body {
  position: relative;
  min-width: 0;
}

.step-card__title {
  display: flex;
  align-items: baseline;
  gap: var(--tf-spacing-2);
  margin: 0 0 var(--tf-spacing-2);
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h4);
  font-weight: 600;
  line-height: var(--tf-leading-tight);
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
}

.step-card__icon {
  flex: none;
  font-size: var(--tf-text-body);
  line-height: 1;
}

.step-card__lead {
  margin: 0;
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-body);
  color: var(--tf-color-muted);
}

.step-card__points {
  margin-top: var(--tf-spacing-5);
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-body);
}

/* The rule starts at the content rather than spanning the card, so the tags read as a footnote
   to this card's points and not as a divider between two cards. */
.step-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tf-spacing-2);
  margin-top: var(--tf-spacing-5);
  padding-top: var(--tf-spacing-5);
  border-top: 1px solid var(--tf-color-line);
}

@media (max-width: 560px) {
  .step-card {
    flex-direction: column;
    gap: var(--tf-spacing-2);
    padding: var(--tf-spacing-6);
  }

  .step-card__number {
    font-size: var(--tf-text-h2);
  }
}
</style>
