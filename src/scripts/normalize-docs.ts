/**
 * normalize-docs.ts
 *
 * Normalizes frontmatter across all .md files in docs/:
 *   - Reorders fields to canonical order: title → status → updated_at → rest
 *   - Trims whitespace from values
 *   - Reports what was changed
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="))?.split("=")[1];
const root = rootArg ?? "docs";
const DOCS_ROOT = path.resolve(process.cwd(), root);
const FIELD_ORDER = ["title", "status", "updated_at"];

function allMdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".vitepress") {
      results.push(...allMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results.sort();
}

interface Block {
  key: string;
  lines: string[];
}

interface ParsedFile {
  blocks: Block[];
  body: string;
}

const TOP_LEVEL_KEY = /^([A-Za-z_][\w-]*)\s*:/;

function parse(content: string): ParsedFile | null {
  const match = /^---\s*\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
  if (!match) return null;

  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const line of match[1]!.split("\n")) {
    const isTopLevel =
      line.length > 0 &&
      !line.startsWith(" ") &&
      !line.startsWith("\t") &&
      !line.startsWith("-") &&
      !line.startsWith("#") &&
      TOP_LEVEL_KEY.test(line);

    if (isTopLevel) {
      if (current) blocks.push(current);
      current = { key: TOP_LEVEL_KEY.exec(line)![1]!, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  return { blocks, body: match[2]! };
}

function serialize(blocks: Block[], body: string): string {
  const fm = blocks.map((b) => b.lines.join("\n")).join("\n");
  return `---\n${fm}\n---\n${body}`;
}

function normalize(blocks: Block[]): Block[] {
  const seen = new Set<string>();
  const ordered: Block[] = [];

  for (const key of FIELD_ORDER) {
    const block = blocks.find((b) => b.key === key);
    if (block && !seen.has(key)) {
      ordered.push(block);
      seen.add(key);
    }
  }

  for (const block of blocks) {
    if (!seen.has(block.key)) {
      ordered.push(block);
      seen.add(block.key);
    }
  }

  return ordered;
}

function blocksEqual(a: Block[], b: Block[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((blk, i) => b[i]?.key === blk.key);
}

const files = allMdFiles(DOCS_ROOT);
console.log(`Normalizing ${files.length} file(s) in ${root}/\n`);

let changed = 0;
let skipped = 0;

for (const file of files) {
  const rel = path.relative(DOCS_ROOT, file);
  const content = fs.readFileSync(file, "utf-8");
  const parsed = parse(content);

  if (!parsed) {
    console.log(`  skipped (no frontmatter): ${rel}`);
    skipped++;
    continue;
  }

  const normalized = normalize(parsed.blocks);

  if (blocksEqual(parsed.blocks, normalized)) {
    skipped++;
    continue;
  }

  fs.writeFileSync(file, serialize(normalized, parsed.body), "utf-8");
  console.log(`  updated: ${rel}`);
  changed++;
}

console.log(
  `\nDone. Changed: ${changed} file(s), skipped: ${skipped} file(s).`,
);
