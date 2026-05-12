/**
 * Shared utilities for bin/ scaffolding scripts.
 */

import fs from "node:fs";
import path from "node:path";

/** Argument parser shared by all bin scripts. */
export function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (const a of argv) {
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq === -1) {
        args.flags[a.slice(2)] = true;
      } else {
        args.flags[a.slice(2, eq)] = a.slice(eq + 1);
      }
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

// Binary extensions to skip — everything else is treated as text.
export const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
]);

/**
 * Copy a directory tree.
 *
 * @param {string} src
 * @param {string} dest
 * @param {{ idempotent?: boolean, renameEntry?: (name: string) => string, exclude?: string[] }} [opts]
 *   idempotent  — skip files that already exist at dest (default: false = overwrite)
 *   renameEntry — transform each entry name before writing (default: identity)
 *   exclude     — entry names to skip (only at top level of each copyDir call)
 * @returns {{ copied: number, skipped: number }}
 */
export function copyDir(src, dest, opts = {}) {
  const { idempotent = false, renameEntry = (n) => n, exclude = [] } = opts;
  let copied = 0;
  let skipped = 0;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, renameEntry(entry.name));
    if (entry.isDirectory()) {
      const sub = copyDir(s, d, { ...opts, exclude: [] });
      copied += sub.copied;
      skipped += sub.skipped;
    } else if (idempotent && fs.existsSync(d)) {
      skipped++;
    } else {
      fs.copyFileSync(s, d);
      copied++;
    }
  }
  return { copied, skipped };
}

/**
 * Replace all placeholder strings in text files under a directory tree.
 *
 * @param {string} dir
 * @param {Record<string, string>} replacements
 */
export function replacePlaceholders(dir, replacements) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replacePlaceholders(full, replacements);
      continue;
    }
    if (BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    let content;
    try {
      content = fs.readFileSync(full, "utf-8");
    } catch {
      continue;
    }
    let changed = false;
    for (const [key, value] of Object.entries(replacements)) {
      if (content.includes(key)) {
        content = content.split(key).join(value);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(full, content);
  }
}
