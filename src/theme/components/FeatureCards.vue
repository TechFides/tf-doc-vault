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

.feature-card {
  display: flex;
  flex-direction: column;
  padding: var(--tf-spacing-7);
  border-radius: var(--tf-radius-xl);
  border: 1px solid var(--tf-color-line);
  /* Glass, because a feature card sits directly on the backdrop rather than inside
     the reading panel and has to soften the stars behind it itself. */
  background: var(--tf-color-panel-glass);
  backdrop-filter: blur(var(--tf-blur-panel)) saturate(var(--tf-glass-saturate));
  box-shadow: var(--tf-shadow-1);
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: var(--tf-t-base);
}

.feature-card:hover {
  border-color: color-mix(
    in oklab,
    var(--tf-color-accent) 45%,
    var(--tf-color-line)
  );
  background: var(--tf-color-panel-hi);
  box-shadow: var(--tf-shadow-2);
  transform: translateY(-2px);
  text-decoration: none;
}

.feature-card__icon-wrap {
  width: var(--tf-size-2xl);
  height: var(--tf-size-2xl);
  border-radius: var(--tf-radius-lg);
  background: color-mix(
    in oklab,
    var(--tf-color-accent) var(--tf-tint),
    transparent
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--tf-spacing-5);
  flex-shrink: 0;
  transition: var(--tf-t-base);
}

/* The tile fills with the accent gradient on hover and the glyph flips to white:
   the card's own colour arriving, rather than a generic highlight. */
.feature-card:hover .feature-card__icon-wrap {
  background: var(--tf-grad-accent);
}

.feature-card__icon {
  width: var(--tf-icon-xl);
  height: var(--tf-icon-xl);
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
  transition: var(--tf-t-base);
}

.dark .feature-card__icon {
  color: var(--tf-color-accent-2);
}

.feature-card:hover .feature-card__icon,
.dark .feature-card:hover .feature-card__icon {
  color: #fff;
}

.feature-card__title {
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h4);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
  margin: 0 0 var(--tf-spacing-2);
  border: none;
  padding: 0;
}

.feature-card__desc {
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-body);
  color: var(--tf-color-muted);
  margin: 0;
  flex: 1;
}

.feature-card__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--tf-spacing-2);
  margin-top: var(--tf-spacing-6);
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-body-sm);
  font-weight: 600;
  color: var(--vp-c-brand-1);
  transition:
    gap var(--tf-dur-1) var(--tf-ease-out),
    color var(--tf-dur-1) var(--tf-ease-out);
}

.dark .feature-card__cta {
  color: var(--tf-color-accent-2);
}

.feature-card:hover .feature-card__cta {
  gap: var(--tf-spacing-3);
}

.feature-card__arrow {
  width: var(--tf-icon-md);
  height: var(--tf-icon-md);
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .feature-card:hover {
    transform: none;
  }
}
</style>
