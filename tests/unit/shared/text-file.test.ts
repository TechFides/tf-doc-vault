import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readText, writeText } from "../../../src/shared/text-file.js";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "text-file-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(name: string, content: string): string {
  const full = path.join(dir, name);
  fs.writeFileSync(full, content);
  return full;
}

describe("readText", () => {
  test("collapses CRLF to LF", () => {
    expect(readText(write("crlf.md", "a\r\nb\r\n"))).toBe("a\nb\n");
  });

  test("collapses a lone CR", () => {
    expect(readText(write("cr.md", "a\rb\r"))).toBe("a\nb\n");
  });

  test("leaves an LF file byte for byte", () => {
    expect(readText(write("lf.md", "a\nb\n"))).toBe("a\nb\n");
  });

  test("strips a leading BOM", () => {
    expect(readText(write("bom.md", "\uFEFFa\r\nb\r\n"))).toBe("a\nb\n");
  });

  test("keeps a BOM that is not the first character", () => {
    expect(readText(write("mid.md", "a\uFEFFb"))).toBe("a\uFEFFb");
  });
});

describe("writeText", () => {
  test("a CRLF file keeps CRLF", () => {
    const file = write("crlf.yaml", "a: 1\r\n");
    writeText(file, "a: 1\nb: 2\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\r\nb: 2\r\n");
  });

  test("an LF file keeps LF", () => {
    const file = write("lf.yaml", "a: 1\n");
    writeText(file, "a: 1\nb: 2\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\nb: 2\n");
  });

  test("a file that does not exist yet is written LF", () => {
    const file = path.join(dir, "new.yaml");
    writeText(file, "a: 1\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\n");
  });

  test("CRLF in the content does not survive twice", () => {
    const file = write("crlf.yaml", "a: 1\r\n");
    writeText(file, "a: 1\r\nb: 2\r\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\r\nb: 2\r\n");
  });

  test("a mostly-LF file keeps LF", () => {
    const file = write("mixed.yaml", "a: 1\r\n" + "b: 2\n".repeat(40));
    writeText(file, "a: 1\n" + "b: 2\n".repeat(40) + "c: 3\n");
    const after = fs.readFileSync(file, "utf-8");
    expect(after).not.toContain("\r");
  });

  test("a mostly-CRLF file keeps CRLF", () => {
    const file = write("mixed2.yaml", "a: 1\n" + "b: 2\r\n".repeat(40));
    writeText(file, "a: 1\nb: 2\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\r\nb: 2\r\n");
  });
});
