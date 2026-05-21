/**
 * Distinctive logger for the smoke test infrastructure.
 *
 * Every line emitted by the test suite itself is prefixed with `[SMOKE]` in
 * a bright colour so it stands out from the scaffold noise (`pnpm install`,
 * `vitepress build`, `tf-doc-vault validate`, etc.) that runs underneath.
 *
 * Anything you see in CI output WITHOUT this prefix is scaffolding output,
 * not a test-infra log.
 */

// ANSI colour codes — degrade gracefully on dumb terminals (no $TERM).
const isTTY = process.stdout.isTTY === true;
const NO_COLOR =
  process.env.NO_COLOR === "1" || process.env.NO_COLOR === "true";
const useColor = isTTY && !NO_COLOR;

function paint(code: string, text: string): string {
  return useColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const TAG_INFO = paint("36;1", "[SMOKE ▸]"); // bright cyan
const TAG_OK = paint("32;1", "[SMOKE ✓]"); // bright green
const TAG_FAIL = paint("31;1", "[SMOKE ✗]"); // bright red
const RULE = paint("90", "━".repeat(70)); // dim grey

export const log = {
  /** Major section header — surrounded by a horizontal rule for separation. */
  step(message: string): void {
    process.stdout.write(`\n${RULE}\n${TAG_INFO} ${message}\n${RULE}\n`);
  },

  /** Inline progress note. */
  info(message: string): void {
    process.stdout.write(`${TAG_INFO} ${message}\n`);
  },

  /** Successful completion of a substep. */
  ok(message: string): void {
    process.stdout.write(`${TAG_OK} ${message}\n`);
  },

  /** Failure — prints to stderr so it stays visible in CI summaries. */
  fail(message: string): void {
    process.stderr.write(`${TAG_FAIL} ${message}\n`);
  },

  /**
   * Dump captured scaffold output verbatim when something fails — bracketed
   * so the reader can tell where the noise starts and ends.
   */
  dump(label: string, body: string): void {
    if (!body.trim()) return;
    const open = paint("90", `--- begin ${label} ---`);
    const close = paint("90", `--- end ${label} ---`);
    process.stderr.write(
      `${open}\n${body}${body.endsWith("\n") ? "" : "\n"}${close}\n`,
    );
  },
};
