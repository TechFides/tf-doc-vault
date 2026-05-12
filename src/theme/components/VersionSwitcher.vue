<script setup lang="ts">
import { ref, computed } from "vue";
import { useData, useRouter } from "vitepress";

const { site } = useData();
const router = useRouter();
const isOpen = ref(false);

const versions = computed(() => {
  const locales = site.value.locales ?? {};
  return Object.entries(locales).map(([key, locale]) => ({
    key,
    label: (locale as { label?: string }).label ?? key,
    link: (locale as { link?: string }).link ?? `/${key}/`,
  }));
});

const currentVersion = computed(() => {
  const path = router.route.path;
  const match = path.match(/^\/(v\d+)\//);
  return match ? match[1] : (versions.value[0]?.label ?? "");
});

function switchVersion(link: string): void {
  isOpen.value = false;
  router.go(link);
}
</script>

<template>
  <div class="version-switcher" v-if="versions.length > 0">
    <button
      class="version-btn"
      @click="isOpen = !isOpen"
      @blur="isOpen = false"
    >
      {{ currentVersion }}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    <div class="version-menu" v-show="isOpen">
      <button
        v-for="v in versions"
        :key="v.key"
        class="version-item"
        :class="{ active: v.label === currentVersion }"
        @mousedown.prevent="switchVersion(v.link)"
      >
        {{ v.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.version-switcher {
  position: relative;
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.version-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.25s;
  white-space: nowrap;
}

.version-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.version-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 80px;
  padding: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  z-index: 100;
}

.version-item {
  display: block;
  width: 100%;
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.version-item:hover {
  background: var(--vp-c-bg-soft);
}

.version-item.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
</style>
