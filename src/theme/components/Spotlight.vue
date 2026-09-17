<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Small uppercase label above the headline. Omit to drop the row. */
    eyebrow?: string;
    /** The headline. Omit to drop the row. */
    title?: string;
    /**
     * Put the mark in an accent tile. Right for an icon glyph, which a frame gives weight
     * to; leave it off for a brand mark, which carries its own shape and colour.
     */
    markFrame?: boolean;
  }>(),
  { markFrame: false },
);
</script>

<template>
  <aside class="spotlight">
    <div class="spotlight__bloom" aria-hidden="true" />
    <div
      v-if="$slots.mark"
      class="spotlight__mark"
      :class="{ 'spotlight__mark--framed': markFrame }"
    >
      <slot name="mark" />
    </div>
    <p v-if="eyebrow" class="spotlight__eyebrow">{{ eyebrow }}</p>
    <!-- A paragraph, not a heading: VitePress builds the page outline from h2 and h3, and
         a promotional headline listed there would read as a section of the document. -->
    <p v-if="title" class="spotlight__title">{{ title }}</p>
    <div class="spotlight__copy"><slot /></div>
    <div v-if="$slots.actions" class="spotlight__actions">
      <slot name="actions" />
    </div>
  </aside>
</template>

<style scoped>
.spotlight {
  position: relative;
  overflow: hidden;
  margin-block: var(--tf-spacing-lg);
  padding: var(--tf-spacing-8) var(--tf-spacing-7);
  border: 1px solid var(--tf-color-line);
  border-radius: var(--tf-radius-xl);
  background: var(--tf-color-panel-glass);
  backdrop-filter: var(--tf-glass-filter);
  box-shadow: var(--tf-shadow-2);
  text-align: center;
}

.spotlight::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, var(--tf-edge-stops));
}

/* The centre sits outside the panel, so only the falloff crosses the copy. */
.spotlight__bloom {
  position: absolute;
  inset: -30% -15% auto auto;
  width: 60%;
  aspect-ratio: 1;
  pointer-events: none;
  /* In light mode the cloud darkens the glass rather than lighting it, so the strength is
     held below where its peak lands on the copy. */
  background-image: radial-gradient(
    closest-side,
    color-mix(in oklab, var(--tf-color-accent) 11%, transparent),
    transparent
  );
  animation: tf-bloom-drift 70s ease-in-out infinite;
  will-change: transform;
}

.dark .spotlight__bloom {
  background-image: radial-gradient(
    closest-side,
    color-mix(in oklab, var(--tf-color-accent-2) 22%, transparent),
    transparent
  );
}

.spotlight__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--tf-spacing-4);
  color: var(--tf-color-accent-ink);
}

.spotlight__mark--framed {
  width: var(--tf-size-2xl);
  height: var(--tf-size-2xl);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-color-accent-soft);
}

/* Capped on height, not width: it is what puts a wide wordmark and a square glyph at the
   same optical size. */
.spotlight__mark :deep(*) {
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: var(--tf-size-2xl);
}

/* After the rule above, not before it: both are (0,2,1) once the scope attribute is added,
   so source order is the only thing deciding which cap applies. */
.spotlight__mark--framed :deep(*) {
  max-height: var(--tf-size-lg);
}

.spotlight__eyebrow {
  margin: 0 0 var(--tf-spacing-4);
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-caption-sm);
  font-weight: 500;
  letter-spacing: var(--tf-tracking-eyebrow);
  text-transform: uppercase;
  color: var(--tf-color-accent-ink);
}

.spotlight__title {
  margin: 0 auto var(--tf-spacing-4);
  max-width: 46ch;
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h2);
  font-weight: 600;
  line-height: var(--tf-leading-tight);
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
}

.spotlight__copy {
  max-width: 52ch;
  margin: 0 auto;
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-body);
  color: var(--tf-color-muted);
}

.spotlight__copy :deep(p) {
  margin: 0 0 var(--tf-spacing-3);
}

.spotlight__copy :deep(p:last-child) {
  margin-bottom: 0;
}

.spotlight__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tf-spacing-3);
  justify-content: center;
  margin-top: var(--tf-spacing-6);
}

@media (max-width: 480px) {
  .spotlight {
    padding: var(--tf-spacing-6) var(--tf-spacing-5);
  }

  .spotlight__title {
    font-size: var(--tf-text-h3);
  }

  /* Two pills side by side wrap into an uneven pair on a phone. */
  .spotlight__actions :deep(> *) {
    flex: 1 1 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spotlight__bloom {
    animation: none;
    will-change: auto;
  }
}
</style>
