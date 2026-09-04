import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readText,
  writeTextPreservingEol,
} from "../../../src/shared/text-file.js";

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
});

describe("writeTextPreservingEol", () => {
  test("a CRLF file keeps CRLF", () => {
    const file = write("crlf.yaml", "a: 1\r\n");
    writeTextPreservingEol(file, "a: 1\nb: 2\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\r\nb: 2\r\n");
  });

  test("an LF file keeps LF", () => {
    const file = write("lf.yaml", "a: 1\n");
    writeTextPreservingEol(file, "a: 1\nb: 2\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\nb: 2\n");
  });

  test("a file that does not exist yet is written LF", () => {
    const file = path.join(dir, "new.yaml");
    writeTextPreservingEol(file, "a: 1\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\n");
  });

  test("CRLF in the content does not survive twice", () => {
    const file = write("crlf.yaml", "a: 1\r\n");
    writeTextPreservingEol(file, "a: 1\r\nb: 2\r\n");
    expect(fs.readFileSync(file, "utf-8")).toBe("a: 1\r\nb: 2\r\n");
  });
});
