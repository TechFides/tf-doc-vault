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
  margin-top: 24px;
  padding: 24px;
  text-align: center;
}

.brand-footer__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.brand-footer__link {
  color: var(--brand-primary);
  text-decoration: none;
}

.brand-footer__link:hover {
  text-decoration: underline;
  color: var(--brand-primary-hover);
}

.brand-footer__sep {
  color: var(--vp-c-text-3);
}

.brand-footer__address {
  color: var(--vp-c-text-2);
}

.dark .brand-footer__link {
  color: var(--brand-secondary);
}

.dark .brand-footer__link:hover {
  color: var(--brand-secondary);
  opacity: 0.85;
}

@media (max-width: 639px) {
  .brand-footer__inner {
    flex-direction: column;
    gap: 16px;
  }

  .brand-footer__sep {
    display: none;
  }
}
</style>
