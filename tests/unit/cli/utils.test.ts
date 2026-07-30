import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseArgs,
  copyDir,
  replacePlaceholders,
  findDocsRoot,
  BINARY_EXTENSIONS,
} from "../../../src/cli/utils.js";

describe("parseArgs", () => {
  test("splits positional from flags", () => {
    const r = parseArgs(["pos1", "--foo=bar", "pos2", "--flag"]);
    expect(r.positional).toEqual(["pos1", "pos2"]);
    expect(r.flags).toEqual({ foo: "bar", flag: true });
  });

  test("empty argv", () => {
    expect(parseArgs([])).toEqual({ positional: [], flags: {} });
  });

  test("flag without value is true", () => {
    expect(parseArgs(["--enable"]).flags).toEqual({ enable: true });
  });

  test("flag value can contain '='", () => {
    expect(parseArgs(["--filter=a=b"]).flags).toEqual({ filter: "a=b" });
  });

  test("positional starting with single dash is positional, not flag", () => {
    expect(parseArgs(["-x"])).toEqual({ positional: ["-x"], flags: {} });
  });
});

describe("copyDir", () => {
  let src: string;
  let dest: string;

  beforeEach(() => {
    src = fs.mkdtempSync(path.join(os.tmpdir(), "copydir-src-"));
    dest = fs.mkdtempSync(path.join(os.tmpdir(), "copydir-dest-"));

    fs.writeFileSync(path.join(src, "a.txt"), "A");
    fs.writeFileSync(path.join(src, "b.md"), "B");
    fs.mkdirSync(path.join(src, "sub"));
    fs.writeFileSync(path.join(src, "sub", "c.txt"), "C");
  });

  afterEach(() => {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  });

  test("copies a tree recursively", () => {
    const r = copyDir(src, dest);
    expect(r.copied).toBe(3);
    expect(r.skipped).toBe(0);
    expect(fs.readFileSync(path.join(dest, "a.txt"), "utf8")).toBe("A");
    expect(fs.readFileSync(path.join(dest, "sub", "c.txt"), "utf8")).toBe("C");
  });

  test("idempotent skips existing files", () => {
    fs.writeFileSync(path.join(dest, "a.txt"), "OLD");
    const r = copyDir(src, dest, { idempotent: true });
    expect(r.skipped).toBe(1);
    expect(r.copied).toBe(2);
    expect(fs.readFileSync(path.join(dest, "a.txt"), "utf8")).toBe("OLD");
  });

  test("renameEntry rewrites names", () => {
    copyDir(src, dest, {
      renameEntry: (n) => (n === "a.txt" ? "renamed.txt" : n),
    });
    expect(fs.existsSync(path.join(dest, "renamed.txt"))).toBe(true);
    expect(fs.existsSync(path.join(dest, "a.txt"))).toBe(false);
  });

  test("exclude skips top-level entries only", () => {
    copyDir(src, dest, { exclude: ["b.md"] });
    expect(fs.existsSync(path.join(dest, "a.txt"))).toBe(true);
    expect(fs.existsSync(path.join(dest, "b.md"))).toBe(false);
    expect(fs.existsSync(path.join(dest, "sub", "c.txt"))).toBe(true);
  });

  // A Dirent reports a symlink as neither directory nor file, so without an
  // explicit branch it reaches copyFileSync and dereferences the target.
  test("recreates a symlinked file instead of dereferencing it", () => {
    fs.symlinkSync("a.txt", path.join(src, "link.txt"));
    const r = copyDir(src, dest);
    expect(r.copied).toBe(4);
    expect(fs.lstatSync(path.join(dest, "link.txt")).isSymbolicLink()).toBe(
      true,
    );
    expect(fs.readlinkSync(path.join(dest, "link.txt"))).toBe("a.txt");
  });

  test("recreates a symlinked directory instead of throwing", () => {
    fs.symlinkSync("sub", path.join(src, "sublink"));
    expect(() => copyDir(src, dest)).not.toThrow();
    expect(fs.lstatSync(path.join(dest, "sublink")).isSymbolicLink()).toBe(
      true,
    );
  });

  test("overwrites an existing link, and keeps it when idempotent", () => {
    fs.symlinkSync("a.txt", path.join(src, "link.txt"));
    fs.symlinkSync("elsewhere", path.join(dest, "link.txt"));

    const kept = copyDir(src, dest, { idempotent: true });
    expect(kept.skipped).toBe(1);
    expect(fs.readlinkSync(path.join(dest, "link.txt"))).toBe("elsewhere");

    copyDir(src, dest);
    expect(fs.readlinkSync(path.join(dest, "link.txt"))).toBe("a.txt");
  });

  test("a dangling link counts as an occupied path", () => {
    fs.symlinkSync("nowhere", path.join(src, "dangling"));
    fs.symlinkSync("nowhere-else", path.join(dest, "dangling"));
    const r = copyDir(src, dest, { idempotent: true });
    expect(r.skipped).toBe(1);
    expect(fs.readlinkSync(path.join(dest, "dangling"))).toBe("nowhere-else");
  });
});

