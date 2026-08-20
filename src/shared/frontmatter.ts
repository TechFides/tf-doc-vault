import fs from "node:fs";
import path from "node:path";

const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---/;
const KEY_VALUE = /^(\w+):\s*(.+)$/;
const INTEGER = /^-?\d+$/;

export function parseFrontmatter(
  content: string,
): Record<string, string> | null {
  const match = FRONTMATTER.exec(content);
  if (!match) return null;
  const fields: Record<string, string> = {};
  // Untrimmed and first-wins on purpose: an indented key inside a nested block
  // is not top level and must not overwrite the field of the same name above it.
  for (const line of match[1]!.split("\n")) {
    const kv = KEY_VALUE.exec(line);
    if (!kv) continue;
    const key = kv[1]!;
    if (!Object.prototype.hasOwnProperty.call(fields, key)) {
      fields[key] = kv[2]!.trim();
    }
  }
  return fields;
}

/** Null also when the file is missing: the sidebar walks directories that may not hold one. */
export function readFrontmatter(
  filePath: string,
): Record<string, string> | null {
  try {
    return parseFrontmatter(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function readTitle(filePath: string): string {
  const title = readFrontmatter(filePath)?.["title"];
  return title && title.length > 0 ? title : path.basename(filePath, ".md");
}

export function parseOrder(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = raw.trim();
  return INTEGER.test(value) ? Number(value) : null;
}
