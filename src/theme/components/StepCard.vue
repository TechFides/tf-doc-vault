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
 * One numbered point of a method, standing on its own: a label, a claim, the checks that
 * back it up, and the terms it introduces. Meant to be used as a set, so the number stays
 * readable rather than decorative; a screen reader announcing "01" before the title is the
 * same order the eye takes.
 */
.step-card {
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

/* min-width in ch, so a card numbered 9 keeps the column its two-digit neighbours have and
   the titles down a set stay on one axis. */
.step-card__number {
  flex: none;
  margin: 0;
  min-width: 2.2ch;
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-display);
  font-weight: 600;
  line-height: 1;
  letter-spacing: var(--tf-tracking-h);
  font-variant-numeric: tabular-nums;
  color: color-mix(in oklab, var(--tf-color-accent) 35%, transparent);
}

.step-card__body {
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

.step-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tf-spacing-2);
  margin-top: var(--tf-spacing-5);
}

@media (max-width: 560px) {
  .step-card {
    flex-direction: column;
    gap: var(--tf-spacing-3);
    padding: var(--tf-spacing-6);
  }

  .step-card__number {
    font-size: var(--tf-text-h1);
  }
}
</style>
