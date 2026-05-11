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

interface ParsedFile {
  fields: [string, string][];
  body: string;
}

function parse(content: string): ParsedFile | null {
  const match = /^---\s*\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
  if (!match) return null;

  const fields: [string, string][] = [];
  for (const line of match[1]!.split("\n")) {
    const kv = /^([^:]+):\s*(.*)$/.exec(line.trim());
    if (kv) fields.push([kv[1]!.trim(), kv[2]!.trim()]);
  }

  return { fields, body: match[2]! };
}

function serialize(fields: [string, string][], body: string): string {
  const fm = fields.map(([k, v]) => `${k}: ${v}`).join("\n");
  return `---\n${fm}\n---\n${body}`;
}

function normalize(fields: [string, string][]): [string, string][] {
  const map = new Map(fields);
  const ordered: [string, string][] = [];

  for (const key of FIELD_ORDER) {
    if (map.has(key)) {
      ordered.push([key, map.get(key)!]);
      map.delete(key);
    }
  }

  for (const [k, v] of fields) {
    if (map.has(k)) {
      ordered.push([k, v]);
      map.delete(k);
    }
  }

  return ordered;
}

function fieldsEqual(a: [string, string][], b: [string, string][]): boolean {
  if (a.length !== b.length) return false;
  return a.every(([k, v], i) => b[i]?.[0] === k && b[i]?.[1] === v);
}

const files = allMdFiles(DOCS_ROOT);
console.log(`Normalizuji ${files.length} souborů v ${root}/\n`);

let changed = 0;
let skipped = 0;

for (const file of files) {
  const rel = path.relative(DOCS_ROOT, file);
  const content = fs.readFileSync(file, "utf-8");
  const parsed = parse(content);

  if (!parsed) {
    console.log(`  přeskočen (bez frontmatter): ${rel}`);
    skipped++;
    continue;
  }

  const normalized = normalize(parsed.fields);

  if (fieldsEqual(parsed.fields, normalized)) {
    skipped++;
    continue;
  }

  fs.writeFileSync(file, serialize(normalized, parsed.body), "utf-8");
  console.log(`  upraven: ${rel}`);
  changed++;
}

console.log(`\nHotovo. Upraveno: ${changed} souborů, přeskočeno: ${skipped} souborů.`);
