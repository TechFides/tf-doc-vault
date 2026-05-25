<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";
import LogoSymbol from "../icons/LogoSymbol.vue";
import { useStrings } from "../composables/useStrings.js";

const { theme } = useData();
const strings = useStrings();

const homeLink = computed(() => (theme.value.logoLink as string) || "/");
</script>

<template>
  <div class="not-found">
    <div class="not-found__inner">
      <LogoSymbol class="not-found__mark" />
      <p class="not-found__code">{{ strings.notFoundCode }}</p>
      <h1 class="not-found__heading">{{ strings.notFoundHeading }}</h1>
      <p class="not-found__message">{{ strings.notFoundMessage }}</p>
      <a class="not-found__link" :href="homeLink">
        ← {{ strings.notFoundLink }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--vp-nav-height, 64px) - 200px);
  padding: 48px 24px;
}

.not-found__inner {
  max-width: 520px;
  text-align: center;
}

.not-found__mark {
  width: 80px;
  height: auto;
  margin: 0 auto 24px;
  display: block;
  color: var(--brand-primary);
}

.not-found__code {
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  color: var(--brand-primary);
  margin: 0 0 8px;
  letter-spacing: 0;
}

.not-found__heading {
  font-size: 32px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--vp-c-text-1);
  margin: 0 0 16px;
  border: none;
  padding: 0;
}

.not-found__message {
  font-size: 16px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0 0 32px;
}

.not-found__link {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 0;
  background: var(--brand-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s ease;
}

.not-found__link:hover {
  background: var(--brand-primary-hover);
  text-decoration: none;
}

@media (min-width: 640px) {
  .not-found__mark {
    width: 96px;
    margin-bottom: 32px;
  }

  .not-found__code {
    font-size: 48px;
  }

  .not-found__heading {
    font-size: 40px;
  }
}
</style>
