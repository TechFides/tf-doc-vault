<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

const { page, frontmatter } = useData();

const visible = computed(
  () =>
    !frontmatter.value?.hero &&
    !frontmatter.value?.hideTitle &&
    !!page.value.title,
);
</script>

<template>
  <h1 v-if="visible" class="doc-page-title">{{ page.title }}</h1>
</template>

<style scoped>
/* This heading sits in the `doc-before` slot, outside `.vp-doc`, so the h1 rule
   in base.css cannot reach it and the type has to be set here. */
.doc-page-title {
  position: relative;
  margin-top: 0;
  margin-bottom: var(--tf-spacing-7);
  padding-bottom: var(--tf-spacing-5);
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h1);
  font-weight: 600;
  line-height: var(--tf-leading-tight);
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
}

/* The accent hairline that section headings use, so the page title reads as the
   first and largest step of the same ladder. */
.doc-page-title::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: var(--tf-grad-line);
}
</style>
