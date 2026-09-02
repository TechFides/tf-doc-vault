import fs from "node:fs";
import path from "node:path";

const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---/;
const KEY_VALUE = /^(\w+):\s*(.+)$/;
const INTEGER = /^-?\d+$/;

const DOUBLE_QUOTE_ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  '"': '"',
  "\\": "\\",
  "/": "/",
};

/** Null when the body is not a well-formed double-quoted scalar. */
function readDoubleQuoted(body: string): string | null {
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (char === '"') return null;
    if (char !== "\\") {
      out += char;
      continue;
    }
    const escaped = body[i + 1];
    if (escaped === undefined) return null;
    out += DOUBLE_QUOTE_ESCAPES[escaped] ?? escaped;
    i++;
  }
  return out;
}

/** Null when the body is not a well-formed single-quoted scalar. */
function readSingleQuoted(body: string): string | null {
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (char !== "'") {
      out += char;
      continue;
    }
    if (body[i + 1] !== "'") return null;
    out += "'";
    i++;
  }
  return out;
}

/**
 * YAML quotes a scalar whose content would otherwise change its meaning, a
 * `title` holding a colon above all. Left in, those quotes reach the sidebar and
 * the print page as literal text. A value that merely starts and ends with a
 * quote (`'a' or 'b'`) is not a quoted scalar and stays as it is.
 */
function unquoteScalar(value: string): string {
  const quote = value[0];
  if (value.length < 2 || (quote !== '"' && quote !== "'")) return value;
  if (!value.endsWith(quote)) return value;

  const body = value.slice(1, -1);
  const parsed =
    quote === '"' ? readDoubleQuoted(body) : readSingleQuoted(body);
  return parsed ?? value;
}

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
      fields[key] = unquoteScalar(kv[2]!.trim());
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
