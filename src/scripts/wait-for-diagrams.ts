/**
 * Mermaid renders in the browser after load, so a page can reach `networkidle`
 * with every diagram still showing Mermaid's "Syntax error in text" placeholder.
 * Printing at that point puts the placeholders in the PDF.
 */

export interface DiagramState {
  total: number;
  rendered: number;
  failed: number;
}

export interface DiagramWaitOptions {
  timeoutMs?: number;
  pollMs?: number;
  /** Diagrams render in batches, and the counts plateau between them. */
  steadyMs?: number;
}

const DEFAULTS = {
  timeoutMs: 180_000,
  pollMs: 1_000,
  steadyMs: 5_000,
} satisfies Required<DiagramWaitOptions>;

/**
 * Polls until every diagram carries an SVG and none reports a syntax error, then
 * holds that reading for `steadyMs`. Reports the last state rather than throwing
 * on a timeout: a diagram Mermaid cannot parse is the author's bug, and the
 * caller is the one that decides what to do about it.
 */
export async function waitForDiagrams(
  read: () => Promise<DiagramState>,
  options: DiagramWaitOptions = {},
): Promise<DiagramState & { settled: boolean }> {
  const { timeoutMs, pollMs, steadyMs } = { ...DEFAULTS, ...options };
  const deadline = Date.now() + timeoutMs;

  let state = await read();
  if (state.total === 0) return { ...state, settled: true };

  let steadySince: number | null = null;
  for (;;) {
    const done = state.rendered === state.total && state.failed === 0;
    if (done) {
      steadySince ??= Date.now();
      if (Date.now() - steadySince >= steadyMs)
        return { ...state, settled: true };
    } else {
      steadySince = null;
    }

    if (Date.now() >= deadline) return { ...state, settled: false };
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    state = await read();
  }
}
