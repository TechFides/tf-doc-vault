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
});

describe("readFrontmatter", () => {
  test("reads the fields of a file on disk", () => {
    const file = write("page.md", "---\ntitle: Nadpis\norder: 2\n---\n\nbody");
    expect(readFrontmatter(file)).toEqual({ title: "Nadpis", order: "2" });
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
