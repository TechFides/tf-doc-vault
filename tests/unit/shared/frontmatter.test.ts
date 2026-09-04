import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseFrontmatter,
  readFrontmatter,
  readTitle,
  parseOrder,
} from "../../../src/shared/frontmatter.js";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "frontmatter-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(name: string, content: string): string {
  const full = path.join(dir, name);
  fs.writeFileSync(full, content);
  return full;
}

/**
 * Every fixture runs with both line endings. `parseFrontmatter` takes the
 * output of `readText`, so under CRLF it is `readFrontmatter` that has to
 * deliver LF; feeding the parser CRLF directly is not a supported call.
 */
const EOLS = [
  ["LF", "\n"],
  ["CRLF", "\r\n"],
] as const;

for (const [label, eol] of EOLS) {
  const fx = (source: string): string => source.replaceAll("\n", eol);
  const parsed = (source: string): Record<string, string> | null =>
    readFrontmatter(
      write(`page-${Math.random().toString(36).slice(2)}.md`, fx(source)),
    );

  describe(`frontmatter (${label})`, () => {
    test("reads top-level scalar fields", () => {
      expect(parsed("---\ntitle: A\norder: 3\n---\n\nbody")).toEqual({
        title: "A",
        order: "3",
      });
    });

    test("returns null without a frontmatter block", () => {
      expect(parsed("# Just a heading\n")).toBeNull();
    });

    test("keeps a colon inside the value", () => {
      expect(parsed("---\ntitle: A: B\n---\n")).toEqual({ title: "A: B" });
    });

    test("a nested block does not override the top-level field of the same name", () => {
      const content = [
        "---",
        "title: FeatureCards",
        "features:",
        "  - icon: business",
        "    title: Components",
        "  - icon: functional",
        "    title: Runs on Node 24",
        "---",
        "",
      ].join("\n");

      // `features:` itself carries no scalar value, so it is not a field either.
      expect(parsed(content)).toEqual({ title: "FeatureCards" });
    });

    test("drops the quoting YAML needs around a value holding a colon", () => {
      expect(parsed('---\ntitle: "S1: cache a škálování"\n---\n')).toEqual({
        title: "S1: cache a škálování",
      });
    });

    test("drops single quotes and undoubles the quote they escape", () => {
      expect(parsed("---\ntitle: 'It''s: fine'\n---\n")).toEqual({
        title: "It's: fine",
      });
    });

    test("resolves the escapes of a double-quoted scalar", () => {
      expect(parsed('---\ntitle: "a \\"b\\" \\\\ c"\n---\n')).toEqual({
        title: 'a "b" \\ c',
      });
    });

    test("leaves a value that only begins and ends with a quote", () => {
      expect(parsed('---\ntitle: "a" or "b"\n---\n')).toEqual({
        title: '"a" or "b"',
      });
      expect(parsed("---\ntitle: 'a' or 'b'\n---\n")).toEqual({
        title: "'a' or 'b'",
      });
    });

    test("leaves an unquoted value alone", () => {
      expect(parsed('---\ntitle: 5" disk\n---\n')).toEqual({
        title: '5" disk',
      });
    });

    test("reads an order that carries quotes", () => {
      expect(parseOrder(parsed('---\norder: "3"\n---\n')?.["order"])).toBe(3);
    });

    test("readTitle prefers the title field", () => {
      const file = write(`title-${label}.md`, fx("---\ntitle: Nadpis\n---\n"));
      expect(readTitle(file)).toBe("Nadpis");
    });
  });
}

describe("parseFrontmatter", () => {
  test("returns null without a frontmatter block", () => {
    expect(parseFrontmatter("# Just a heading\n")).toBeNull();
  });
});

describe("readFrontmatter", () => {
  test("returns null for a file that does not exist", () => {
    expect(readFrontmatter(path.join(dir, "nope.md"))).toBeNull();
  });
});

describe("readTitle", () => {
  test("falls back to the file name", () => {
    const file = write("page.md", "no frontmatter here\n");
    expect(readTitle(file)).toBe("page");
  });
});

describe("parseOrder", () => {
  test("accepts integers", () => {
    expect(parseOrder("3")).toBe(3);
    expect(parseOrder(" 12 ")).toBe(12);
    expect(parseOrder("-1")).toBe(-1);
  });

  test("rejects anything that is not an integer", () => {
    expect(parseOrder(undefined)).toBeNull();
    expect(parseOrder("")).toBeNull();
    expect(parseOrder("1.5")).toBeNull();
    expect(parseOrder("abc")).toBeNull();
  });
});
