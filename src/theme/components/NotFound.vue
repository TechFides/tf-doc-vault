<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import LogoSymbol from "../icons/LogoSymbol.vue";

const { theme, site } = useData();
const { t } = useI18n();

// logoLink is normally set by makeConfig (= effectiveBase); fall back to the
// site base, never a bare "/" which would escape a site served under a subpath.
const homeLink = computed(
  () => (theme.value.logoLink as string) || site.value.base,
);
</script>

<template>
  <div class="not-found">
    <div class="not-found__inner">
      <LogoSymbol class="not-found__mark" />
      <p class="not-found__code">{{ t("notFound.code") }}</p>
      <h1 class="not-found__heading">{{ t("notFound.heading") }}</h1>
      <p class="not-found__message">{{ t("notFound.message") }}</p>
      <a class="not-found__link" :href="homeLink">
        ← {{ t("notFound.link") }}
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
  padding: var(--tf-spacing-lg) var(--tf-spacing-6);
}

.not-found__inner {
  max-width: 520px;
  text-align: center;
}

.not-found__mark {
  width: var(--tf-icon-hero);
  height: auto;
  margin: 0 auto var(--tf-spacing-6);
  display: block;
  color: var(--vp-c-brand-1);
}

/* The code takes the accent gradient and the sentence stays plain: one of the two
   should carry the colour, and the number is the part a reader recognises first. */
.not-found__code {
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h1);
  font-weight: 700;
  line-height: 1;
  letter-spacing: var(--tf-tracking-h);
  font-variant-numeric: tabular-nums;
  background: var(--tf-grad-accent-h);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  margin: 0 0 var(--tf-spacing-2);
}

@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
  .not-found__code {
    color: var(--vp-c-brand-1);
    -webkit-text-fill-color: var(--vp-c-brand-1);
  }
}

.not-found__heading {
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h2);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
  margin: 0 0 var(--tf-spacing-4);
  border: none;
  padding: 0;
}

.not-found__message {
  font-size: var(--tf-text-lead);
  line-height: var(--tf-leading-body);
  color: var(--tf-color-muted);
  margin: 0 0 var(--tf-spacing-8);
}

.not-found__link {
  display: inline-flex;
  align-items: center;
  gap: var(--tf-spacing-2);
  height: var(--tf-size-3xl);
  padding: 0 var(--tf-spacing-7);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-grad-accent);
  color: #fff;
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-body);
  font-weight: 600;
  text-decoration: none;
  transition: var(--tf-t-base);
}

.not-found__link:hover {
  color: #fff;
  box-shadow: var(--tf-shadow-2);
  transform: translateY(-1px);
  text-decoration: none;
}

@media (prefers-reduced-motion: reduce) {
  .not-found__link:hover {
    transform: none;
  }
}
</style>
