import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getVersions,
  generateNav,
  generateSidebar,
} from "../../../src/sidebar/index.js";

let docsRoot: string;

function write(rel: string, body: string): void {
  const full = path.join(docsRoot, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}

function fm(title: string, ...extra: string[]): string {
  return ["---", `title: ${title}`, ...extra, "---", "", ""].join("\n");
}

beforeEach(() => {
  docsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sidebar-"));
});

afterEach(() => {
  fs.rmSync(docsRoot, { recursive: true, force: true });
});

describe("getVersions", () => {
  test("returns sorted version directories", () => {
    fs.mkdirSync(path.join(docsRoot, "v2"));
    fs.mkdirSync(path.join(docsRoot, "v1"));
    fs.mkdirSync(path.join(docsRoot, "v3"));
    expect(getVersions(docsRoot)).toEqual(["v1", "v2", "v3"]);
  });

  test("ignores .vitepress, public, node_modules, and dotfolders", () => {
    fs.mkdirSync(path.join(docsRoot, "v1"));
    fs.mkdirSync(path.join(docsRoot, ".vitepress"));
    fs.mkdirSync(path.join(docsRoot, "public"));
    fs.mkdirSync(path.join(docsRoot, "node_modules"));
    fs.mkdirSync(path.join(docsRoot, ".cache"));
    expect(getVersions(docsRoot)).toEqual(["v1"]);
  });
});

describe("generateNav", () => {
  test("emits one item per top-level section, titles from index.md", () => {
    write("v1/byznys-specifikace/index.md", fm("Byznys specifikace"));
    write("v1/funkcni-specifikace/index.md", fm("Funkční specifikace"));
    write("v1/technicka-specifikace/index.md", fm("Technická specifikace"));

    const nav = generateNav(docsRoot, "v1");
    expect(nav).toEqual([
      { text: "Byznys specifikace", link: "/v1/byznys-specifikace/" },
      { text: "Funkční specifikace", link: "/v1/funkcni-specifikace/" },
      { text: "Technická specifikace", link: "/v1/technicka-specifikace/" },
    ]);
  });

  test("falls back to file-list when no subdirectories", () => {
    write("v1/index.md", fm("Index"));
    write("v1/intro.md", fm("Úvod"));
    write("v1/architecture.md", fm("Architektura"));

    const nav = generateNav(docsRoot, "v1");
    // index.md is excluded; rest sorted by cs locale
    expect(nav).toEqual([
      { text: "Architektura", link: "/v1/architecture" },
      { text: "Úvod", link: "/v1/intro" },
    ]);
  });

  test("section without index.md gets capitalized folder name as text", () => {
    write("v1/foo/x.md", fm("X"));
    const nav = generateNav(docsRoot, "v1");
    expect(nav).toEqual([{ text: "Foo", link: "/v1/foo/" }]);
  });
});

describe("generateSidebar", () => {
  test("builds a multi-key sidebar keyed by /version/", () => {
    write("v1/index.md", fm("v1 root"));
    write("v1/byznys-specifikace/index.md", fm("Byznys specifikace"));
    write("v1/byznys-specifikace/cil.md", fm("Cíl"));
    write("v2/index.md", fm("v2 root"));

    const sidebar = generateSidebar(docsRoot);
    expect(Object.keys(sidebar).sort()).toEqual(["/v1/", "/v2/"]);
  });

  test("collapses subdirectory groups with their index.md as link", () => {
    write("v1/index.md", fm("v1 root"));
    write("v1/sekce/index.md", fm("Sekce"));
    write("v1/sekce/stranka.md", fm("Stránka"));

    const sidebar = generateSidebar(docsRoot);
    const v1 = sidebar["/v1/"];
    // First item is the version root index
    expect(v1?.[0]).toEqual({ text: "v1 root", link: "/v1/" });

    // Second item is the section group
    const sekce = v1?.[1];
    expect(sekce?.text).toBe("Sekce");
    expect(sekce?.link).toBe("/v1/sekce/");
    expect(sekce?.collapsed).toBe(true);
    expect(sekce?.items).toEqual([
      { text: "Stránka", link: "/v1/sekce/stranka" },
    ]);
  });

  test("file titles fall back to filename when frontmatter is missing", () => {
    write("v1/index.md", fm("v1"));
    write("v1/no-frontmatter.md", "no frontmatter at all\n");
    const sidebar = generateSidebar(docsRoot);
    const items = sidebar["/v1/"];
    const leaf = items?.find(
      (i) => "link" in i && i.link === "/v1/no-frontmatter",
    );
    expect(leaf?.text).toBe("no-frontmatter");
  });

  test("multi-section sites get per-section sidebars without the section title", () => {
    write("v1/byznys-specifikace/index.md", fm("Byznys specifikace"));
    write("v1/byznys-specifikace/cil.md", fm("Cíl"));
    write("v1/funkcni-specifikace/index.md", fm("Funkční specifikace"));
    write("v1/funkcni-specifikace/use-cases.md", fm("Use cases"));
    write("v1/technicka-specifikace/index.md", fm("Technická specifikace"));

    const sidebar = generateSidebar(docsRoot);
    expect(Object.keys(sidebar).sort()).toEqual([
      "/v1/byznys-specifikace/",
      "/v1/funkcni-specifikace/",
      "/v1/technicka-specifikace/",
    ]);

    expect(sidebar["/v1/byznys-specifikace/"]).toEqual([
      { text: "Cíl", link: "/v1/byznys-specifikace/cil" },
    ]);
    expect(sidebar["/v1/funkcni-specifikace/"]).toEqual([
      { text: "Use cases", link: "/v1/funkcni-specifikace/use-cases" },
    ]);
  });

  test("mixed structure: flat root pages stay in /version/, sections keep their own sidebar", () => {
    write("v1/index.md", fm("v1 root"));
    write("v1/architektura.md", fm("Architektura")); // flat file in the version root
    write("v1/api/index.md", fm("API"));
    write("v1/api/api-v1.md", fm("API v1"));
    write("v1/monitoring/index.md", fm("Monitoring"));

    const sidebar = generateSidebar(docsRoot);

    // The flat root page is no longer orphaned: it sits under the /v1/ key
    // next to the version index, instead of disappearing entirely.
    expect(sidebar["/v1/"]).toEqual([
      { text: "v1 root", link: "/v1/" },
      { text: "Architektura", link: "/v1/architektura" },
    ]);

    // Per-section sidebars are preserved (conservative fix): sections are NOT
    // merged into /v1/, they keep their own focused keys.
    expect(Object.keys(sidebar).sort()).toEqual([
      "/v1/",
      "/v1/api/",
      "/v1/monitoring/",
    ]);
    expect(sidebar["/v1/api/"]).toEqual([
      { text: "API v1", link: "/v1/api/api-v1" },
    ]);

    // The flat root sidebar does not pull section groups into itself.
    const rootLinks = (sidebar["/v1/"] ?? []).map((i) =>
      "link" in i ? i.link : undefined,
    );
    expect(rootLinks).not.toContain("/v1/api/");
    expect(rootLinks).not.toContain("/v1/monitoring/");
  });

  test("flat-only version lists every root page under /version/ (srvc-bat-like, unchanged)", () => {
    write("v1/index.md", fm("v1 root"));
    write("v1/api.md", fm("API"));
    write("v1/architektura.md", fm("Architektura"));

    const sidebar = generateSidebar(docsRoot);

    // No subdirectories → a single unified /v1/ sidebar with every page.
    expect(Object.keys(sidebar)).toEqual(["/v1/"]);
    expect(sidebar["/v1/"]).toEqual([
      { text: "v1 root", link: "/v1/" },
      { text: "API", link: "/v1/api" },
      { text: "Architektura", link: "/v1/architektura" },
    ]);
  });
});
