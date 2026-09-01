/**
 * Generates docs/print.md, the single page `export-pdf` renders. Pages come out
 * in sidebar order; `index.md` opens the group it belongs to.
 *
 * `--pages=<file>` takes the anchor to page-number map `export-pdf` writes, and
 * puts those numbers in the table of contents. The CLI's `pdf` command runs the
 * whole chain twice for that reason.
 */

import fs from "node:fs";
import path from "node:path";
import { readFrontmatter } from "../shared/frontmatter.js";
import {
  siblingEntries,
  sortSiblings,
  subDirEntries,
} from "../shared/ordering.js";
import { LOGO_SHAPES, LOGO_VIEW_BOX } from "../theme/icons/logoSymbol.js";
import { readPdfBranding, type PdfCover } from "./pdf-branding.js";

const DOCS_ROOT = path.resolve(process.cwd(), "docs");
const OUTPUT = path.join(DOCS_ROOT, "print.md");

const PRAGUE_DATE = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

/** Hand-written contents lists, which the generated one replaces. */
const TOC_HEADINGS = new Set(["obsah", "obsah skupiny"]);

/**
 * A page title occupies h1 to h3 by its depth, so shifting a page's own headings
 * by 2 always clears them. Being a constant rather than the depth is what keeps
 * a `##` looking the same wherever its page sits in the tree.
 */
const HEADING_SHIFT = 2;

const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const ASSET = /\.(svg|png|jpe?g|gif|webp|pdf|json|ya?ml|txt|zip)$/i;

const FIGURE_CAPTION = /^\*\*Obrázek\b/;
/** A theme-dependent diagram ships as a `tf-light-only` / `tf-dark-only` pair. */
const FIGURE_MEDIA = /^(!\[|<img\b)/;
/** A caption whose figure is a Mermaid block has no tag to bind to. */
const FIGURE_BOUNDARY = /^(#{1,6}\s|`{3,}|~{3,}|\*\*Obrázek\b)/;

interface Page {
  filePath: string;
  title: string;
  slug: string;
  depth: number;
}

function versionDirs(dir: string): string[] {
  // Alphabetical on purpose, mirroring `getVersions`: versions are the one level
  // `order` does not govern.
  return subDirEntries(dir)
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "cs"));
}

function slugFor(filePath: string): string {
  return path
    .relative(DOCS_ROOT, filePath)
    .replace(/\.md$/, "")
    .replace(/\//g, "-")
    .toLowerCase();
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "").trimStart();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** `readTitle` would fall back to the string "index", never to the folder. */
function titleOf(filePath: string): string {
  const explicit = readFrontmatter(filePath)?.["title"];
  if (explicit && explicit.length > 0) return explicit;
  return path.basename(filePath) === "index.md"
    ? path.basename(path.dirname(filePath))
    : path.basename(filePath, ".md");
}

function pageOf(filePath: string, depth: number): Page {
  return {
    filePath,
    title: titleOf(filePath),
    slug: slugFor(filePath),
    depth,
  };
}

/** Pages and groups interleave the way `buildSidebarItems` renders them. */
function walk(dir: string, depth: number, pages: Page[]): void {
  for (const entry of sortSiblings(dir, siblingEntries(dir))) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) {
      pages.push(pageOf(full, depth));
      continue;
    }
    const groupIndex = path.join(full, "index.md");
    if (fs.existsSync(groupIndex)) pages.push(pageOf(groupIndex, depth));
    walk(full, depth + 1, pages);
  }
}

function collectPages(): Page[] {
  const pages: Page[] = [];
  for (const version of versionDirs(DOCS_ROOT)) {
    const versionRoot = path.join(DOCS_ROOT, version);
    const versionIndex = path.join(versionRoot, "index.md");
    if (fs.existsSync(versionIndex)) pages.push(pageOf(versionIndex, 0));
    walk(versionRoot, 0, pages);
  }
  return pages;
}

