import { describe, test, expect } from "vitest";
import {
  waitForDiagrams,
  type DiagramState,
} from "../../../src/scripts/wait-for-diagrams.js";

/** Milliseconds, small enough to keep the suite fast and apart enough to be stable. */
const FAST = { pollMs: 1, steadyMs: 20, timeoutMs: 500 };

/** Replays one reading per call, holding the last one once it runs out. */
function readings(...states: DiagramState[]): () => Promise<DiagramState> {
  let i = 0;
  return () => Promise.resolve(states[Math.min(i++, states.length - 1)]!);
}

describe("waitForDiagrams", () => {
  test("returns at once when the page carries no diagram", async () => {
    const result = await waitForDiagrams(
      readings({ total: 0, rendered: 0, failed: 0 }),
      FAST,
    );

    expect(result.settled).toBe(true);
  });

  test("waits for the last diagram of a batch", async () => {
    const result = await waitForDiagrams(
      readings(
        { total: 3, rendered: 0, failed: 3 },
        { total: 3, rendered: 2, failed: 1 },
        { total: 3, rendered: 3, failed: 0 },
      ),
      FAST,
    );

    expect(result).toMatchObject({ settled: true, rendered: 3, failed: 0 });
  });

  // Mermaid replaces its own placeholder, so a reading can look complete while a
  // later batch is still to come.
  test("does not settle on a plateau that a later reading undoes", async () => {
    const result = await waitForDiagrams(
      readings(
        { total: 2, rendered: 2, failed: 0 },
        { total: 4, rendered: 2, failed: 2 },
        { total: 4, rendered: 4, failed: 0 },
      ),
      FAST,
    );

    expect(result).toMatchObject({ settled: true, total: 4, failed: 0 });
  });

  test("gives up on a diagram that never parses and reports it", async () => {
    const result = await waitForDiagrams(
      readings({ total: 5, rendered: 5, failed: 1 }),
      { ...FAST, timeoutMs: 30 },
    );

    expect(result).toMatchObject({ settled: false, failed: 1 });
  });

  test("gives up while diagrams are still missing an SVG", async () => {
    const result = await waitForDiagrams(
      readings({ total: 5, rendered: 2, failed: 0 }),
      { ...FAST, timeoutMs: 30 },
    );

    expect(result).toMatchObject({ settled: false, rendered: 2 });
  });
});
