<script setup lang="ts">
defineProps<{
  /** Small uppercase label above the headline. Omit to drop the row. */
  eyebrow?: string;
  /** The headline. Omit to drop the row. */
  title?: string;
}>();
</script>

<template>
  <aside class="spotlight">
    <div class="spotlight__bloom" aria-hidden="true" />
    <div v-if="$slots.mark" class="spotlight__mark">
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
/*
 * A centred panel that sends the reader out of the document to one thing. Glass rather
 * than the filled slab a promo block usually is: it lies on the backdrop like the feature
 * cards, and a solid accent fill here would both fight the nebula and force white text
 * onto a mid-blue ground.
 *
 * What separates it from a card is the light: a bloom contained by the panel's own
 * overflow, and a static accent hairline along the top drawn from --tf-edge-stops, the
 * same colours the hero's swept rim uses. The sweep stays the hero's alone.
 */
.spotlight {
  position: relative;
  overflow: hidden;
  margin-block: var(--tf-spacing-lg);
  padding: var(--tf-spacing-8) var(--tf-spacing-7);
  border: 1px solid var(--tf-color-line);
  border-radius: var(--tf-radius-xl);
  background: var(--tf-color-panel-glass);
  backdrop-filter: blur(var(--tf-blur-panel)) saturate(var(--tf-glass-saturate));
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

/* Oversized and offset so only its falloff crosses the panel; the centre sits outside,
   which keeps the wash off the copy. */
.spotlight__bloom {
  position: absolute;
  inset: -30% -15% auto auto;
  width: 60%;
  aspect-ratio: 1;
  pointer-events: none;
  /* Quieter than the dark variant below, and well under the cap where the peak landing on
     the copy would cost it 4.5:1: a light cloud darkens the glass instead of lighting it. */
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

/* Free-standing, not in a tinted tile. A brand mark carries its own shape and colour, and
   framing it fights both; an icon glyph reads fine unframed above the eyebrow. */
.spotlight__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--tf-spacing-4);
  color: var(--tf-color-accent-ink);
}

/* Height, not width: a wordmark is wide and a glyph is square, and capping the height is
   what makes the two sit at the same optical size. */
.spotlight__mark :deep(*) {
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: var(--tf-size-2xl);
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
  /* Wider than the copy below it: the display face is larger, so the same character count
     would break a headline two lines earlier than it breaks the paragraph. */
  max-width: 46ch;
  font-family: var(--tf-font-display);
  /* The panel's job is to carry one statement, so the headline has to outweigh the copy
     rather than sit a step above it. */
  font-size: var(--tf-text-h2);
  font-weight: 600;
  line-height: var(--tf-leading-tight);
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
}

/* Narrower than the panel, so the copy keeps a readable line even though the panel runs
   the full width of the reading column. */
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

  /* One step down: at the desktop size a Czech headline runs to three or four lines here,
     which reads as a page title dropped inside a card rather than as a statement. */
  .spotlight__title {
    font-size: var(--tf-text-h3);
  }

  /* Full-width buttons: two pills side by side wrap into an uneven pair on a phone. */
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