/** Drops a heading and everything under it, up to the next heading of its level. */
function dropTocSections(body: string): string {
  const kept: string[] = [];
  let fence: string | null = null;
  let dropUntilLevel: number | null = null;

  for (const line of body.split("\n")) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      if (fence === null) fence = marker;
      else if (marker.startsWith(fence[0]!) && marker.length >= fence.length)
        fence = null;
    }

    if (fence === null) {
      const heading = HEADING.exec(line);
      if (heading) {
        const level = heading[1]!.length;
        if (dropUntilLevel !== null && level <= dropUntilLevel)
          dropUntilLevel = null;
        if (
          dropUntilLevel === null &&
          TOC_HEADINGS.has(heading[2]!.trim().toLowerCase())
        ) {
          dropUntilLevel = level;
          continue;
        }
      }
    }

    if (dropUntilLevel === null) kept.push(line);
  }

  return kept.join("\n").trim();
}

function shiftHeadings(body: string, by: number): string {
  let fence: string | null = null;

  return body
    .split("\n")
    .map((line) => {
      const fenceMatch = FENCE.exec(line);
      if (fenceMatch) {
        const marker = fenceMatch[1]!;
        if (fence === null) fence = marker;
        else if (marker.startsWith(fence[0]!) && marker.length >= fence.length)
          fence = null;
        return line;
      }
      if (fence !== null) return line;

      const heading = HEADING.exec(line);
      if (!heading) return line;
      return `${"#".repeat(Math.min(heading[1]!.length + by, 6))} ${heading[2]}`;
    })
    .join("\n");
}

/**
 * Binds a `**Obrázek N**` line to the figure below it. Wrapping rather than only
 * reordering is what keeps the pair on one sheet: as sibling blocks the caption
 * gets torn off into the page footer.
 */
function bindFigureCaptions(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const caption = lines[i]!;
    if (!FIGURE_CAPTION.test(caption)) {
      out.push(caption);
      i++;
      continue;
    }

    const lead: string[] = [];
    let j = i + 1;
    while (
      j < lines.length &&
      !FIGURE_MEDIA.test(lines[j]!) &&
      !FIGURE_BOUNDARY.test(lines[j]!)
    ) {
      lead.push(lines[j]!);
      j++;
    }

    if (j >= lines.length || !FIGURE_MEDIA.test(lines[j]!)) {
      out.push(caption, ...lead);
      i = j;
      continue;
    }

    const media: string[] = [];
    while (j < lines.length && FIGURE_MEDIA.test(lines[j]!)) {
      media.push(lines[j]!);
      j++;
    }

    // The blank lines keep VitePress rendering the Markdown inside the HTML block.
    out.push(...lead);
    out.push(
      '<figure class="tf-figure">',
      "",
      ...media,
      "",
      caption,
      "",
      "</figure>",
    );
    i = j;
  }

  return out.join("\n");
}

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

/**
 * Raw HTML rather than Markdown for two reasons: the level has to follow the
 * page's depth so the PDF outline mirrors the sidebar, while the visual weight
 * follows the class instead, and it keeps VitePress' header anchor out of the
 * bookmark label.
 */
function titleHeading(page: Page): string {
  const level = Math.min(1 + page.depth, 3);
  const depthClass = `tf-page-title--d${Math.min(page.depth, 2)}`;
  return `<h${level} class="tf-page-title ${depthClass}">${escapeHtml(page.title)}</h${level}>`;
}

