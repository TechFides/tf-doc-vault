/**
 * Shared utilities for the CLI scaffolding scripts (src/cli/*).
 */

import fs from "node:fs";
import path from "node:path";

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

/** Argument parser shared by all CLI scripts. */
export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { positional: [], flags: {} };
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
export const BINARY_EXTENSIONS = new Set<string>([
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

export interface CopyDirOptions {
  /** Skip files that already exist at dest (default: false = overwrite). */
  idempotent?: boolean;
  /** Transform each entry name before writing (default: identity). */
  renameEntry?: (name: string) => string;
  /** Entry names to skip (only at the top level of each copyDir call). */
  exclude?: string[];
}

export interface CopyDirResult {
  copied: number;
  skipped: number;
}

/**
 * Copy a directory tree.
 */
export function copyDir(
  src: string,
  dest: string,
  opts: CopyDirOptions = {},
): CopyDirResult {
  const {
    idempotent = false,
    renameEntry = (n: string): string => n,
    exclude = [],
  } = opts;
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
 * Walk up from `startDir` looking for a file named `fileName`.
 * Stops at the filesystem root. Returns the absolute path or null.
 *
 * Used by create-ana to detect an ancestor `pnpm-workspace.yaml` — pnpm only
 * honors workspace config at the workspace root, so a scaffolded
 * `pnpm-workspace.yaml` inside a subdirectory of an existing workspace is
 * silently ignored.
 *
 * @param startDir Directory to begin the walk from. The walk begins at
 *                 `startDir`'s PARENT (the scaffold target's own workspace file
 *                 is never the answer).
 * @param fileName Bare filename to look for at each level.
 * @returns Absolute path of the first match, or null.
 */
export function findAncestorFile(
  startDir: string,
  fileName: string,
): string | null {
  let current = path.resolve(startDir, "..");
  while (true) {
    const candidate = path.join(current, fileName);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null; // hit the filesystem root
    current = parent;
  }
}

/**
 * Replace all placeholder strings in text files under a directory tree.
 */
export function replacePlaceholders(
  dir: string,
  replacements: Record<string, string>,
): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replacePlaceholders(full, replacements);
      continue;
    }
    if (BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    let content: string;
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
