<script setup lang="ts">
import { withBase } from "vitepress";
import { type Component } from "vue";
import { useI18n } from "vue-i18n";
import IconBusiness from "../icons/IconBusiness.vue";
import IconFunctional from "../icons/IconFunctional.vue";
import IconTechnical from "../icons/IconTechnical.vue";

defineProps<{
  /** Label above the title, for the category the card belongs to. Omit to drop the row. */
  eyebrow?: string;
  /** One of the bundled icons: `business`, `functional`, `technical`. */
  icon?: string;
  title: string;
  /** One sentence under the title. For anything richer, use the default slot. */
  description?: string;
  /** Omit to get a card that states something rather than leading somewhere. */
  link?: string;
  linkText?: string;
}>();

const { t } = useI18n();

const icons: Record<string, Component> = {
  business: IconBusiness,
  functional: IconFunctional,
  technical: IconTechnical,
};

function resolveIcon(name?: string): Component {
  return (name && icons[name]) || IconBusiness;
}
</script>

<template>
  <!-- An anchor only when there is somewhere to go. The element type is what carries the
       distinction: the interactive styles below hang off `a.feature-card`, so a card
       without a link cannot pick up a pointer, a hover lift or a focus ring. -->
  <component
    :is="link ? 'a' : 'div'"
    :href="link ? withBase(link) : undefined"
    class="feature-card"
  >
    <div class="feature-card__icon-wrap">
      <component :is="resolveIcon(icon)" class="feature-card__icon" />
    </div>
    <span v-if="eyebrow" class="tf-eyebrow">{{ eyebrow }}</span>
    <h3 class="feature-card__title">{{ title }}</h3>
    <p v-if="description" class="feature-card__desc">{{ description }}</p>
    <div v-if="$slots.default" class="feature-card__desc"><slot /></div>
    <span v-if="link" class="feature-card__cta">
      {{ linkText ?? t("feature.cta") }}
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
  </component>
</template>

<style scoped>
.feature-card {
  display: flex;
  flex-direction: column;
  padding: var(--tf-spacing-7);
  border-radius: var(--tf-radius-xl);
  border: 1px solid var(--tf-color-line);
  background: var(--tf-color-panel-glass);
  backdrop-filter: var(--tf-glass-filter);
  box-shadow: var(--tf-shadow-1);
  text-decoration: none;
  color: inherit;
  transition: var(--tf-t-base);
}

a.feature-card:hover {
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
  background: var(--tf-color-accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--tf-spacing-5);
  flex-shrink: 0;
  transition: var(--tf-t-base);
}

a.feature-card:hover .feature-card__icon-wrap {
  background: var(--tf-grad-accent);
}

.feature-card__icon {
  width: var(--tf-icon-xl);
  height: var(--tf-icon-xl);
  color: var(--tf-color-link);
  flex-shrink: 0;
  transition: var(--tf-t-base);
}

a.feature-card:hover .feature-card__icon {
  color: #fff;
}

/* Tighter than the standalone eyebrow: inside a card it labels the title right below it
   rather than opening a section. */
.feature-card .tf-eyebrow {
  margin-bottom: var(--tf-spacing-1);
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

.feature-card__desc :deep(p) {
  margin: 0 0 var(--tf-spacing-2);
}

.feature-card__desc :deep(p:last-child) {
  margin-bottom: 0;
}

.feature-card__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--tf-spacing-2);
  margin-top: var(--tf-spacing-6);
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-body-sm);
  font-weight: 600;
  color: var(--tf-color-link);
  transition:
    gap var(--tf-dur-1) var(--tf-ease-out),
    color var(--tf-dur-1) var(--tf-ease-out);
}

a.feature-card:hover .feature-card__cta {
  gap: var(--tf-spacing-3);
}

.feature-card__arrow {
  width: var(--tf-icon-md);
  height: var(--tf-icon-md);
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  a.feature-card:hover {
    transform: none;
  }
}
</style>
