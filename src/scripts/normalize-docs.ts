/**
 * Rewrites frontmatter across docs/ into the canonical field order (title,
 * status, updated_at, order, then the rest) and backfills a missing `order`
 * without changing the order the site renders.
 */

import fs from "node:fs";
import path from "node:path";
import { allMdFiles } from "./docs-files.js";
import { readFrontmatter, parseOrder } from "../shared/frontmatter.js";
import { pageEntries, subDirEntries } from "../shared/ordering.js";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="))?.split("=")[1];
const root = rootArg ?? "docs";
const DOCS_ROOT = path.resolve(process.cwd(), root);
const FIELD_ORDER = ["title", "status", "updated_at", "order"];

interface Block {
  key: string;
  lines: string[];
}

interface ParsedFile {
  blocks: Block[];
  body: string;
  eol: string;
}

const TOP_LEVEL_KEY = /^([A-Za-z_][\w-]*)\s*:/;

function parse(content: string): ParsedFile | null {
  const match = /^---\s*\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/.exec(
    content,
  );
  if (!match) return null;

  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const line of match[1]!.split(/\r?\n/)) {
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

  return {
    blocks,
    body: match[2]!,
    eol: content.includes("\r\n") ? "\r\n" : "\n",
  };
}

function serialize(blocks: Block[], body: string, eol: string): string {
  const fm = blocks.map((b) => b.lines.join(eol)).join(eol);
  return `---${eol}${fm}${eol}---${eol}${body}`;
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
  return a.every(
    (blk, i) =>
      b[i]?.key === blk.key && b[i]?.lines.join("\n") === blk.lines.join("\n"),
  );
}

/**
 * Keyed by the file that carries the value: a page, or a directory's index.md.
 * Missing values go above the folder's highest existing order, in the
 * alphabetical order the tail already renders in, so the render is unchanged.
 * A sibling this script cannot write to keeps rendering in that tail, so
 * numbering anything behind it would move it: it ends the folder's run.
 */
function planOrders(root: string): Map<string, number> {
  const assigned = new Map<string, number>();

  const walk = (dir: string, depth: number): void => {
    const dirs = subDirEntries(dir);
    const files = pageEntries(dir);

    // depth 0 is the docs root, whose children are versions: neither is ordered.
    if (depth >= 1) {
      const siblings = [...files, ...dirs].map((e) => {
        const carrier = e.isDirectory()
          ? path.join(dir, e.name, "index.md")
          : path.join(dir, e.name);
        // Null on a missing file and on a missing frontmatter block alike,
        // matching what the write loop below refuses to touch.
        const fields = readFrontmatter(carrier);
        return {
          name: e.name,
          carrier,
          writable: fields !== null,
          order: parseOrder(fields?.["order"]),
        };
      });

      let next =
        siblings.reduce(
          (max, s) => (s.order !== null && s.order > max ? s.order : max),
          0,
        ) + 1;

      for (const sibling of siblings
        .filter((s) => s.order === null)
        .sort((a, b) => a.name.localeCompare(b.name, "cs"))) {
        if (!sibling.writable) break;
        assigned.set(sibling.carrier, next++);
      }
    }

    for (const sub of dirs) walk(path.join(dir, sub.name), depth + 1);
  };

  walk(root, 0);
  return assigned;
}

function withOrder(blocks: Block[], value: number): Block[] {
  const line = `order: ${value}`;
  const existing = blocks.find((b) => b.key === "order");
  if (!existing) return [...blocks, { key: "order", lines: [line] }];
  return blocks.map((b) =>
    b === existing ? { key: "order", lines: [line, ...b.lines.slice(1)] } : b,
  );
}

const files = allMdFiles(DOCS_ROOT);
const orders = planOrders(DOCS_ROOT);
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

  const assigned = orders.get(file);
  const blocks =
    assigned === undefined ? parsed.blocks : withOrder(parsed.blocks, assigned);
  const normalized = normalize(blocks);

  if (blocksEqual(parsed.blocks, normalized)) {
    skipped++;
    continue;
  }

  fs.writeFileSync(
    file,
    serialize(normalized, parsed.body, parsed.eol),
    "utf-8",
  );
  console.log(`  updated: ${rel}`);
  changed++;
}

console.log(
  `\nDone. Changed: ${changed} file(s), skipped: ${skipped} file(s).`,
);
