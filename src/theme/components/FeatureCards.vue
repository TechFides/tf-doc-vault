<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";
import FeatureCard from "./FeatureCard.vue";

interface FeatureCardSpec {
  eyebrow?: string;
  icon?: string;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
}

const { frontmatter } = useData();

const features = computed<FeatureCardSpec[]>(
  () => frontmatter.value?.features ?? [],
);
</script>

<template>
  <!-- Cards written into the page win over the frontmatter list, so a page can keep its
       landing row in frontmatter and still place a different set further down. -->
  <div v-if="$slots.default" class="feature-cards"><slot /></div>
  <div v-else-if="features.length" class="feature-cards">
    <FeatureCard v-for="card in features" :key="card.title" v-bind="card" />
  </div>
</template>

<style scoped>
.feature-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--tf-spacing-4);
  margin: 0 0 var(--tf-spacing-lg);
}

@media (min-width: 480px) {
  .feature-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--tf-spacing-5);
  }
}

@media (min-width: 768px) {
  .feature-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--tf-spacing-6);
  }
}
</style>
