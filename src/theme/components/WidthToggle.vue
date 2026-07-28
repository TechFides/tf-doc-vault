<template>
  <button
    class="width-toggle"
    :title="title"
    @click="cycle"
    :aria-label="title"
  >
    <svg
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 10"
      width="40"
      height="20"
      aria-hidden="true"
    >
      <!-- page background -->
      <rect
        x="0"
        y="0"
        width="20"
        height="10"
        rx="2"
        fill="currentColor"
        opacity="0.25"
      />
      <!-- content column; its width tracks the current mode -->
      <rect
        :x="icon.x"
        y="0"
        :width="icon.w"
        height="10"
        :rx="icon.rx"
        fill="currentColor"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

type Mode = "default" | "wide" | "max";

const MODES: Mode[] = ["default", "wide", "max"];

const LABELS: Record<Mode, string> = {
  default: "Šířka obsahu: výchozí",
  wide: "Šířka obsahu: rozšířená",
  max: "Šířka obsahu: maximum",
};

const ICONS: Record<Mode, { x: number; w: number; rx: number }> = {
  default: { x: 6, w: 8, rx: 2 },
  wide: { x: 4, w: 12, rx: 2 },
  max: { x: 0, w: 20, rx: 2 },
};

const STORAGE_KEY = "vp-layout-width";

const mode = ref<Mode>("default");
const icon = computed(() => ICONS[mode.value]);
const title = computed(() => LABELS[mode.value]);

function applyMode(m: Mode) {
  document.documentElement.classList.remove("layout-wide", "layout-max");
  if (m === "wide") document.documentElement.classList.add("layout-wide");
  if (m === "max") document.documentElement.classList.add("layout-max");
}

function cycle() {
  const next = MODES[(MODES.indexOf(mode.value) + 1) % MODES.length];
  mode.value = next;
  applyMode(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {}
}

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
    if (saved && MODES.includes(saved)) {
      mode.value = saved;
      applyMode(saved);
    }
  } catch {}
});
</script>

<style scoped>
.width-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 5px;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: color 0.25s;
  border-radius: 8px;
  padding: 0;
  flex-shrink: 0;
}

.width-toggle:hover {
  color: var(--vp-c-text-1);
}

.icon {
  display: block;
}
</style>
