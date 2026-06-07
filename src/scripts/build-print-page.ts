/**
 * build-print-page.ts
 *
 * Generates docs/print.md by merging all docs in sidebar order:
 *   1. Title page (project name + generated date)
 *   2. Table of contents
 *   3. All page content in sidebar order, stripped of frontmatter
 *
 * Run from the project root: `tf-doc-vault print`.
 */

import fs from "node:fs";
import path from "node:path";

const DOCS_ROOT = path.resolve(process.cwd(), "docs");
const OUTPUT = path.join(DOCS_ROOT, "print.md");
const IGNORE = new Set([".vitepress", "node_modules", "public"]);
const PRAGUE_DATE = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date());

function subDirs(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."),
    )
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "cs"));
}

function mdFilesIn(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => {
      if (a === "index.md") return -1;
      if (b === "index.md") return 1;
      return a.localeCompare(b, "cs");
    });
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "").trimStart();
}

function extractTitle(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(content);
  const body = match?.[1];
  if (body) {
    const line = body.split("\n").find((l) => l.startsWith("title:"));
    if (line) return line.replace(/^title:\s*/, "").trim();
  }
  return path.basename(filePath, ".md");
}

function rewriteLinks(content: string, fromFile: string): string {
  return content.replace(
    /\[([^\]]+)\]\((\.[^)]+\.md[^)]*)\)/g,
    (_, text, href) => {
      const target = href.split("#")[0] as string;
      const abs = path.resolve(path.dirname(fromFile), target);
      const slug = path
        .relative(DOCS_ROOT, abs)
        .replace(/\.md$/, "")
        .replace(/\//g, "-")
        .toLowerCase();
      return `[${text}](#${slug})`;
    },
  );
}

interface Page {
  filePath: string;
  section: string;
  group: string;
  title: string;
  slug: string;
}

function collectPages(): Page[] {
  const pages: Page[] = [];

  for (const section of subDirs(DOCS_ROOT)) {
    const sectionDir = path.join(DOCS_ROOT, section);

    for (const group of subDirs(sectionDir)) {
      const groupDir = path.join(sectionDir, group);

      for (const file of mdFilesIn(groupDir).filter((f) => f !== "index.md")) {
        const filePath = path.join(groupDir, file);
        const slug = path
          .relative(DOCS_ROOT, filePath)
          .replace(/\.md$/, "")
          .replace(/\//g, "-")
          .toLowerCase();

        pages.push({
          filePath,
          section,
          group,
          title: extractTitle(filePath),
          slug,
        });
      }
    }
  }

  return pages;
}

const pages = collectPages();
const parts: string[] = [];

parts.push(
  `---\ntitle: Dokumentace — kompletní výstup\nlayout: PrintLayout\n---\n`,
);
parts.push(`# Dokumentační portál\n`);
parts.push(`**Generováno:** ${PRAGUE_DATE}\n`);
parts.push(`**Počet stránek:** ${pages.length}\n`);

parts.push(`\n## Obsah\n`);
let currentGroup = "";
for (const page of pages) {
  const groupKey = `${page.section}/${page.group}`;
  if (groupKey !== currentGroup) {
    parts.push(
      `\n**${page.group.charAt(0).toUpperCase() + page.group.slice(1)}**\n`,
    );
    currentGroup = groupKey;
  }
  parts.push(`- [${page.title}](#${page.slug})\n`);
}

for (const page of pages) {
  const raw = fs.readFileSync(page.filePath, "utf-8");
  const body = rewriteLinks(stripFrontmatter(raw), page.filePath);

  parts.push(`\n<div class="page-break"></div>\n`);
  parts.push(`<a id="${page.slug}"></a>\n`);
  parts.push(body.trimEnd());
  parts.push(`\n`);
}

fs.writeFileSync(OUTPUT, parts.join("\n"), "utf-8");
console.log(`✓ Generated docs/print.md (${pages.length} pages)`);