describe("replacePlaceholders", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "replace-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("substitutes inside text files", () => {
    const f = path.join(dir, "x.md");
    fs.writeFileSync(f, "hello __NAME__ welcome __NAME__");
    replacePlaceholders(dir, { __NAME__: "world" });
    expect(fs.readFileSync(f, "utf8")).toBe("hello world welcome world");
  });

  test("skips binary extensions", () => {
    const f = path.join(dir, "img.png");
    const bytes = Buffer.from("__NAME__binary");
    fs.writeFileSync(f, bytes);
    replacePlaceholders(dir, { __NAME__: "REPLACED" });
    expect(fs.readFileSync(f).equals(bytes)).toBe(true);
  });

  test("recurses into subdirectories", () => {
    fs.mkdirSync(path.join(dir, "sub"));
    const f = path.join(dir, "sub", "deep.md");
    fs.writeFileSync(f, "__X__");
    replacePlaceholders(dir, { __X__: "Y" });
    expect(fs.readFileSync(f, "utf8")).toBe("Y");
  });

  // Rewriting through a link would edit its target, possibly outside `dir`.
  test("skips symlinks", () => {
    const real = path.join(dir, "real.md");
    fs.writeFileSync(real, "__X__");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.symlinkSync(real, path.join(dir, "sub", "link.md"));
    replacePlaceholders(path.join(dir, "sub"), { __X__: "Y" });
    expect(fs.readFileSync(real, "utf8")).toBe("__X__");
  });

  test("leaves files untouched when no placeholder matches", () => {
    const f = path.join(dir, "x.md");
    fs.writeFileSync(f, "no placeholders here");
    const mtimeBefore = fs.statSync(f).mtimeMs;
    replacePlaceholders(dir, { __X__: "Y" });
    expect(fs.readFileSync(f, "utf8")).toBe("no placeholders here");
    // mtime proves the file was never rewritten, not merely rewritten identically.
    expect(fs.statSync(f).mtimeMs).toBe(mtimeBefore);
  });
});

describe("findDocsRoot", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "docsroot-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("returns the .vitepress srcDir from the version dir", () => {
    const src = path.join(root, "docs");
    fs.mkdirSync(path.join(src, ".vitepress"), { recursive: true });
    expect(findDocsRoot(path.join(src, "v1"))).toBe(src);
  });

  test("returns the srcDir from a nested sub-section", () => {
    const src = path.join(root, "docs");
    fs.mkdirSync(path.join(src, ".vitepress"), { recursive: true });
    expect(findDocsRoot(path.join(src, "v1", "technicka-specifikace"))).toBe(
      src,
    );
  });

  test("works for the tech-docs layout (tech-docs/docs)", () => {
    const src = path.join(root, "tech-docs", "docs");
    fs.mkdirSync(path.join(src, ".vitepress"), { recursive: true });
    expect(findDocsRoot(path.join(src, "v1", "section"))).toBe(src);
  });

  test("resolves even when the output dir does not exist yet", () => {
    const src = path.join(root, "docs");
    fs.mkdirSync(path.join(src, ".vitepress"), { recursive: true });
    expect(findDocsRoot(path.join(src, "v1", "brand-new-section"))).toBe(src);
  });

  test("falls back to the parent when no .vitepress is found", () => {
    const out = path.join(root, "bare", "v1");
    fs.mkdirSync(out, { recursive: true });
    expect(findDocsRoot(out)).toBe(path.join(root, "bare"));
  });
});

describe("BINARY_EXTENSIONS", () => {
  test("includes common image and font extensions", () => {
    for (const ext of [".png", ".jpg", ".gif", ".woff", ".woff2", ".pdf"]) {
      expect(BINARY_EXTENSIONS.has(ext)).toBe(true);
    }
  });

  test("does not include common text extensions", () => {
    for (const ext of [".md", ".ts", ".json", ".yaml"]) {
      expect(BINARY_EXTENSIONS.has(ext)).toBe(false);
    }
  });
});
