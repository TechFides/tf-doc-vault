/**
 * Minimal structured logger for the CLI tools. Colour is applied only on a TTY
 * and honours NO_COLOR, so piped and CI output stays plain.
 */

const COLOR = Boolean(process.stdout.isTTY) && !process.env["NO_COLOR"];

function paint(code: string, text: string): string {
  return COLOR ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const dim = (s: string): string => paint("2", s);
const bold = (s: string): string => paint("1", s);
const green = (s: string): string => paint("32", s);
const yellow = (s: string): string => paint("33", s);
const red = (s: string): string => paint("31", s);
const cyan = (s: string): string => paint("36", s);

export const logger = {
  heading(title: string): void {
    console.log(`\n${bold(title)}`);
  },
  field(key: string, value: string): void {
    console.log(`  ${dim(key.padEnd(7))} ${value}`);
  },
  step(message: string): void {
    console.log(`${cyan("→")} ${message}`);
  },
  success(message: string): void {
    console.log(`${green("✓")} ${message}`);
  },
  warn(message: string): void {
    console.warn(`${yellow("⚠")} ${message}`);
  },
  error(message: string): void {
    console.error(`${red("✗")} ${message}`);
  },
  detail(message: string): void {
    console.log(`  ${dim(message)}`);
  },
  blank(): void {
    console.log();
  },
  /** No-op off a TTY. Call `endProgress` before printing anything else. */
  progress(current: number, total: number, label: string): void {
    if (!process.stdout.isTTY) return;
    const line = `  [${current}/${total}] ${label}`;
    const width = (process.stdout.columns ?? 80) - 1;
    process.stdout.write(`\r\x1b[2K${line.slice(0, width)}`);
  },
  endProgress(): void {
    if (process.stdout.isTTY) process.stdout.write("\r\x1b[2K");
  },
};
