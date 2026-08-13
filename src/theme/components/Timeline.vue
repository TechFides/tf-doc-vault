<template>
  <!-- An ordered list, because the entries are a sequence and their order carries meaning.
       TimelineItem renders the li. -->
  <ol class="timeline">
    <slot />
  </ol>
</template>

<style scoped>
/* The rail belongs to the list, not to the entries: one gradient has to run the length of the
   sequence, where per-entry pieces would each restart it. */
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
