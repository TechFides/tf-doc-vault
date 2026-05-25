<script setup lang="ts">
import { useData } from "vitepress";

const { frontmatter } = useData();
</script>

<template>
  <div v-if="frontmatter.hero" class="brand-hero">
    <div class="brand-hero__inner">
      <h1 class="brand-hero__title">
        {{ frontmatter.hero.title ?? frontmatter.title }}
      </h1>
      <!-- v-html is safe here: frontmatter is authored markdown (trusted source),
           not user-submitted content. Allows <strong>, <em> in subtitle. -->
      <p
        v-if="frontmatter.hero.subtitle"
        class="brand-hero__subtitle"
        v-html="frontmatter.hero.subtitle"
      />
    </div>
  </div>
</template>

<style scoped>
.brand-hero {
  background: var(--brand-navy);
  color: #fff;
  /* Full-bleed: compensate VitePress content padding */
  margin-top: -24px;
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: 40px;
  padding: 48px 24px 56px;
}

.brand-hero__inner {
  max-width: var(--layout-max-width-narrow, 800px);
}

.brand-hero__title {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
  border-top: none;
  margin-top: 0;
  margin-bottom: 16px;
  padding-top: 0;
}

.brand-hero__subtitle {
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
  margin: 0;
}

/* breakpoints — see --bp-md / --bp-xl in base.css */
@media (min-width: 640px) {
  .brand-hero {
    margin-left: -48px;
    margin-right: -48px;
    padding: 64px 48px 72px;
  }

  .brand-hero__title {
    font-size: 42px;
  }
}

@media (min-width: 960px) {
  .brand-hero {
    margin-left: -64px;
    margin-right: -64px;
    padding: 72px 64px 80px;
  }
}

.dark .brand-hero {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
