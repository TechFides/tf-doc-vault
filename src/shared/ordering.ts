import fs from "node:fs";
import path from "node:path";
import { readFrontmatter, parseOrder } from "./frontmatter.js";

export interface Sibling {
  name: string;
  isDirectory(): boolean;
}

export const IGNORED_DIRS = new Set([".vitepress", "node_modules", "public"]);

function entriesIn(dir: string): fs.Dirent[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true });
}

export function isDocsDir(entry: fs.Dirent): boolean {
  return (
    entry.isDirectory() &&
    !IGNORED_DIRS.has(entry.name) &&
    !entry.name.startsWith(".")
  );
}

function isPage(entry: fs.Dirent): boolean {
  return (
    entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md"
  );
}

export function subDirEntries(dir: string): fs.Dirent[] {
  return entriesIn(dir).filter(isDocsDir);
}

/** Without `index.md`: it never competes for a position among its siblings. */
export function pageEntries(dir: string): fs.Dirent[] {
  return entriesIn(dir).filter(isPage);
}

export function siblingEntries(dir: string): fs.Dirent[] {
  return entriesIn(dir).filter((e) => isPage(e) || isDocsDir(e));
}

function orderOf(dir: string, entry: Sibling): number | null {
  const carrier = entry.isDirectory()
    ? path.join(dir, entry.name, "index.md")
    : path.join(dir, entry.name);
  return parseOrder(readFrontmatter(carrier)?.["order"]);
}

/**
 * Items with a valid `order` first and ascending, the rest alphabetically behind
 * them. A tie falls back to the name, so a duplicate `order` still sorts
 * deterministically; reporting it is the lint's job.
 */
export function sortSiblings<T extends Sibling>(
  dir: string,
  entries: T[],
): T[] {
  return entries
    .map((entry) => ({ entry, order: orderOf(dir, entry) }))
    .sort((a, b) => {
      if (a.order !== null && b.order !== null && a.order !== b.order) {
        return a.order - b.order;
      }
      if (a.order !== null && b.order === null) return -1;
      if (a.order === null && b.order !== null) return 1;
      return a.entry.name.localeCompare(b.entry.name, "cs");
    })
    .map((keyed) => keyed.entry);
}