function coverMarkup(cover: PdfCover): string {
  const rows: string[] = [];
  const add = (label: string, value?: string): void => {
    if (value)
      rows.push(
        `    <dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`,
      );
  };
  add(
    "Dodavatel",
    [cover.vendor, cover.website].filter(Boolean).join(" · ") || undefined,
  );
  add("Pro", cover.recipient);
  add("Datum", PRAGUE_DATE);
  add("Platnost", cover.validUntil);
  add("Kontakt", cover.contact);

  const lines = [
    `<div class="tf-cover">`,
    `  <svg class="tf-cover__logo" viewBox="${LOGO_VIEW_BOX}" role="img" aria-hidden="true">${LOGO_SHAPES}</svg>`,
    `  <div class="tf-cover__lead">`,
  ];
  if (cover.eyebrow) {
    lines.push(
      `    <p class="tf-cover__eyebrow">${escapeHtml(cover.eyebrow)}</p>`,
    );
  }
  lines.push(`    <h1 class="tf-cover__title">${escapeHtml(cover.title)}</h1>`);
  if (cover.subtitle) {
    lines.push(
      `    <p class="tf-cover__subtitle">${escapeHtml(cover.subtitle)}</p>`,
    );
  }
  lines.push(
    `  </div>`,
    `  <div class="tf-cover__imprint">`,
    `    <dl class="tf-cover__meta">`,
  );
  lines.push(...rows, `    </dl>`);
  if (cover.confidentiality) {
    lines.push(
      `    <p class="tf-cover__note">${escapeHtml(cover.confidentiality)}</p>`,
    );
  }
  lines.push(`  </div>`, `</div>`);
  return lines.join("\n");
}

/** `--pages=<file>`: anchor to page number, from the exporter's previous run. */
function readPageMap(): Record<string, number> {
  const flag = process.argv.slice(2).find((a) => a.startsWith("--pages="));
  if (!flag) return {};
  const file = flag.slice("--pages=".length);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, number>;
}

const branding = readPdfBranding();
const cover = branding.cover;
const pages = collectPages();
const slugByPath = new Map(pages.map((p) => [p.filePath, p.slug]));
const pageMap = readPageMap();
const parts: string[] = [];

const documentTitle = cover
  ? [cover.title, cover.eyebrow].filter(Boolean).join(" – ")
  : "Dokumentace (kompletní výstup)";

parts.push(`---\ntitle: ${documentTitle}\nlayout: PrintLayout\n---\n`);

if (cover) {
  parts.push(coverMarkup(cover));
  parts.push(`\n<div class="page-break"></div>\n`);
} else {
  parts.push(
    `<h1 class="tf-page-title tf-page-title--d0">Dokumentační portál</h1>\n`,
  );
  parts.push(`**Generováno:** ${PRAGUE_DATE}\n`);
  parts.push(`\n<div class="page-break"></div>\n`);
}

parts.push(`<h1 class="tf-page-title tf-page-title--d0">Obsah</h1>\n`);
parts.push(`<div class="tf-print-toc">\n`);

// One tight list: a blank line between items would split it into several lists
// and flatten the hierarchy the indentation carries.
for (const page of pages) {
  const sectionClass = page.depth === 0 ? " tf-toc-label--section" : "";
  const label = `<span class="tf-toc-label${sectionClass}">${escapeHtml(page.title)}</span>`;
  const number = pageMap[page.slug];
  const tail =
    number === undefined
      ? ""
      : `<span class="tf-toc-leader"></span><span class="tf-toc-page">${number}</span>`;
  parts.push(`${"  ".repeat(page.depth)}- [${label}${tail}](#${page.slug})`);
}

parts.push(`\n</div>`);

// Only a section opens a fresh sheet. Breaking before every page is what leaves
// two-line sheets behind.
for (const page of pages) {
  const raw = fs.readFileSync(page.filePath, "utf-8");
  const body = rewriteLinks(
    bindFigureCaptions(dropTocSections(stripFrontmatter(raw))),
    page.filePath,
    slugByPath,
  );

  if (page.depth === 0) parts.push(`\n<div class="page-break"></div>\n`);
  parts.push(`<a id="${page.slug}"></a>\n`);
  parts.push(`${titleHeading(page)}\n`);
  parts.push(shiftHeadings(body, HEADING_SHIFT).trimEnd());
  parts.push(`\n`);
}

fs.writeFileSync(OUTPUT, parts.join("\n"), "utf-8");
console.log(`✓ Generated docs/print.md (${pages.length} pages)`);
