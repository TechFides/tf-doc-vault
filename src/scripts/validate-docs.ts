/**
 * validate-docs.ts
 *
 * Checks all .md files in docs/ for:
 *   1. Required frontmatter fields (title, status, updated_at)
 *   2. Valid status values
 *   3. Broken internal links (relative + absolute, with .md / index.md fallback)
 *   4. Missing images
 *   5. Duplicate slugs
 *   6. Markdown lint rules
 */

import fs from "node:fs";
import path from "node:path";
import { lint as markdownlint } from "markdownlint/sync";

const args = process.argv.slice(2);
const rootArg =  args.find((a) => a.startsWith("--root="))?.split("=")[1] ?? "docs";
const root = rootArg ?? "docs";
const DOCS_ROOT = path.resolve(process.cwd(), root);
const PUBLIC_ROOT = path.resolve(DOCS_ROOT, "public");
const REQUIRED_FIELDS = ["title", "status", "updated_at"] as const;
const VALID_STATUSES = new Set(["published", "draft", "review", "archived"]);

function allMdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".vitepress") {
      results.push(...allMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "print.md") {
      results.push(full);
    }
  }
  return results.sort();
}

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(content);
  if (!match) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const kv = /^(\w+):\s*(.+)$/.exec(line.trim());
    if (kv) fields[kv[1]!] = kv[2]!.trim();
  }
  return fields;
}

function extractInternalLinks(content: string): string[] {
  const linkRe = /(!?)\[.*?\]\((?!https?:\/\/|mailto:|tel:)([^)]+)\)/g;
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(content)) !== null) {
    const isImage = m[1] === "!";
    if (isImage) continue;

    const rawLink = m[2]!.trim();
    if (rawLink.startsWith("#")) continue;

    const target = rawLink.split(/[#?]/)[0]!;
    if (target) links.push(target);
  }
  return links;
}

function slugOf(filePath: string): string {
  return path.relative(DOCS_ROOT, filePath).replace(/\\/g, "/");
}

interface Issue {
  file: string;
  message: string;
}

function checkFrontmatter(files: string[]): Issue[] {
  const issues: Issue[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const fm = parseFrontmatter(content);
    const rel = slugOf(file);

    if (!fm) {
      issues.push({ file: rel, message: "chybí frontmatter blok (---)" });
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!fm[field]) {
        issues.push({ file: rel, message: `chybí povinné pole: ${field}` });
      }
    }

    if (fm["status"] && !VALID_STATUSES.has(fm["status"])) {
      issues.push({
        file: rel,
        message: `neplatný status: "${fm["status"]}" (povoleno: ${[...VALID_STATUSES].join(", ")})`,
      });
    }
  }
  return issues;
}

function checkDuplicateSlugs(files: string[]): Issue[] {
  const seen = new Map<string, string>();
  const issues: Issue[] = [];
  for (const file of files) {
    const slug = slugOf(file);
    if (seen.has(slug)) {
      issues.push({ file: slug, message: `duplicitní slug (konflikt s ${seen.get(slug)})` });
    } else {
      seen.set(slug, file);
    }
  }
  return issues;
}

function checkBrokenLinks(files: string[]): Issue[] {
  const issues: Issue[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const currentDir = path.dirname(file);

    for (const target of extractInternalLinks(content)) {
      let resolved: string;
      if (target.startsWith("/")) {
        resolved = path.join(DOCS_ROOT, target);
      } else {
        resolved = path.resolve(currentDir, target);
      }

      let exists = fs.existsSync(resolved);
      if (!exists) {
        if (!resolved.endsWith(".md") && fs.existsSync(resolved + ".md")) {
          exists = true;
        } else if (
          fs.existsSync(resolved) &&
          fs.statSync(resolved).isDirectory() &&
          fs.existsSync(path.join(resolved, "index.md"))
        ) {
          exists = true;
        } else if (fs.existsSync(path.join(resolved, "index.md"))) {
          exists = true;
        }
      }

      if (!exists) {
        issues.push({ file: slugOf(file), message: `broken link → ${target}` });
      }
    }
  }
  return issues;
}

function checkMissingImages(files: string[]): Issue[] {
  const imgRe = /!\[.*?\]\(([^)]+\.(svg|png|jpg|jpeg|gif|webp))\)/gi;
  const issues: Issue[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(content)) !== null) {
      const src = m[1]!.trim();
      let resolved: string;
      if (src.startsWith("/")) {
        resolved = path.join(PUBLIC_ROOT, src);
      } else {
        resolved = path.resolve(path.dirname(file), src);
      }
      if (!fs.existsSync(resolved)) {
        issues.push({ file: slugOf(file), message: `chybí obrázek: ${src}` });
      }
    }
  }
  return issues;
}

function checkMarkdownLint(files: string[]): Issue[] {
  const results = markdownlint({
    files,
    config: {
      default: true,
      MD013: false,
      MD024: false,
      MD025: false,
      MD033: false,
      MD036: false,
      MD041: false,
      MD060: false,
    },
  });

  const issues: Issue[] = [];
  for (const [file, fileResults] of Object.entries(results)) {
    for (const result of fileResults) {
      issues.push({
        file: slugOf(file),
        message: `[${result.ruleNames.join("/")}] line ${result.lineNumber}: ${result.ruleDescription}`,
      });
    }
  }
  return issues;
}

const files = allMdFiles(DOCS_ROOT);
console.log(`Kontroluji ${files.length} souborů v ${root}/\n`);

const checks: { name: string; issues: Issue[] }[] = [
  { name: "Frontmatter", issues: checkFrontmatter(files) },
  { name: "Duplicitní slugy", issues: checkDuplicateSlugs(files) },
  { name: "Broken links", issues: checkBrokenLinks(files) },
  { name: "Chybějící obrázky", issues: checkMissingImages(files) },
  { name: "Markdown lint", issues: checkMarkdownLint(files) },
];

let totalErrors = 0;

for (const { name, issues } of checks) {
  if (issues.length === 0) {
    console.log(`✓ ${name}`);
  } else {
    console.log(`✗ ${name} (${issues.length} problém${issues.length > 1 ? "ů" : ""})`);
    for (const issue of issues) {
      console.log(`  ${issue.file}: ${issue.message}`);
    }
    totalErrors += issues.length;
  }
}

console.log();
if (totalErrors > 0) {
  console.error(`Nalezeno ${totalErrors} chyb.`);
  process.exit(1);
} else {
  console.log("Vše v pořádku.");
}
