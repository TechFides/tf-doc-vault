import fs from "node:fs";
import path from "node:path";

/**
 * Every Markdown file under `dir`, recursively and sorted. `.vitepress` is always skipped:
 * it holds the site's own config and theme, not documents.
 */
export function allMdFiles(
  dir: string,
  exclude: ReadonlySet<string> = new Set(),
): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".vitepress") {
      results.push(...allMdFiles(full, exclude));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !exclude.has(entry.name)
    ) {
      results.push(full);
    }
  }
  return results.sort();
}
