import fs from "node:fs";

/** `\r\n?` and not `\r\n`: an old Mac-style lone CR would otherwise survive. */
export function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8").replace(/\r\n?/g, "\n");
}

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
