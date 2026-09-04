/**
 * Every text read in `src/**` goes through `readText`, so no parser below it
 * ever meets a CR. Line matchers anchored with `$` do not match one (`.` treats
 * it as a line terminator), and `split("\n")` leaves it on every line.
 */

import fs from "node:fs";

/** `\r\n?` and not `\r\n`: an old Mac-style lone CR would otherwise survive. */
export function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8").replace(/\r\n?/g, "\n");
}

/**
 * For the files this package edits but does not own: a host `.gitignore`,
 * `pnpm-workspace.yaml` or theme file keeps the endings it came with, while
 * everything this package generates itself stays LF.
 */
export function writeTextPreservingEol(
  filePath: string,
  content: string,
): void {
  const body = content.replace(/\r\n?/g, "\n");
  const crlf =
    fs.existsSync(filePath) &&
    fs.readFileSync(filePath, "utf-8").includes("\r\n");
  fs.writeFileSync(
    filePath,
    crlf ? body.replace(/\n/g, "\r\n") : body,
    "utf-8",
  );
}
