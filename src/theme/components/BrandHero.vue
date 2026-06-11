<script setup lang="ts">
import { useData } from "vitepress";

const { frontmatter } = useData();
</script>

<template>
  <div v-if="frontmatter.hero" class="brand-hero">
    <div class="brand-hero__glow" aria-hidden="true" />
    <div class="brand-hero__inner">
      <p class="brand-hero__eyebrow">Documentation</p>
      <h1 class="brand-hero__title">
        {{ frontmatter.hero.title ?? frontmatter.title }}
      </h1>
      <div v-if="$slots.subtitle" class="brand-hero__subtitle">
        <slot name="subtitle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-hero {
  background: linear-gradient(150deg, #1a6abf 0%, #0f4a8e 55%, #0a3570 100%);
  border-top: 4px solid var(--brand-secondary);
  box-shadow: 0 0 0 1px rgba(0, 116, 200, 0.3), inset 0 1px 0 rgba(0, 160, 227, 0.25);
  border-radius: 12px;
  color: #fff;
  margin-top: 0;
  margin-bottom: 24px;
  padding: 48px 40px 64px;
  position: relative;
  overflow: hidden;
}

.dark .brand-hero {
  background: linear-gradient(150deg, #0d3d73 0%, #092646 55%, #061a35 100%);
}

.brand-hero__glow {
  position: absolute;
  right: -80px;
  top: -80px;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(0, 160, 227, 0.22) 0%,
    rgba(0, 116, 200, 0.1) 45%,
    transparent 70%
  );
  pointer-events: none;
}

.brand-hero__inner {
  max-width: var(--layout-max-width-narrow, 800px);
  position: relative;
}

.brand-hero__eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
}

.brand-hero__title {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.15;
  color: #fff;
  border-top: none;
  margin-top: 0;
  margin-bottom: 20px;
  padding-top: 0;
  letter-spacing: -0.01em;
}

.brand-hero__subtitle {
  font-size: 16px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
}

.brand-hero__subtitle :deep(strong) {
  color: #fff;
  font-weight: 600;
}

.brand-hero__subtitle :deep(p) {
  margin: 0;
}

@media (min-width: 640px) {
  .brand-hero {
    padding: 56px 48px 72px;
  }

  .brand-hero__title {
    font-size: 52px;
  }
}

@media (min-width: 960px) {
  .brand-hero {
    padding: 64px 56px 80px;
  }

  .brand-hero__title {
    font-size: 60px;
  }
}
</style>
