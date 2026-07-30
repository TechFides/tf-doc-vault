import fs from "node:fs";
import path from "node:path";

/**
 * A problem the user can fix from the command line or a template manifest. The
 * CLI prints the message and exits 1; anything else keeps its stack trace.
 */
export class SetupError extends Error {}

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

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

// Everything not listed here is read as text and gets placeholder replacement.
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

/** lstat, so a dangling symlink still counts as an occupied path. */
function lstatOrNull(target: string): fs.Stats | null {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

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
    // Dirent reflects lstat, so a symlink is neither a directory nor a file
    // here. Recreate it: copyFileSync on a symlinked directory throws ENOTSUP.
    if (entry.isSymbolicLink()) {
      const occupied = lstatOrNull(d);
      if (occupied) {
        if (idempotent) {
          skipped++;
          continue;
        }
        // symlinkSync refuses an occupied target, so overwriting means removing.
        if (occupied.isDirectory()) {
          fs.rmSync(d, { recursive: true, force: true });
        } else {
          fs.unlinkSync(d);
        }
      }
      fs.symlinkSync(fs.readlinkSync(s), d);
      copied++;
    } else if (entry.isDirectory()) {
      const sub = copyDir(s, d, { ...opts, exclude: [] });
      copied += sub.copied;
      skipped += sub.skipped;
    } else if (idempotent && lstatOrNull(d)) {
      skipped++;
    } else {
      fs.copyFileSync(s, d);
      copied++;
    }
  }
  return { copied, skipped };
}

/**
 * Walk up from `startDir`'s parent looking for `fileName`, stopping at the
 * filesystem root. The walk skips `startDir` itself so a scaffold target cannot
 * match its own file. Returns the absolute path or null.
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

export function findDocsRoot(outputDir: string): string {
  let current = outputDir;
  while (true) {
    if (fs.existsSync(path.join(current, ".vitepress"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break; // hit the filesystem root
    current = parent;
  }
  return path.resolve(outputDir, "..");
}

export function replacePlaceholders(
  dir: string,
  replacements: Record<string, string>,
): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Writing through a symlink would edit its target, possibly outside `dir`.
    if (entry.isSymbolicLink()) continue;
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
