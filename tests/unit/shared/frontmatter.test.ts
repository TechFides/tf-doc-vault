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

// Above the direct-parser block, not instead of it: every fixture also has to
// survive the read path with either line ending, parser added later included.
const EOLS = [
  ["LF", "\n"],
  ["CRLF", "\r\n"],
] as const;

const FIXTURES: [string, string, Record<string, string>][] = [
  [
    "scalar fields",
    "---\ntitle: A\norder: 3\n---\n\nbody",
    { title: "A", order: "3" },
  ],
  ["a colon in the value", "---\ntitle: A: B\n---\n", { title: "A: B" }],
  [
    "a quoted value",
    '---\ntitle: "S1: cache"\norder: "2"\n---\n',
    { title: "S1: cache", order: "2" },
  ],
  [
    "a nested block below a top-level field",
    "---\ntitle: Home\nfeatures:\n  - icon: business\n    title: Components\n---\n",
    { title: "Home" },
  ],
];

for (const [label, eol] of EOLS) {
  describe(`frontmatter on disk (${label})`, () => {
    for (const [name, source, expected] of FIXTURES) {
      test(name, () => {
        const file = write(
          `${name.replaceAll(" ", "-")}.md`,
          source.replaceAll("\n", eol),
        );
        expect(readFrontmatter(file)).toEqual(expected);
      });
    }

    test("a title read back through readTitle", () => {
      const file = write(
        "title.md",
        "---\ntitle: Nadpis\n---\n".replaceAll("\n", eol),
      );
      expect(readTitle(file)).toBe("Nadpis");
    });
  });
}

describe("parseFrontmatter", () => {
  test("reads top-level scalar fields", () => {
    expect(parseFrontmatter("---\ntitle: A\norder: 3\n---\n\nbody")).toEqual({
      title: "A",
      order: "3",
    });
  });

  test("returns null without a frontmatter block", () => {
    expect(parseFrontmatter("# Just a heading\n")).toBeNull();
  });

  test("keeps a colon inside the value", () => {
    expect(parseFrontmatter("---\ntitle: A: B\n---\n")).toEqual({
      title: "A: B",
    });
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
    expect(parseFrontmatter(content)).toEqual({ title: "FeatureCards" });
  });

  test("drops the quoting YAML needs around a value holding a colon", () => {
    expect(
      parseFrontmatter('---\ntitle: "S1: cache a škálování"\n---\n'),
    ).toEqual({ title: "S1: cache a škálování" });
  });

  test("drops single quotes and undoubles the quote they escape", () => {
    expect(parseFrontmatter("---\ntitle: 'It''s: fine'\n---\n")).toEqual({
      title: "It's: fine",
    });
  });

  test("resolves the escapes of a double-quoted scalar", () => {
    expect(parseFrontmatter('---\ntitle: "a \\"b\\" \\\\ c"\n---\n')).toEqual({
      title: 'a "b" \\ c',
    });
  });

  test("leaves a value that only begins and ends with a quote", () => {
    expect(parseFrontmatter(`---\ntitle: "a" or "b"\n---\n`)).toEqual({
      title: '"a" or "b"',
    });
    expect(parseFrontmatter("---\ntitle: 'a' or 'b'\n---\n")).toEqual({
      title: "'a' or 'b'",
    });
  });

  test("leaves an unquoted value alone", () => {
    expect(parseFrontmatter('---\ntitle: 5" disk\n---\n')).toEqual({
      title: '5" disk',
    });
  });

  test("reads an order that carries quotes", () => {
    expect(
      parseOrder(parseFrontmatter('---\norder: "3"\n---\n')?.["order"]),
    ).toBe(3);
  });
});

describe("readFrontmatter", () => {
  test("reads the fields of a file on disk", () => {
    const file = write("page.md", "---\ntitle: Nadpis\norder: 2\n---\n\nbody");
    expect(readFrontmatter(file)).toEqual({ title: "Nadpis", order: "2" });
  });

  const SOURCE = '---\ntitle: "S1: A"\norder: 2\n---\n\nbody';

  test("reads a file that starts with a BOM", () => {
    const file = write("bom.md", "\uFEFF" + SOURCE);
    expect(readFrontmatter(file)).toEqual({ title: "S1: A", order: "2" });
  });

  test("returns null for a file that does not exist", () => {
    expect(readFrontmatter(path.join(dir, "nope.md"))).toBeNull();
  });
});

describe("readTitle", () => {
  test("prefers the title field", () => {
    const file = write("page.md", "---\ntitle: Nadpis\n---\n");
    expect(readTitle(file)).toBe("Nadpis");
  });

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
