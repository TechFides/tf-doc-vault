<template>
  <!-- An ordered list, because the entries are a sequence and their order carries meaning.
       TimelineItem renders the li. -->
  <ol class="timeline">
    <slot />
  </ol>
</template>

<style scoped>
/*
 * A dated sequence, newest first by convention. The rail is drawn per entry rather than once
 * behind the list, so it ends at the last dot instead of running past it into the padding.
 * See TimelineItem for that half.
 */
.timeline {
  margin-block: var(--tf-spacing-6);
  padding: 0;
  list-style: none;
}
</style>
