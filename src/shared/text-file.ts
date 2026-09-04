import fs from "node:fs";

export function readText(filePath: string): string {
  return fs
    .readFileSync(filePath, "utf-8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
}

/** Unlike `readText`, this keeps the line endings the file already has. */
export function writeText(filePath: string, content: string): void {
  const body = content.replace(/\r\n?/g, "\n");
  fs.writeFileSync(
    filePath,
    hasCrlfMajority(filePath) ? body.replace(/\n/g, "\r\n") : body,
    "utf-8",
  );
}

function hasCrlfMajority(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const existing = fs.readFileSync(filePath, "utf-8");
  const crlf = existing.split("\r\n").length - 1;
  const lines = existing.split("\n").length - 1;
  return crlf * 2 > lines;
}
