/**
 * Pure helpers for where imported pages land on disk and how their links are
 * rewritten. Kept out of the CLI entrypoint, which runs on import, so they stay
 * unit-testable.
 */

import path from "node:path";
import { type TreeNode } from "./types.js";

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

/**
 * On-disk path for a page: the root and any parent with children get
 * `index.md`, leaves get `slug.md`.
 */
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

/** Pre-order flatten; the import progress counter relies on that order. */
export function flattenTree(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  acc.push(node);
  for (const child of node.children) flattenTree(child, acc);
  return acc;
}

/** 1-based. `buildTree` already dropped failed pages, so the run stays contiguous. */
export function buildOrderMap(node: TreeNode, map: Map<string, number>): void {
  node.children.forEach((child, index) => {
    map.set(child.page.id, index + 1);
    buildOrderMap(child, map);
  });
}

/**
 * Rewrite Confluence page links to absolute VitePress paths such as `/v1/page`;
 * VitePress prepends the site `base` at render time. Links to pages outside the
 * import keep their original URL. A link whose visible text is the raw
 * Confluence URL gets the target page's title, so the reader sees a label.
 */
export function rewriteConfluenceLinks(
  markdown: string,
  pagePathMap: Map<string, string>,
  pageTitleMap: Map<string, string>,
  docsRoot: string,
): string {
  return markdown.replace(
    /\[((?:[^[\]]|\[[^\]]*\])+)\]\(https?:\/\/[^/]+\/wiki\/spaces\/[^/]+\/pages\/(\d+)[^)]*\)/g,
    (match: string, text: string, linkedId: string): string => {
      const absPath = pagePathMap.get(linkedId);
      if (!absPath) return match;
      const relativePath =
        "/" + path.relative(docsRoot, absPath).replace(/\.md$/, "");
      const label = /^https?:\/\//.test(text.trim())
        ? (pageTitleMap.get(linkedId) ?? text)
        : text;
      return `[${label}](${relativePath})`;
    },
  );
}
