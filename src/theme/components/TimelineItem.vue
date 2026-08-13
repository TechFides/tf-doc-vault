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
/*
 * One entry, carrying its own piece of the rail. The rail is a pseudo-element on the item and
 * the last item does not draw one, which is what makes the line stop at the final dot rather
 * than running on into the list's padding.
 */
.timeline-item {
  position: relative;
  padding-left: var(--tf-spacing-6);
  padding-bottom: var(--tf-spacing-6);
}

.timeline-item:last-child {
  padding-bottom: 0;
}

/* The dot. Centred on the rail rather than beside it, and aligned with the cap height of the
   head above the baseline, which is what the 0.42em offset buys. */
.timeline-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.42em;
  width: var(--tf-size-2xs);
  height: var(--tf-size-2xs);
  border-radius: var(--tf-radius-pill);
  background: var(--tf-color-accent);
  box-shadow: 0 0 0 3px
    color-mix(in oklab, var(--tf-color-accent) var(--tf-tint), transparent);
}

.dark .timeline-item::before {
  background: var(--tf-color-accent-2);
}

/* The rail. It starts below the dot and runs to the next entry's dot. */
.timeline-item:not(:last-child)::after {
  content: "";
  position: absolute;
  left: calc(var(--tf-size-2xs) / 2 - 0.5px);
  top: calc(0.42em + var(--tf-size-2xs) + var(--tf-spacing-2));
  bottom: calc(-1 * var(--tf-spacing-2));
  width: 1px;
  /* The accent at low alpha rather than the neutral line colour: a hairline of --tf-color-line
     is nearly invisible on a light panel, and tinting it ties the rail to the dots it joins. */
  background: color-mix(in oklab, var(--tf-color-accent) 28%, transparent);
}

/* Date and title on one line: the labels differ in width, from a year to a range to a word,
   and a fixed column for them would leave a ragged gutter or wrap the short ones. */
.timeline-item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--tf-spacing-2);
  margin: 0;
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-tight);
}

.timeline-item__date {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--tf-color-accent-ink);
}

.timeline-item__title {
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
