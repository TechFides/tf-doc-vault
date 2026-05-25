<script setup lang="ts">
import { useData } from "vitepress";
import { computed, type Component } from "vue";
import IconBusiness from "../icons/IconBusiness.vue";
import IconFunctional from "../icons/IconFunctional.vue";
import IconTechnical from "../icons/IconTechnical.vue";
import { useStrings } from "../composables/useStrings.js";

interface FeatureCard {
  icon?: string;
  title: string;
  description: string;
  link: string;
  linkText?: string;
}

const { frontmatter } = useData();
const strings = useStrings();

const icons: Record<string, Component> = {
  business: IconBusiness,
  functional: IconFunctional,
  technical: IconTechnical,
};

const features = computed<FeatureCard[]>(
  () => frontmatter.value?.features ?? [],
);
</script>

<template>
  <div v-if="features.length" class="feature-cards">
    <a
      v-for="card in features"
      :key="card.title"
      :href="card.link"
      class="feature-card"
    >
      <component
        :is="icons[card.icon ?? 'business'] ?? IconBusiness"
        class="feature-card__icon"
      />
      <h3 class="feature-card__title">{{ card.title }}</h3>
      <p class="feature-card__desc">{{ card.description }}</p>
      <span class="feature-card__cta">
        {{ card.linkText ?? strings.featureCtaText }}
      </span>
    </a>
  </div>
</template>

<style scoped>
.feature-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 32px 0;
}

/* breakpoints — see --bp-sm in base.css */
@media (min-width: 480px) {
  .feature-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

@media (min-width: 768px) {
  .feature-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

.feature-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0;
  background: var(--vp-c-bg);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
  cursor: pointer;
}

.feature-card:hover {
  border-color: var(--brand-primary-hover);
  text-decoration: none;
}

.feature-card__icon {
  width: 40px;
  height: 40px;
  padding: 8px;
  border-radius: 0;
  background: var(--brand-surface);
  color: var(--brand-primary);
  margin-bottom: 16px;
  flex-shrink: 0;
}

.dark .feature-card__icon {
  background: rgba(0, 116, 200, 0.12);
  color: var(--brand-secondary);
}

.feature-card__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
  border: none;
  padding: 0;
}

.feature-card__desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
  flex: 1;
}

.feature-card__cta {
  display: inline-block;
  margin-top: 24px;
  padding: 8px 24px;
  border-radius: 0;
  background: var(--brand-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  align-self: flex-start;
  transition: background 0.15s ease;
}

.feature-card:hover .feature-card__cta {
  background: var(--brand-primary-hover);
}
</style>
