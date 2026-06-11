<script setup lang="ts">
import { useData, withBase } from "vitepress";
import { computed, type Component } from "vue";
import { useI18n } from "vue-i18n";
import IconBusiness from "../icons/IconBusiness.vue";
import IconFunctional from "../icons/IconFunctional.vue";
import IconTechnical from "../icons/IconTechnical.vue";

interface FeatureCard {
  icon?: string;
  title: string;
  description: string;
  link: string;
  linkText?: string;
}

const { frontmatter } = useData();
const { t } = useI18n();

const icons: Record<string, Component> = {
  business: IconBusiness,
  functional: IconFunctional,
  technical: IconTechnical,
};

function resolveIcon(name?: string): Component {
  return (name && icons[name]) || IconBusiness;
}

const features = computed<FeatureCard[]>(
  () => frontmatter.value?.features ?? [],
);
</script>

<template>
  <div v-if="features.length" class="feature-cards">
    <a
      v-for="card in features"
      :key="card.title"
      :href="withBase(card.link)"
      class="feature-card"
    >
      <div class="feature-card__icon-wrap">
        <component :is="resolveIcon(card.icon)" class="feature-card__icon" />
      </div>
      <h3 class="feature-card__title">{{ card.title }}</h3>
      <p class="feature-card__desc">{{ card.description }}</p>
      <span class="feature-card__cta">
        {{ card.linkText ?? t("feature.cta") }}
        <svg
          class="feature-card__arrow"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </a>
  </div>
</template>

<style scoped>
.feature-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 0 0 40px;
}

@media (min-width: 480px) {
  .feature-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (min-width: 768px) {
  .feature-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

.feature-card {
  display: flex;
  flex-direction: column;
  padding: 28px;
  border-radius: 10px;
  border: 1px solid rgba(0, 116, 200, 0.18);
  background: var(--vp-c-bg);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.06),
    0 0 0 0 transparent;
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
  cursor: pointer;
}

.feature-card:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 6px 20px rgba(0, 116, 200, 0.12);
  transform: translateY(-2px);
  text-decoration: none;
}

.dark .feature-card {
  background: #0e2240;
  border-color: rgba(0, 116, 200, 0.35);
}

.dark .feature-card:hover {
  border-color: var(--brand-secondary);
  box-shadow: 0 4px 20px rgba(0, 160, 227, 0.12);
}

.feature-card__icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--brand-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.feature-card:hover .feature-card__icon-wrap {
  background: rgba(0, 116, 200, 0.16);
}

.dark .feature-card__icon-wrap {
  background: rgba(0, 116, 200, 0.15);
}

.dark .feature-card:hover .feature-card__icon-wrap {
  background: rgba(0, 160, 227, 0.2);
}

.feature-card__icon {
  width: 22px;
  height: 22px;
  color: var(--brand-primary);
  flex-shrink: 0;
}

.dark .feature-card__icon {
  color: var(--brand-secondary);
}

.feature-card__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-1);
  margin: 0 0 10px;
  border: none;
  padding: 0;
}

.feature-card__desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
  margin: 0;
  flex: 1;
}

.feature-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 24px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-primary);
  transition:
    gap 0.15s ease,
    color 0.15s ease;
}

.dark .feature-card__cta {
  color: var(--brand-secondary);
}

.feature-card:hover .feature-card__cta {
  gap: 10px;
  color: var(--brand-primary-hover);
}

.dark .feature-card:hover .feature-card__cta {
  color: #4dbfee;
}

.feature-card__arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
