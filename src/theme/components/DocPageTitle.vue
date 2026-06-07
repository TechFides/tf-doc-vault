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
.doc-page-title {
  margin-top: 0;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}
</style>
