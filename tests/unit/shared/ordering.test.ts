import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sortSiblings } from "../../../src/shared/ordering.js";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ordering-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(rel: string, ...fields: string[]): void {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, ["---", ...fields, "---", "", ""].join("\n"));
}

function names(): string[] {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !(e.isFile() && e.name === "index.md"));
  return sortSiblings(dir, entries).map((e) => e.name);
}

describe("sortSiblings", () => {
  test("orders by order ascending, not by name", () => {
    write("zeta.md", "title: Z", "order: 1");
    write("alfa.md", "title: A", "order: 2");
    expect(names()).toEqual(["zeta.md", "alfa.md"]);
  });

  test("a directory takes its order from index.md", () => {
    write("zeta/index.md", "title: Z", "order: 1");
    write("alfa/index.md", "title: A", "order: 2");
    expect(names()).toEqual(["zeta", "alfa"]);
  });

  test("files and directories share one number space", () => {
    write("page.md", "title: P", "order: 2");
    write("group/index.md", "title: G", "order: 1");
    expect(names()).toEqual(["group", "page.md"]);
  });

  test("items without order go last, alphabetically", () => {
    write("beta.md", "title: B");
    write("alfa.md", "title: A");
    write("zeta.md", "title: Z", "order: 9");
    expect(names()).toEqual(["zeta.md", "alfa.md", "beta.md"]);
  });

  test("duplicate order falls back to the name", () => {
    write("beta.md", "title: B", "order: 1");
    write("alfa.md", "title: A", "order: 1");
    expect(names()).toEqual(["alfa.md", "beta.md"]);
  });

  test("an invalid order counts as missing", () => {
    write("alfa.md", "title: A", "order: abc");
    write("beta.md", "title: B", "order: 1");
    expect(names()).toEqual(["beta.md", "alfa.md"]);
  });

  test("a directory without index.md lands in the tail", () => {
    fs.mkdirSync(path.join(dir, "orphan"));
    write("page.md", "title: P", "order: 5");
    expect(names()).toEqual(["page.md", "orphan"]);
  });
});
