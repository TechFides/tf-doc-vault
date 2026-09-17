<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="src"
        ref="overlayEl"
        class="lightbox-overlay"
        role="dialog"
        aria-modal="true"
        @click="handleOverlayClick"
        @dblclick="handleDoubleClick"
        @wheel="handleWheel"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
      >
        <button
          ref="closeBtn"
          class="lightbox-close"
          :aria-label="t('lightbox.close')"
          @click.stop="close"
        >
          ✕
        </button>
        <div class="lightbox-stage">
          <img
            ref="imgEl"
            :src="src"
            :alt="alt"
            draggable="false"
            class="lightbox-img"
            :class="{
              'lightbox-img--pannable': zoom.scale > 1,
              'lightbox-img--stepped': stepped,
            }"
            :style="{
              transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
            }"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  clampPan,
  clampScale,
  containSize,
  distance,
  midpoint,
  panBy,
  wheelScaleFactor,
  zoomAt,
  FIT,
  type Point,
  type ZoomState,
} from "./imageZoom.js";

const { t } = useI18n();

const src = ref<string | null>(null);
const alt = ref<string>("");
const overlayEl = ref<HTMLElement | null>(null);
const closeBtn = ref<HTMLButtonElement | null>(null);
const imgEl = ref<HTMLImageElement | null>(null);
const zoom = ref<ZoomState>({ ...FIT });
const stepped = ref(false);
let lastFocused: HTMLElement | null = null;

const DOUBLE_CLICK_SCALE = 2.5;
const KEY_STEP = 1.4;
/** Below this, a pointer that moved is still a click rather than a pan. */
const DRAG_SLOP = 4;

const pointers = new Map<number, Point>();
let pinchSpan = 0;
let pinchCentre: Point = { x: 0, y: 0 };
let travelled = 0;
let swallowClick = false;

function open(img: HTMLImageElement) {
  lastFocused = document.activeElement as HTMLElement | null;
  src.value = img.src;
  alt.value = img.alt ?? "";
  zoom.value = { ...FIT };
  lockScroll();
  nextTick(() => closeBtn.value?.focus());
}

function openSvg(dataUrl: string) {
  lastFocused = document.activeElement as HTMLElement | null;
  src.value = dataUrl;
  alt.value = "";
  zoom.value = { ...FIT };
  lockScroll();
  nextTick(() => closeBtn.value?.focus());
}

function close() {
  src.value = null;
  pointers.clear();
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

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** The painted image, not its box: `object-fit: contain` leaves one axis letterboxed. */
function content() {
  const el = imgEl.value;
  if (!el) return { width: 0, height: 0 };
  return containSize(
    { width: el.clientWidth, height: el.clientHeight },
    { width: el.naturalWidth, height: el.naturalHeight },
  );
}

function settle(next: ZoomState) {
  zoom.value = clampPan(next, content(), viewport());
}

function zoomTo(nextScale: number, anchor: Point) {
  const el = imgEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const centre = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  settle(zoomAt(zoom.value, clampScale(nextScale), anchor, centre));
}

function handleWheel(e: WheelEvent) {
  // Without this the browser takes ctrl+wheel as its own page zoom, and the overlay
  // would scale along with the page behind it.
  e.preventDefault();
  stepped.value = false;
  zoomTo(
    zoom.value.scale * wheelScaleFactor(e.deltaY, e.deltaMode, e.ctrlKey),
    {
      x: e.clientX,
      y: e.clientY,
    },
  );
}

function handleDoubleClick(e: MouseEvent) {
  stepped.value = true;
  zoomTo(zoom.value.scale > 1 ? 1 : DOUBLE_CLICK_SCALE, {
    x: e.clientX,
    y: e.clientY,
  });
}

function handlePointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest(".lightbox-close")) return;
  overlayEl.value?.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  travelled = 0;
  // A pinch ends without a click, so its suppression would otherwise be spent on whatever
  // the reader taps next: on a phone the first tap to dismiss would do nothing.
  swallowClick = false;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    if (a && b) {
      pinchSpan = distance(a, b);
      pinchCentre = midpoint(a, b);
    }
  }
}

function handlePointerMove(e: PointerEvent) {
  const previous = pointers.get(e.pointerId);
  if (!previous) return;
  const now = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, now);
  stepped.value = false;

  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    const span = distance(a, b);
    const centre = midpoint(a, b);
    if (pinchSpan > 0) {
      zoomTo(zoom.value.scale * (span / pinchSpan), centre);
      // Two fingers moving together pan, so a pinch can reframe and magnify in one gesture.
      settle(
        panBy(zoom.value, centre.x - pinchCentre.x, centre.y - pinchCentre.y),
      );
    }
    pinchSpan = span;
    pinchCentre = centre;
    travelled += DRAG_SLOP;
    return;
  }

  if (zoom.value.scale > 1) {
    travelled += distance(previous, now);
    settle(panBy(zoom.value, now.x - previous.x, now.y - previous.y));
  }
}

