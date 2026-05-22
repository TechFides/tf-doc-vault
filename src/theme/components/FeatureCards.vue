<script setup lang="ts">
import { useData } from "vitepress";

const { frontmatter } = useData();

const ICONS: Record<string, string> = {
  business: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="7 10 10 13 13 9 17 12"/></svg>`,
  functional: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/><line x1="5" y1="17" x2="19" y2="17"/></svg>`,
  technical: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>`,
};

function getIcon(name: string): string {
  return ICONS[name] ?? ICONS.business;
}
</script>

<template>
  <div v-if="frontmatter.features?.length" class="feature-cards">
    <a
      v-for="card in frontmatter.features"
      :key="card.title"
      :href="card.link"
      class="feature-card"
    >
      <div
        class="feature-card__icon"
        v-html="getIcon(card.icon ?? 'business')"
      />
      <h3 class="feature-card__title">{{ card.title }}</h3>
      <p class="feature-card__desc">{{ card.description }}</p>
      <span class="feature-card__cta">{{ card.linkText ?? "Explore" }}</span>
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
  border-radius: 0; /* David: sharp edges global */
  background: var(--vp-c-bg);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
  cursor: pointer;
}

.feature-card:hover {
  border-color: var(--tf-primary-hover);
  text-decoration: none;
}

.feature-card__icon {
  width: 40px;
  height: 40px;
  padding: 8px;
  border-radius: 0; /* David: sharp edges */
  background: var(--tf-surface); /* CSO spec: #f5f7fa pro sekční pozadí */
  color: var(--tf-primary);
  margin-bottom: 16px;
  flex-shrink: 0;
}

.dark .feature-card__icon {
  background: rgba(0, 116, 200, 0.12);
  color: var(--tf-secondary);
}

.feature-card__icon :deep(svg) {
  width: 100%;
  height: 100%;
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
  border-radius: 0; /* David: sharp edges */
  background: var(--tf-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700; /* David: button text = label weight 700 */
  text-align: center;
  align-self: flex-start;
  transition: background 0.15s ease;
}

.feature-card:hover .feature-card__cta {
  background: var(--tf-primary-hover);
}
</style>
