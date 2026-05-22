<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

const { site, theme } = useData();

const isEnglish = computed(() => /^en/i.test(site.value.lang || ""));

const labels = computed(() =>
  isEnglish.value
    ? {
        code: "404",
        heading: "Page not found",
        message: "The page you're looking for doesn't exist or was moved.",
        link: "Back to home",
      }
    : {
        code: "404",
        heading: "Stránka nenalezena",
        message:
          "Stránka, kterou hledáš, neexistuje, nebo byla přesunuta jinam.",
        link: "Zpět na úvod",
      },
);

const homeLink = computed(() => (theme.value.logoLink as string) || "/");
</script>

<template>
  <div class="tf-not-found">
    <div class="tf-not-found__inner">
      <!--
        Brand mark instead of a drawn illustration. Per the original
        spec: empty states use the TechFides symbol or a simple
        technical icon, never illustrative artwork.
      -->
      <svg
        class="tf-not-found__mark"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="173 108 89 103"
        aria-hidden="true"
      >
        <rect x="178.1" y="113" width="79.2" height="10.2" />
        <polygon
          points="178.1,134.6 178.1,144.8 203.8,144.8 203.8,197.4 214,206 214,144.8 214,134.6 203.8,134.6"
        />
        <rect x="221.4" y="134.6" width="35.9" height="10.2" />
        <rect x="221.4" y="157.7" width="26.4" height="10.2" />
      </svg>
      <p class="tf-not-found__code">{{ labels.code }}</p>
      <h1 class="tf-not-found__heading">{{ labels.heading }}</h1>
      <p class="tf-not-found__message">{{ labels.message }}</p>
      <a class="tf-not-found__link" :href="homeLink"> ← {{ labels.link }} </a>
    </div>
  </div>
</template>

<style scoped>
.tf-not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--vp-nav-height, 64px) - 200px);
  padding: 48px 24px;
}

.tf-not-found__inner {
  max-width: 520px;
  text-align: center;
}

.tf-not-found__mark {
  width: 80px;
  height: auto;
  margin: 0 auto 24px;
  display: block;
  fill: var(--tf-primary);
}

.tf-not-found__code {
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  color: var(--tf-primary);
  margin: 0 0 8px;
  letter-spacing: 0;
}

.tf-not-found__heading {
  font-size: 32px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--vp-c-text-1);
  margin: 0 0 16px;
  border: none;
  padding: 0;
}

.tf-not-found__message {
  font-size: 16px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0 0 32px;
}

.tf-not-found__link {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 0;
  background: var(--tf-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s ease;
}

.tf-not-found__link:hover {
  background: var(--tf-primary-hover);
  text-decoration: none;
}

@media (min-width: 640px) {
  .tf-not-found__mark {
    width: 96px;
    margin-bottom: 32px;
  }

  .tf-not-found__code {
    font-size: 48px;
  }

  .tf-not-found__heading {
    font-size: 40px;
  }
}
</style>
