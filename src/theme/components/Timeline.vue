<template>
  <!-- An ordered list, because the entries are a sequence and their order carries meaning.
       TimelineItem renders the li. -->
  <ol class="timeline">
    <slot />
  </ol>
</template>

<style scoped>
/*
 * A dated sequence, newest first, and the rail says so: one gradient behind the whole list,
 * bright where the present is and fading out into the past. That is the component's whole
 * idea, so the entries themselves stay plain and the first one is the only marked point.
 *
 * One rail rather than a segment per entry: a gradient has to run the length of the thing it
 * describes, and per-entry pieces would each restart it.
 */
.timeline {
  position: relative;
  margin-block: var(--tf-spacing-7);
  padding: 0 0 0 var(--tf-spacing-7);
  list-style: none;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 0.5em;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    180deg,
    var(--tf-color-accent),
    color-mix(in oklab, var(--tf-color-accent) 30%, transparent) 45%,
    transparent 95%
  );
}

.dark .timeline::before {
  background: linear-gradient(
    180deg,
    var(--tf-color-accent-2),
    color-mix(in oklab, var(--tf-color-accent-2) 26%, transparent) 45%,
    transparent 95%
  );
}
</style>
