<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";
import type { BrandingFooter } from "../../config/makeConfig.js";

interface ThemeWithFooter {
  docVault?: { footer?: BrandingFooter | null };
}

const { theme } = useData();

const footer = computed<BrandingFooter | null>(
  () => (theme.value as ThemeWithFooter).docVault?.footer ?? null,
);

function hostName(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
</script>

<template>
  <footer v-if="footer" class="brand-footer">
    <div class="brand-footer__inner">
      <a
        v-if="footer.websiteUrl"
        :href="footer.websiteUrl"
        target="_blank"
        rel="noopener"
        class="brand-footer__link"
      >
        {{ footer.websiteLabel ?? hostName(footer.websiteUrl) }}
      </a>
      <span
        v-if="footer.websiteUrl && footer.email"
        class="brand-footer__sep"
        aria-hidden="true"
        >•</span
      >
      <a
        v-if="footer.email"
        :href="`mailto:${footer.email}`"
        class="brand-footer__link"
      >
        {{ footer.email }}
      </a>
      <span
        v-if="(footer.websiteUrl || footer.email) && footer.address"
        class="brand-footer__sep"
        aria-hidden="true"
        >•</span
      >
      <span v-if="footer.address" class="brand-footer__address">
        {{ footer.address }}
      </span>
    </div>
  </footer>
</template>

<style scoped>
.brand-footer {
  position: relative;
  margin-top: var(--tf-spacing-lg);
  padding: var(--tf-spacing-6);
  text-align: center;
}

/* The same fading accent hairline that opens every section, closing the page. */
.brand-footer::before {
  content: "";
  position: absolute;
  inset: 0 var(--tf-spacing-6) auto;
  height: 1px;
  background: var(--tf-grad-line);
  opacity: var(--tf-dim);
}

.brand-footer__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--tf-spacing-2);
  font-size: var(--tf-text-caption);
  color: var(--tf-color-muted);
}

.brand-footer__link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: var(--tf-t-base);
}

.brand-footer__link:hover {
  text-decoration: underline;
  color: var(--brand-primary-hover);
}

.brand-footer__sep {
  color: var(--tf-color-disabled);
}

.brand-footer__address {
  color: var(--tf-color-muted);
}

.dark .brand-footer__link {
  color: var(--tf-color-accent-2);
}

.dark .brand-footer__link:hover {
  color: color-mix(in oklab, var(--tf-color-accent-2) 78%, white);
}

@media (max-width: 639px) {
  .brand-footer__inner {
    flex-direction: column;
    gap: var(--tf-spacing-4);
  }

  .brand-footer__sep {
    display: none;
  }
}
</style>
