<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="src"
        ref="overlayEl"
        class="lightbox-overlay"
        role="dialog"
        aria-modal="true"
        @click="close"
      >
        <button
          ref="closeBtn"
          class="lightbox-close"
          :aria-label="t('lightbox.close')"
          @click.stop="close"
        >
          ✕
        </button>
        <img :src="src" :alt="alt" class="lightbox-img" @click.stop />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const src = ref<string | null>(null);
const alt = ref<string>("");
const overlayEl = ref<HTMLElement | null>(null);
const closeBtn = ref<HTMLButtonElement | null>(null);
let lastFocused: HTMLElement | null = null;

function open(img: HTMLImageElement) {
  lastFocused = document.activeElement as HTMLElement | null;
  src.value = img.src;
  alt.value = img.alt ?? "";
  lockScroll();
  nextTick(() => closeBtn.value?.focus());
}

function openSvg(dataUrl: string) {
  lastFocused = document.activeElement as HTMLElement | null;
  src.value = dataUrl;
  alt.value = "";
  lockScroll();
  nextTick(() => closeBtn.value?.focus());
}

function close() {
  src.value = null;
  unlockScroll();
  lastFocused?.focus();
  lastFocused = null;
}

function lockScroll() {
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  document.body.style.overflow = "";
}

function svgToDataUrl(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const bbox = svgEl.getBoundingClientRect();
  if (!clone.getAttribute("width"))
    clone.setAttribute("width", String(bbox.width));
  if (!clone.getAttribute("height"))
    clone.setAttribute("height", String(bbox.height));

  // Mermaid SVGs get dark-mode styling from `.dark .mermaid` rules
  // on the live DOM. Once serialized to a data URL that scope is
  // gone, so copy computed styles onto the clone.
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) {
    const liveEls = [
      svgEl,
      ...Array.from(svgEl.querySelectorAll<SVGElement>("*")),
    ];
    const cloneEls = [
      clone,
      ...Array.from(clone.querySelectorAll<SVGElement>("*")),
    ];
    const liveHtml = Array.from(
      svgEl.querySelectorAll<HTMLElement>("foreignObject *"),
    );
    const cloneHtml = Array.from(
      clone.querySelectorAll<HTMLElement>("foreignObject *"),
    );
    const allLive = [...liveEls, ...liveHtml];
    const allClone = [...cloneEls, ...cloneHtml];
    const props = [
      "fill",
      "stroke",
      "stroke-width",
      "color",
      "background-color",
    ];
    for (let i = 0; i < allLive.length && i < allClone.length; i++) {
      const cs = getComputedStyle(allLive[i] as Element);
      const target = allClone[i];
      if (!target) continue;
      const parts: string[] = [];
      for (const p of props) {
        const v = cs.getPropertyValue(p);
        if (v) parts.push(`${p}:${v}`);
      }
      const existing = target.getAttribute("style") || "";
      target.setAttribute("style", `${existing};${parts.join(";")}`);
    }
    const bg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--vp-c-bg")
        .trim() || "#04132a";
    clone.setAttribute(
      "style",
      `${clone.getAttribute("style") || ""};background-color:${bg};`,
    );
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);
}

function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".vp-doc") || target.closest("a")) return;

  if (target.tagName === "IMG") {
    open(target as HTMLImageElement);
    return;
  }

  // Only mermaid SVGs (and anything explicitly opted-in) become lightbox
  // candidates — inline icons would otherwise blow up to full screen.
  const mermaidSvg = target.closest(
    ".mermaid svg, [data-zoomable] svg, svg[data-zoomable]",
  ) as SVGSVGElement | null;
  if (mermaidSvg) {
    openSvg(svgToDataUrl(mermaidSvg));
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!src.value) return;
  if (e.key === "Escape") close();
  if (e.key === "Tab") {
    e.preventDefault();
    closeBtn.value?.focus();
  }
}

onMounted(() => {
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClick);
  document.removeEventListener("keydown", handleKeydown);
  unlockScroll();
});
</script>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.2s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@keyframes lightbox-img-in {
  from {
    transform: scale(0.88);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.93);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.lightbox-img {
  width: 90vw;
  height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  cursor: default;
  animation: lightbox-img-in 0.22s cubic-bezier(0.2, 0, 0.2, 1) both;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  padding: 4px 8px;
}

.lightbox-close:hover,
.lightbox-close:focus {
  opacity: 1;
  outline: none;
}

:global(html:not(.dark) .lightbox-overlay) {
  background: rgba(255, 255, 255, 0.95);
}

:global(html:not(.dark) .lightbox-close) {
  color: #333;
}
</style>
