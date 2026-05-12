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

function svgToDataUrl(svgEl: SVGSVGElement): string {
  // Ensure the SVG has explicit dimensions so the img renders correctly
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const bbox = svgEl.getBoundingClientRect();
  if (!clone.getAttribute("width"))
    clone.setAttribute("width", String(bbox.width));
  if (!clone.getAttribute("height"))
    clone.setAttribute("height", String(bbox.height));
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
