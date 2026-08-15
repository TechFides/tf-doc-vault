<script setup lang="ts">
/**
 * Nebula and star field behind the whole site. Styling lives in
 * `styles/backdrop.css` because it depends on the layout above it staying
 * transparent, which is a decision base.css makes.
 */
</script>

<template>
  <div class="tf-backdrop" aria-hidden="true">
    <div class="tf-backdrop__nebula" />
    <div class="tf-backdrop__stars">
      <span class="tf-star-a" />
      <span class="tf-star-b" />
      <span class="tf-star-c" />
      <span class="tf-star-d" />
    </div>
  </div>
</template>
