import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseArgs,
  copyDir,
  replacePlaceholders,
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

  test("leaves files untouched when no placeholder matches", () => {
    const f = path.join(dir, "x.md");
    fs.writeFileSync(f, "no placeholders here");
    const mtimeBefore = fs.statSync(f).mtimeMs;
    replacePlaceholders(dir, { __X__: "Y" });
    expect(fs.readFileSync(f, "utf8")).toBe("no placeholders here");
    // File should not have been rewritten
    expect(fs.statSync(f).mtimeMs).toBe(mtimeBefore);
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
