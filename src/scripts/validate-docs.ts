/**
 * Checks every .md file under docs/: frontmatter fields and status values,
 * internal links, images, duplicate slugs, markdown lint rules and the
 * `order` field the sidebar sorts by.
 */

import fs from "node:fs";
import path from "node:path";
import { lint as markdownlint } from "markdownlint/sync";
import { parseFrontmatter, parseOrder } from "../shared/frontmatter.js";
import { IGNORED_DIRS, isDocsDir, subDirEntries } from "../shared/ordering.js";
import { allMdFiles } from "./docs-files.js";
import { readText } from "../shared/text-file.js";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="))?.split("=")[1];
const root = rootArg ?? "docs";
const DOCS_ROOT = path.resolve(process.cwd(), root);
const PUBLIC_ROOT = path.resolve(DOCS_ROOT, "public");
const REQUIRED_FIELDS = ["title", "status", "updated_at"] as const;
const VALID_STATUSES = new Set(["published", "draft", "review", "archived"]);

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
    const content = readText(file);
    const fm = parseFrontmatter(content);
    const rel = slugOf(file);

    if (!fm) {
      issues.push({ file: rel, message: "missing frontmatter block (---)" });
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!fm[field]) {
        issues.push({ file: rel, message: `missing required field: ${field}` });
      }
    }

    if (fm["status"] && !VALID_STATUSES.has(fm["status"])) {
      issues.push({
        file: rel,
        message: `invalid status: "${fm["status"]}" (allowed: ${[...VALID_STATUSES].join(", ")})`,
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
      issues.push({
        file: slug,
        message: `duplicate slug (conflicts with ${seen.get(slug)})`,
      });
    } else {
      seen.set(slug, file);
    }
  }
  return issues;
}

function checkBrokenLinks(files: string[]): Issue[] {
  const issues: Issue[] = [];
  for (const file of files) {
    const content = readText(file);
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
  // Only local paths can be checked on disk, so http(s) images are skipped.
  const imgRe =
    /!\[.*?\]\((?!https?:\/\/)([^)]+\.(svg|png|jpg|jpeg|gif|webp))\)/gi;
  const issues: Issue[] = [];
  for (const file of files) {
    const content = readText(file);
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
        issues.push({ file: slugOf(file), message: `missing image: ${src}` });
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

/** The folder whose sibling set this file competes in. */
function orderOwner(file: string): string {
  const dir = path.dirname(file);
  return path.basename(file) === "index.md" ? path.dirname(dir) : dir;
}

/**
 * Neither the sidebar nor `docs:normalize` walks these, so an `order` demanded
 * here would be an error nothing can fix.
 */
function isInIgnoredDir(file: string): boolean {
  const dirs = path.relative(DOCS_ROOT, file).split(path.sep).slice(0, -1);
  return dirs.some((name) => IGNORED_DIRS.has(name) || name.startsWith("."));
}

/** Outside the sorted tree, so nothing to sort against. */
function isOrderExempt(file: string): boolean {
  const depth = path.relative(DOCS_ROOT, file).split(path.sep).length;
  if (depth <= 1) return true;
  return path.basename(file) === "index.md" && depth === 2;
}

function checkOrder(files: string[]): Issue[] {
  const issues: Issue[] = [];
  const takenPerOwner = new Map<string, Map<number, string>>();

  for (const file of files) {
    if (isInIgnoredDir(file) || isOrderExempt(file)) continue;
    const rel = slugOf(file);
    const fm = parseFrontmatter(readText(file));
    // A file with no frontmatter at all is already reported by checkFrontmatter.
    if (!fm) continue;

    const raw = fm["order"];
    if (raw === undefined) {
      issues.push({ file: rel, message: "missing required field: order" });
      continue;
    }

    const value = parseOrder(raw);
    if (value === null) {
      issues.push({
        file: rel,
        message: `invalid order: "${raw}" (expected an integer)`,
      });
      continue;
    }

    const owner = orderOwner(file);
    const taken = takenPerOwner.get(owner) ?? new Map<number, string>();
    const clash = taken.get(value);
    if (clash) {
      issues.push({
        file: rel,
        message: `duplicate order ${value} (also in ${clash})`,
      });
    } else {
      taken.set(value, rel);
      takenPerOwner.set(owner, taken);
    }
  }

  return issues;
}

function holdsPages(dir: string): boolean {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .some(
      (e) =>
        (e.isFile() && e.name.endsWith(".md")) ||
        (isDocsDir(e) && holdsPages(path.join(dir, e.name))),
    );
}

function checkSectionIndexes(): Issue[] {
  const issues: Issue[] = [];

  const walk = (dir: string, depth: number): void => {
    for (const entry of subDirEntries(dir)) {
      const sub = path.join(dir, entry.name);
      // depth 0 holds the version directories, which `order` does not govern.
      // A directory holding no pages has no position either, so an asset folder
      // is not asked for an index.md.
      if (
        depth > 0 &&
        !fs.existsSync(path.join(sub, "index.md")) &&
        holdsPages(sub)
      ) {
        issues.push({
          file: slugOf(sub),
          message: "directory has no index.md, so it cannot carry order",
        });
      }
      walk(sub, depth + 1);
    }
  };

  walk(DOCS_ROOT, 0);
  return issues;
}

const files = allMdFiles(DOCS_ROOT, new Set(["print.md"]));
console.log(`Checking ${files.length} file(s) in ${root}/\n`);

const checks: { name: string; issues: Issue[] }[] = [
  { name: "Frontmatter", issues: checkFrontmatter(files) },
  { name: "Duplicate slugs", issues: checkDuplicateSlugs(files) },
  { name: "Broken links", issues: checkBrokenLinks(files) },
  { name: "Missing images", issues: checkMissingImages(files) },
  { name: "Markdown lint", issues: checkMarkdownLint(files) },
  {
    name: "Order",
    issues: [...checkOrder(files), ...checkSectionIndexes()],
  },
];

let totalErrors = 0;

for (const { name, issues } of checks) {
  if (issues.length === 0) {
    console.log(`✓ ${name}`);
  } else {
    console.log(
      `✗ ${name} (${issues.length} issue${issues.length === 1 ? "" : "s"})`,
    );
    for (const issue of issues) {
      console.log(`  ${issue.file}: ${issue.message}`);
    }
    totalErrors += issues.length;
  }
}

console.log();
if (totalErrors > 0) {
  console.error(`Found ${totalErrors} error(s).`);
  process.exit(1);
} else {
  console.log("All good.");
}
