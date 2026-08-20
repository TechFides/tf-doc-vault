/**
 * Generates docs/print.md in sidebar order, frontmatter stripped. Every
 * `index.md`, and every page sitting directly under `docs/<version>/`, is
 * left out.
 */

import fs from "node:fs";
import path from "node:path";
import { readFrontmatter, readTitle } from "../shared/frontmatter.js";
import {
  siblingEntries,
  sortSiblings,
  subDirEntries,
} from "../shared/ordering.js";

const DOCS_ROOT = path.resolve(process.cwd(), "docs");
const OUTPUT = path.join(DOCS_ROOT, "print.md");
const PRAGUE_DATE = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date());

function subDirs(dir: string): string[] {
  return sortSiblings(dir, subDirEntries(dir)).map((e) => e.name);
}

function versionDirs(dir: string): string[] {
  // Alphabetical on purpose, mirroring `getVersions`: versions are the one
  // level `order` does not govern.
  return subDirEntries(dir)
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "cs"));
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "").trimStart();
}

function slugFor(filePath: string): string {
  return path
    .relative(DOCS_ROOT, filePath)
    .replace(/\.md$/, "")
    .replace(/\//g, "-")
    .toLowerCase();
}

const ASSET = /\.(svg|png|jpe?g|gif|webp|pdf|json|ya?ml|txt|zip)$/i;

/**
 * Rewrites an internal link into an anchor inside this document. Links are
 * written the way VitePress resolves them, so the extension is optional and a
 * directory means its index.md. A target this document does not emit keeps its
 * text and loses the link: there is nothing here to jump to, and leaving the
 * relative path in would fail the build as a dead link.
 */
function rewriteLinks(
  content: string,
  fromFile: string,
  slugByPath: Map<string, string>,
): string {
  return content.replace(
    /(?<!!)\[([^\]]+)\]\((\.{1,2}\/[^)\s]*|\/[^)\s]*)\)/g,
    (whole: string, text: string, href: string) => {
      const target = href.split("#")[0] ?? "";
      if (target === "" || ASSET.test(target)) return whole;

      const base = target.startsWith("/")
        ? path.join(DOCS_ROOT, target)
        : path.resolve(path.dirname(fromFile), target);
      const candidates = target.endsWith(".md")
        ? [base]
        : [`${base}.md`, path.join(base, "index.md")];

      const slug = candidates
        .map((candidate) => slugByPath.get(candidate))
        .find((found) => found !== undefined);
      return slug === undefined ? text : `[${text}](#${slug})`;
    },
  );
}

interface Page {
  filePath: string;
  title: string;
  slug: string;
}

type TocEntry =
  | { kind: "group"; label: string; depth: number }
  | { kind: "page"; label: string; depth: number; slug: string };

/** `readTitle` would fall back to the string "index", never to the folder. */
function groupLabel(groupDir: string): string {
  const title = readFrontmatter(path.join(groupDir, "index.md"))?.["title"];
  return title && title.length > 0 ? title : path.basename(groupDir);
}

/**
 * One `sortSiblings` call per level, so pages and subdirectories interleave the
 * way `buildSidebarItems` renders them.
 */
function walkPages(dir: string, depth: number, pages: Page[]): TocEntry[] {
  const toc: TocEntry[] = [];

  for (const entry of sortSiblings(dir, siblingEntries(dir))) {
    if (entry.isDirectory()) {
      toc.push(...walkGroup(path.join(dir, entry.name), depth, pages));
      continue;
    }
    const filePath = path.join(dir, entry.name);
    const title = readTitle(filePath);
    const slug = slugFor(filePath);
    pages.push({ filePath, title, slug });
    toc.push({ kind: "page", label: title, depth, slug });
  }

  return toc;
}

function walkGroup(dir: string, depth: number, pages: Page[]): TocEntry[] {
  const nested = walkPages(dir, depth + 1, pages);
  if (nested.length === 0) return [];
  return [{ kind: "group", label: groupLabel(dir), depth }, ...nested];
}

function collectPages(): { pages: Page[]; toc: TocEntry[] } {
  const pages: Page[] = [];
  const toc: TocEntry[] = [];

  for (const version of versionDirs(DOCS_ROOT)) {
    const versionRoot = path.join(DOCS_ROOT, version);

    for (const section of subDirs(versionRoot)) {
      toc.push(...walkGroup(path.join(versionRoot, section), 0, pages));
    }
  }

  return { pages, toc };
}

const { pages, toc } = collectPages();
const parts: string[] = [];

parts.push(
  `---\ntitle: Dokumentace (kompletní výstup)\nlayout: PrintLayout\n---\n`,
);
parts.push(`# Dokumentační portál\n`);
parts.push(`**Generováno:** ${PRAGUE_DATE}\n`);
parts.push(`**Počet stránek:** ${pages.length}\n`);

parts.push(`\n## Obsah\n`);
// One tight list: a blank line between items would split it into several lists
// and flatten the hierarchy the indentation carries.
for (const entry of toc) {
  const indent = "  ".repeat(entry.depth);
  parts.push(
    entry.kind === "group"
      ? `${indent}- **${entry.label}**`
      : `${indent}- [${entry.label}](#${entry.slug})`,
  );
}

const slugByPath = new Map(pages.map((p) => [p.filePath, p.slug]));

for (const page of pages) {
  const raw = fs.readFileSync(page.filePath, "utf-8");
  const body = rewriteLinks(stripFrontmatter(raw), page.filePath, slugByPath);

  parts.push(`\n<div class="page-break"></div>\n`);
  parts.push(`<a id="${page.slug}"></a>\n`);
  parts.push(body.trimEnd());
  parts.push(`\n`);
}

fs.writeFileSync(OUTPUT, parts.join("\n"), "utf-8");
console.log(`✓ Generated docs/print.md (${pages.length} pages)`);