function handlePointerUp(e: PointerEvent) {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size < 2) pinchSpan = 0;
  if (pointers.size === 0 && travelled > DRAG_SLOP) swallowClick = true;
}

function over(el: HTMLElement | null, e: MouseEvent): boolean {
  const rect = el?.getBoundingClientRect();
  if (!rect) return false;
  return (
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  );
}

/*
 * Whether the click landed on the picture is measured rather than left to the image's own
 * handler: capturing the pointer during a drag retargets the click to the overlay, so an
 * event listener on the image would not see it at all.
 */
function handleOverlayClick(e: MouseEvent) {
  // A pan that ends off the image still arrives as a click; closing on it would dismiss the
  // lightbox every time the reader drags a zoomed diagram.
  if (swallowClick) {
    swallowClick = false;
    return;
  }
  if (over(imgEl.value, e)) return;
  close();
}

function handleResize() {
  if (src.value) settle(zoom.value);
}

function svgToDataUrl(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const bbox = svgEl.getBoundingClientRect();
  if (!clone.getAttribute("width"))
    clone.setAttribute("width", String(bbox.width));
  if (!clone.getAttribute("height"))
    clone.setAttribute("height", String(bbox.height));

  // CSS rules on `.mermaid` live outside the SVG, so that scope is gone once it
  // is serialized to a data URL. Copy the computed styles onto the clone so the
  // lightbox keeps its colors in both light and dark mode.
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
  const props = ["fill", "stroke", "stroke-width", "color", "background-color"];
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

    // CSS rx/ry on SVG <rect> is lost when the stylesheet is gone in the data
    // URL. Copy the computed value as an SVG attribute, which is preserved.
    if ((allLive[i] as Element).tagName === "rect") {
      const rxVal = cs.getPropertyValue("rx");
      const ryVal = cs.getPropertyValue("ry");
      if (rxVal && rxVal !== "auto") {
        (target as SVGElement).setAttribute("rx", String(parseFloat(rxVal)));
      }
      if (ryVal && ryVal !== "auto") {
        (target as SVGElement).setAttribute("ry", String(parseFloat(ryVal)));
      }
    }
  }
  const bg =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--vp-c-bg")
      .trim() || "#ffffff";
  clone.setAttribute(
    "style",
    `${clone.getAttribute("style") || ""};background-color:${bg};`,
  );

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

  // Only mermaid SVGs and explicit opt-ins are lightbox candidates; inline icons
  // would otherwise blow up to full screen.
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
  // Wheel and pinch are both pointer gestures, so the keyboard needs its own way in.
  const { width, height } = viewport();
  const centre = { x: width / 2, y: height / 2 };
  if (e.key === "+" || e.key === "=") {
    stepped.value = true;
    zoomTo(zoom.value.scale * KEY_STEP, centre);
  }
  if (e.key === "-") {
    stepped.value = true;
    zoomTo(zoom.value.scale / KEY_STEP, centre);
  }
  if (e.key === "0") {
    stepped.value = true;
    zoomTo(1, centre);
  }
}

onMounted(() => {
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClick);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("resize", handleResize);
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
  /* The browser must not claim the pinch and the drag for its own page gestures. */
  touch-action: none;
  overscroll-behavior: contain;
}

/*
 * The entry animation belongs here rather than on the image: it ends on `transform: scale(1)`
 * and holds it, which would leave the image's own zoom transform doing nothing.
 */
.lightbox-stage {
  animation: lightbox-img-in 0.22s cubic-bezier(0.2, 0, 0.2, 1) both;
}

/*
 * Dragging is panning, so the browser must not read it as dragging the picture itself: a
 * native image drag starts on the first move and swallows every pointer event after it.
 */
.lightbox-img {
  display: block;
  width: 90vw;
  height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  cursor: default;
  user-select: none;
  -webkit-user-drag: none;
}

.lightbox-img--pannable {
  cursor: grab;
}

.lightbox-img--pannable:active {
  cursor: grabbing;
}

/* Only the discrete steps animate. A wheel or a pinch has to track the gesture frame by frame. */
.lightbox-img--stepped {
  transition: transform 0.18s cubic-bezier(0.2, 0, 0.2, 1);
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
  z-index: 1;
}

.lightbox-close:hover,
.lightbox-close:focus {
  opacity: 1;
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .lightbox-stage {
    animation: none;
  }

  .lightbox-img--stepped {
    transition: none;
  }
}

:global(html:not(.dark) .lightbox-overlay) {
  background: rgba(255, 255, 255, 0.95);
}

:global(html:not(.dark) .lightbox-close) {
  color: #333;
}
</style>
