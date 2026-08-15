<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRoute } from "vitepress";

const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}️)/u;
const MARKER_CLASS = "tf-sb-marker";

/**
 * Move a leading emoji out of the label text and into the marker slot, so an emoji row's
 * label starts at the same x as a row with a drawn marker.
 *
 * Idempotent, and it has to be: the MutationObserver below watches childList, so
 * inserting the span schedules another pass over the sidebar.
 */
function hoistLeadingEmoji(el: HTMLElement): boolean {
  if (el.firstElementChild?.classList.contains(MARKER_CLASS)) return true;

  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;

  const lead = (node.textContent ?? "").trimStart();
  const match = EMOJI_RE.exec(lead);
  if (!match) return false;

  const span = document.createElement("span");
  span.className = MARKER_CLASS;
  // Decorative, like the drawn markers' blanked accessible name.
  span.setAttribute("aria-hidden", "true");
  span.textContent = match[0];
  node.textContent = lead.slice(match[0].length).trimStart();
  el.insertBefore(span, node);
  return true;
}

function alignItems(): void {
  const items = document.querySelectorAll<HTMLElement>(
    ".VPSidebar .VPSidebarItem > .item .text",
  );
  for (const el of items) {
    el.classList.remove("default-emoji-file", "default-emoji-folder");
    if (hoistLeadingEmoji(el)) continue;

    const isFolder = !!el
      .closest(".VPSidebarItem")
      ?.classList.contains("collapsible");
    el.classList.add(isFolder ? "default-emoji-folder" : "default-emoji-file");
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

watch(
  () => route.path,
  () => nextTick(alignItems),
);
</script>

<template>
  <span v-if="false"></span>
</template>
