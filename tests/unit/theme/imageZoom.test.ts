import { describe, test, expect } from "vitest";
import {
  clampPan,
  clampScale,
  containSize,
  wheelScaleFactor,
  zoomAt,
  MAX_SCALE,
  MIN_SCALE,
  type Point,
  type ZoomState,
} from "../../../src/theme/components/imageZoom.js";

describe("clampScale", () => {
  test("holds the image between fit and the ceiling", () => {
    expect(clampScale(0.2)).toBe(MIN_SCALE);
    expect(clampScale(999)).toBe(MAX_SCALE);
    expect(clampScale(3)).toBe(3);
  });
});

describe("containSize", () => {
  test("letterboxes the axis that runs out first", () => {
    // A wide image in a square box keeps the box's width and loses height.
    expect(
      containSize({ width: 100, height: 100 }, { width: 200, height: 50 }),
    ).toEqual({
      width: 100,
      height: 25,
    });
    expect(
      containSize({ width: 100, height: 100 }, { width: 50, height: 200 }),
    ).toEqual({
      width: 25,
      height: 100,
    });
  });

  test("falls back to the box before the image reports its size", () => {
    const box = { width: 640, height: 480 };
    expect(containSize(box, { width: 0, height: 0 })).toEqual(box);
  });
});

describe("wheelScaleFactor", () => {
  test("scrolling up magnifies and scrolling down shrinks", () => {
    expect(wheelScaleFactor(-100, 0, false)).toBeGreaterThan(1);
    expect(wheelScaleFactor(100, 0, false)).toBeLessThan(1);
  });

  test("a notch up and the same notch down cancel out", () => {
    expect(
      wheelScaleFactor(-100, 0, false) * wheelScaleFactor(100, 0, false),
    ).toBeCloseTo(1, 10);
  });

  test("line and page deltas count for more than pixel deltas", () => {
    expect(wheelScaleFactor(-1, 1, false)).toBeGreaterThan(
      wheelScaleFactor(-1, 0, false),
    );
    expect(wheelScaleFactor(-1, 2, false)).toBeGreaterThan(
      wheelScaleFactor(-1, 1, false),
    );
  });

  test("a trackpad pinch moves further per unit of delta than a mouse wheel", () => {
    expect(wheelScaleFactor(-10, 0, true)).toBeGreaterThan(
      wheelScaleFactor(-10, 0, false),
    );
  });
});

/** Where a point at local offset `u` from the untransformed centre lands on screen. */
function project(state: ZoomState, origin: Point, u: Point): Point {
  return {
    x: origin.x + state.x + state.scale * u.x,
    y: origin.y + state.y + state.scale * u.y,
  };
}

/** The local offset currently showing at screen point `p`. */
function unproject(state: ZoomState, origin: Point, p: Point): Point {
  return {
    x: (p.x - origin.x - state.x) / state.scale,
    y: (p.y - origin.y - state.y) / state.scale,
  };
}

function centreOf(state: ZoomState, origin: Point): Point {
  return { x: origin.x + state.x, y: origin.y + state.y };
}

describe("zoomAt", () => {
  const origin = { x: 500, y: 400 };

  test("zooming on the centre does not shift the image", () => {
    const state = { scale: 1, x: 0, y: 0 };
    const next = zoomAt(
      state,
      2,
      centreOf(state, origin),
      centreOf(state, origin),
    );
    expect(next).toEqual({ scale: 2, x: 0, y: 0 });
  });

  test("whatever sits under the pointer stays under it", () => {
    const state: ZoomState = { scale: 1.6, x: -40, y: 25 };
    const pointer = { x: 720, y: 300 };
    const held = unproject(state, origin, pointer);

    const next = zoomAt(state, 4.2, pointer, centreOf(state, origin));

    const after = project(next, origin, held);
    expect(after.x).toBeCloseTo(pointer.x, 10);
    expect(after.y).toBeCloseTo(pointer.y, 10);
  });

  test("it holds through a sequence of steps, as a wheel produces", () => {
    let state: ZoomState = { scale: 1, x: 0, y: 0 };
    const pointer = { x: 260, y: 640 };
    const held = unproject(state, origin, pointer);

    for (const scale of [1.2, 1.44, 1.73, 3.1, 2.2]) {
      state = zoomAt(state, scale, pointer, centreOf(state, origin));
    }

    const after = project(state, origin, held);
    expect(after.x).toBeCloseTo(pointer.x, 8);
    expect(after.y).toBeCloseTo(pointer.y, 8);
  });
});

describe("clampPan", () => {
  const viewport = { width: 1000, height: 800 };
  const content = { width: 900, height: 600 };

  test("an image that fits is pinned to the centre", () => {
    expect(clampPan({ scale: 1, x: 300, y: -200 }, content, viewport)).toEqual({
      scale: 1,
      x: 0,
      y: 0,
    });
  });

  test("panning stops at the image's own edge", () => {
    // At 2x the content is 1800x1200, leaving 400px of slack each way and 200px vertically.
    const state = { scale: 2, x: 9999, y: -9999 };
    expect(clampPan(state, content, viewport)).toEqual({
      scale: 2,
      x: 400,
      y: -200,
    });
  });

  test("each axis gets the slack it actually has", () => {
    // 1.5x: 1350 wide leaves 175px each way, 900 tall leaves only 50.
    const state = { scale: 1.5, x: 120, y: 120 };
    expect(clampPan(state, content, viewport)).toEqual({
      scale: 1.5,
      x: 120,
      y: 50,
    });
  });
});
