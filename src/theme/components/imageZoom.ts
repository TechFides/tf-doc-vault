/** Where the lightbox image sits: a scale, and a translation in screen pixels. */
export interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 10;

export const FIT: ZoomState = { scale: MIN_SCALE, x: 0, y: 0 };

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Painted size of an `object-fit: contain` image, which is short of its box on one axis. */
export function containSize(box: Size, natural: Size): Size {
  if (natural.width <= 0 || natural.height <= 0) return box;
  const ratio = Math.min(
    box.width / natural.width,
    box.height / natural.height,
  );
  return { width: natural.width * ratio, height: natural.height * ratio };
}

const LINE_PX = 16;
const PAGE_PX = 400;

/**
 * Wheel movement as a scale multiplier. Exponential, so one notch is the same proportional
 * step whether the image is at 1x or at 8x.
 */
export function wheelScaleFactor(
  delta: number,
  deltaMode: number,
  ctrlKey: boolean,
): number {
  const px =
    deltaMode === 1
      ? delta * LINE_PX
      : deltaMode === 2
        ? delta * PAGE_PX
        : delta;
  // A trackpad pinch arrives as ctrl+wheel, in far smaller deltas than a mouse notch.
  return Math.exp(-px * (ctrlKey ? 0.01 : 0.002));
}

/**
 * Scale to `nextScale` leaving whatever is under `point` under it. `centre` is where the
 * element's centre sits on screen right now, so it already carries the current translation.
 */
export function zoomAt(
  state: ZoomState,
  nextScale: number,
  point: Point,
  centre: Point,
): ZoomState {
  const ratio = nextScale / state.scale;
  return {
    scale: nextScale,
    x: state.x + (point.x - centre.x) * (1 - ratio),
    y: state.y + (point.y - centre.y) * (1 - ratio),
  };
}

export function panBy(state: ZoomState, dx: number, dy: number): ZoomState {
  return { scale: state.scale, x: state.x + dx, y: state.y + dy };
}

/** An axis with no slack left is centred outright, which also keeps a signed zero out of the state. */
function withinSlack(offset: number, slack: number): number {
  if (slack <= 0) return 0;
  return Math.min(slack, Math.max(-slack, offset));
}

/**
 * Hold the scaled content against the viewport edges, and recentre an axis that no longer
 * fills it. Panning therefore stops at the image's own edge instead of dragging it into
 * empty space, and dropping back to fit re-centres without a separate reset.
 */
export function clampPan(
  state: ZoomState,
  content: Size,
  viewport: Size,
): ZoomState {
  const slackX = (content.width * state.scale - viewport.width) / 2;
  const slackY = (content.height * state.scale - viewport.height) / 2;
  return {
    scale: state.scale,
    x: withinSlack(state.x, slackX),
    y: withinSlack(state.y, slackY),
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
