/**
 * Pure helpers for where imported pages land on disk and how their links are
 * rewritten. No I/O and no side effects — kept out of the CLI entrypoint
 * (which runs on import) so they can be unit-tested directly.
 */

import path from "node:path";
import { type TreeNode } from "./types.js";

/** Title → URL-safe slug (strips a leading `[PREFIX]`, diacritics, etc.). */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/^\[.*?\]\s*/, "") // strip [SERVICE_ID] prefix
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** On-disk path for a page: root and parents-with-children → `index.md`, leaves → `slug.md`. */
export function pageFilePath(
  node: TreeNode,
  parentPath: string,
  isRoot: boolean,
): string {
  if (isRoot) return path.join(parentPath, "index.md");
  return node.children.length > 0
    ? path.join(parentPath, node.slug, "index.md")
    : path.join(parentPath, `${node.slug}.md`);
}

/** Directory that a page's children are written under. */
export function childBasePath(
  node: TreeNode,
  parentPath: string,
  isRoot: boolean,
): string {
  if (isRoot) return parentPath;
  return node.children.length > 0
    ? path.join(parentPath, node.slug)
    : parentPath;
}

/** Map every page id → on-disk path, mirroring the index.md / leaf.md layout. */
export function buildPathMap(
  node: TreeNode,
  parentPath: string,
  isRoot: boolean,
  map: Map<string, string>,
): void {
  map.set(node.page.id, pageFilePath(node, parentPath, isRoot));
  const childBase = childBasePath(node, parentPath, isRoot);
  for (const child of node.children) buildPathMap(child, childBase, false, map);
}

/** Pre-order flatten so callers can iterate pages with a progress counter. */
export function flattenTree(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  acc.push(node);
  for (const child of node.children) flattenTree(child, acc);
  return acc;
}

/**
 * Rewrite Confluence page links to relative VitePress paths (e.g. `/v1/page`).
 * Only links whose target page was part of the import (present in `pagePathMap`)
 * are rewritten; everything else is left as the original URL.
 */
export function rewriteConfluenceLinks(
  markdown: string,
  pagePathMap: Map<string, string>,
  docsRoot: string,
): string {
  return markdown.replace(
    /\[([^\]]+)\]\(https?:\/\/[^/]+\/wiki\/spaces\/[^/]+\/pages\/(\d+)[^)]*\)/g,
    (match: string, text: string, linkedId: string): string => {
      const absPath = pagePathMap.get(linkedId);
      if (!absPath) return match;
      const relativePath =
        "/" + path.relative(docsRoot, absPath).replace(/\.md$/, "");
      return `[${text}](${relativePath})`;
    },
  );
}
