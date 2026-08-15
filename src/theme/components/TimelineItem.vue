<script setup lang="ts">
defineProps<{
  /** When it happened: a year, a range, or a word like "Dnes". Omit to drop it. */
  date?: string;
  /** What happened. Omit to drop the row. */
  title?: string;
}>();
</script>

<template>
  <li class="timeline-item">
    <p v-if="date || title" class="timeline-item__head">
      <span v-if="date" class="timeline-item__date">{{ date }}</span>
      <span v-if="title" class="timeline-item__title">{{ title }}</span>
    </p>
    <div v-if="$slots.default" class="timeline-item__body"><slot /></div>
  </li>
</template>

<style scoped>
/* The rail belongs to Timeline; an entry only marks its own point on it. */
.timeline-item {
  position: relative;
  padding-bottom: var(--tf-spacing-7);
}

.timeline-item:last-child {
  padding-bottom: 0;
}

/* The page colour, not transparent: the ring has to punch the rail out behind it. */
.timeline-item::before {
  content: "";
  position: absolute;
  left: calc(-1 * var(--tf-spacing-7) + 0.5px);
  top: 0.34em;
  width: var(--tf-size-xs);
  height: var(--tf-size-xs);
  box-sizing: border-box;
  border: 1px solid color-mix(in oklab, var(--tf-color-accent) 55%, transparent);
  border-radius: var(--tf-radius-pill);
  background: var(--tf-color-bg);
}

/* Filling only the first point is what makes "newest first" legible without a word saying so. */
.timeline-item:first-child::before {
  border-color: transparent;
  background: var(--tf-grad-accent);
  box-shadow: 0 0 0 4px
    color-mix(in oklab, var(--tf-color-accent) 14%, transparent);
}

.timeline-item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--tf-spacing-3);
  margin: 0;
  font-family: var(--tf-font-display);
  line-height: var(--tf-leading-tight);
}

.timeline-item__date {
  font-size: var(--tf-text-caption-sm);
  font-weight: 600;
  letter-spacing: var(--tf-tracking-label);
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: var(--tf-color-accent-ink);
}

.timeline-item__title {
  font-size: var(--tf-text-body);
  font-weight: 600;
  color: var(--tf-color-fg);
}

.timeline-item__body {
  margin-top: var(--tf-spacing-2);
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-body);
  color: var(--tf-color-muted);
}

.timeline-item__body :deep(p) {
  margin: 0 0 var(--tf-spacing-2);
}

.timeline-item__body :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
