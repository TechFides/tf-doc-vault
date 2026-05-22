<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="src"
        class="lightbox-overlay"
        @click="close"
        @keydown.esc="close"
      >
        <button class="lightbox-close" @click.stop="close" aria-label="Zavřít">
          ✕
        </button>
        <img :src="src" :alt="alt" class="lightbox-img" @click.stop />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const src = ref<string | null>(null);
const alt = ref<string>("");

function open(img: HTMLImageElement) {
  src.value = img.src;
  alt.value = img.alt ?? "";
  lockScroll();
}

function close() {
  src.value = null;
  unlockScroll();
}

function lockScroll() {
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  document.body.style.overflow = "";
}

/**
 * Mermaid SVGs in dark mode get their brand styling from `.dark .mermaid`
 * CSS overrides on the live DOM. When serialized to a data URL for the
 * lightbox, that parent scope is gone — the SVG would render with
 * mermaid's raw default-dark defaults. Inline the relevant computed
 * styles directly on each element so the lightbox version looks the same
 * as the one on the page.
 */
function inlineComputedStyles(root: SVGSVGElement, isDark: boolean): void {
  if (!isDark) return;
  const props = ["fill", "stroke", "stroke-width", "color", "background-color"];
  const all = [root, ...Array.from(root.querySelectorAll<SVGElement>("*"))];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const parts: string[] = [];
    for (const p of props) {
      const v = cs.getPropertyValue(p);
      if (v) parts.push(`${p}:${v}`);
    }
    const existing = el.getAttribute("style") || "";
    el.setAttribute("style", `${existing};${parts.join(";")}`);
  }
}

function svgToDataUrl(svgEl: SVGSVGElement): string {
  // Ensure the SVG has explicit dimensions so the img renders correctly
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const bbox = svgEl.getBoundingClientRect();
  if (!clone.getAttribute("width"))
    clone.setAttribute("width", String(bbox.width));
  if (!clone.getAttribute("height"))
    clone.setAttribute("height", String(bbox.height));

  // Inline brand styles for Mermaid so the lightbox renders the styled
  // version, not the bare mermaid SVG defaults. Detection: .dark class
  // on <html>. We copy from the LIVE element (svgEl) into the clone.
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
    // Include HTML descendants inside foreignObject (edge labels etc.)
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
    // Backdrop so transparent areas look like the dark page surface
    clone.setAttribute(
      "style",
      `${clone.getAttribute("style") || ""};background-color:#04132a;`,
    );
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);
}

function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".vp-doc") || target.closest("a")) return;

  // Regular <img>
  if (target.tagName === "IMG") {
    open(target as HTMLImageElement);
    return;
  }

  // Inline SVG (Mermaid) — find the closest <svg> ancestor-or-self
  const svgEl = target.closest("svg") as SVGSVGElement | null;
  if (svgEl) {
    src.value = svgToDataUrl(svgEl);
    alt.value = "";
    lockScroll();
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
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
/* Overlay fade */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.2s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

/* Image pop-in */
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

.lightbox-close:hover {
  opacity: 1;
}

/* Light theme overrides */
:global(html:not(.dark) .lightbox-overlay) {
  background: rgba(255, 255, 255, 0.95);
}

:global(html:not(.dark) .lightbox-close) {
  color: #333;
}
</style>
