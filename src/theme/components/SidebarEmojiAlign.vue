<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRoute } from "vitepress";

const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}️)/u;

function alignItems(): void {
  const items = document.querySelectorAll<HTMLElement>(
    ".VPSidebar .VPSidebarItem > .item .text",
  );
  for (const el of items) {
    el.classList.remove("default-emoji-file", "default-emoji-folder");
    const text = (el.textContent ?? "").trimStart();
    if (!EMOJI_RE.test(text)) {
      const isFolder = !!el.closest(".VPSidebarItem")?.classList.contains("collapsible");
      el.classList.add(isFolder ? "default-emoji-folder" : "default-emoji-file");
    }
  }
}

const route = useRoute();
let observer: MutationObserver | null = null;

onMounted(() => {
  nextTick(alignItems);
  const sidebar = document.querySelector(".VPSidebar");
  if (sidebar) {
    observer = new MutationObserver(alignItems);
    observer.observe(sidebar, { childList: true, subtree: true });
  }
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});

watch(() => route.path, () => nextTick(alignItems));
</script>

<template></template>
