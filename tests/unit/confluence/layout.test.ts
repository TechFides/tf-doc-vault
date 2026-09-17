import { describe, test, expect } from "vitest";
import path from "node:path";
import {
  slugify,
  pageFilePath,
  childBasePath,
  buildPathMap,
  flattenTree,
  rewriteConfluenceLinks,
  buildOrderMap,
} from "../../../src/confluence/layout.js";
import { type TreeNode } from "../../../src/confluence/types.js";

function node(id: string, title: string, children: TreeNode[] = []): TreeNode {
  return {
    page: { id, title },
    children,
    slug: slugify(title),
    emoji: null,
    cleanTitle: title,
  };
}

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  test("strips a leading [PREFIX] and diacritics", () => {
    expect(slugify("[SVC] Café Déjà Vu")).toBe("cafe-deja-vu");
  });
  test("collapses spaces, underscores and repeated dashes", () => {
    expect(slugify("a__b   c")).toBe("a-b-c");
    expect(slugify("a -- b")).toBe("a-b");
  });
});

describe("pageFilePath / childBasePath", () => {
  const leaf = node("1", "Leaf");
  const parent = node("2", "Parent", [leaf]);

  test("root → index.md, child base unchanged", () => {
    expect(pageFilePath(parent, "out", true)).toBe(
      path.join("out", "index.md"),
    );
    expect(childBasePath(parent, "out", true)).toBe("out");
  });
  test("parent with children → slug/index.md", () => {
    expect(pageFilePath(parent, "out", false)).toBe(
      path.join("out", "parent", "index.md"),
    );
    expect(childBasePath(parent, "out", false)).toBe(
      path.join("out", "parent"),
    );
  });
  test("leaf → slug.md, child base unchanged", () => {
    expect(pageFilePath(leaf, "out", false)).toBe(path.join("out", "leaf.md"));
    expect(childBasePath(leaf, "out", false)).toBe("out");
  });
});

describe("buildPathMap", () => {
  test("maps ids to the index.md / leaf.md layout", () => {
    const child = node("c", "Child Page");
    const root = node("r", "Root", [
      node("p", "Parent", [child]),
      node("l", "Lonely Leaf"),
    ]);
    const map = new Map<string, string>();
    buildPathMap(root, "out", true, map);
    expect(map.get("r")).toBe(path.join("out", "index.md"));
    expect(map.get("p")).toBe(path.join("out", "parent", "index.md"));
    expect(map.get("c")).toBe(path.join("out", "parent", "child-page.md"));
    expect(map.get("l")).toBe(path.join("out", "lonely-leaf.md"));
  });
});

describe("flattenTree", () => {
  test("returns nodes in pre-order", () => {
    const root = node("r", "Root", [
      node("a", "A", [node("a1", "A1")]),
      node("b", "B"),
    ]);
    expect(flattenTree(root).map((n) => n.page.id)).toEqual([
      "r",
      "a",
      "a1",
      "b",
    ]);
  });
});

describe("rewriteConfluenceLinks", () => {
  const docsRoot = path.join("/d", "docs");
  const map = new Map<string, string>([
    ["123", path.join(docsRoot, "v1", "page.md")],
    ["456", path.join(docsRoot, "v1", "section", "index.md")],
  ]);
  const titles = new Map<string, string>([
    ["123", "Page Title"],
    ["456", "Section Title"],
  ]);

  test("rewrites an in-import page link to a relative path", () => {
    const md =
      "see [Page](https://x.atlassian.net/wiki/spaces/K/pages/123/Title)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(
      "see [Page](/v1/page)",
    );
  });
  test("section pages resolve to their index path", () => {
    const md = "[S](https://x.atlassian.net/wiki/spaces/K/pages/456)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(
      "[S](/v1/section/index)",
    );
  });
  test("replaces a bare-URL label with the target page title", () => {
    const md =
      "viz [https://x.atlassian.net/wiki/spaces/K/pages/123](https://x.atlassian.net/wiki/spaces/K/pages/123)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(
      "viz [Page Title](/v1/page)",
    );
  });
  test("keeps a meaningful label even when it is not a URL", () => {
    const md = "[My label](https://x.atlassian.net/wiki/spaces/K/pages/123)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(
      "[My label](/v1/page)",
    );
  });
  test("falls back to the original URL label when no title is known", () => {
    const md =
      "[https://x.atlassian.net/wiki/spaces/K/pages/123](https://x.atlassian.net/wiki/spaces/K/pages/123)";
    expect(rewriteConfluenceLinks(md, map, new Map(), docsRoot)).toBe(
      "[https://x.atlassian.net/wiki/spaces/K/pages/123](/v1/page)",
    );
  });
  test("leaves out-of-import page links untouched", () => {
    const md = "[Other](https://x.atlassian.net/wiki/spaces/K/pages/999/Z)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(md);
  });
  test("leaves non-page links untouched", () => {
    const md = "[Ext](https://example.com/foo)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(md);
  });
  test("rewrites a link whose label contains a [SERVICE_ID] prefix", () => {
    const md =
      "viz [[BAT] Konfigurace mock modulů](https://x.atlassian.net/wiki/spaces/K/pages/123).";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(
      "viz [[BAT] Konfigurace mock modulů](/v1/page).",
    );
  });
  test("leaves a bracketed-label link untouched when target is out of import", () => {
    const md =
      "[[AS] Migrace](https://x.atlassian.net/wiki/spaces/K/pages/999)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(md);
  });
  test("rewrites adjacent bracketed-label links independently", () => {
    const md =
      "[[BAT] One](https://x.atlassian.net/wiki/spaces/K/pages/123) a [[BAT] Two](https://x.atlassian.net/wiki/spaces/K/pages/456)";
    expect(rewriteConfluenceLinks(md, map, titles, docsRoot)).toBe(
      "[[BAT] One](/v1/page) a [[BAT] Two](/v1/section/index)",
    );
  });
});

describe("buildOrderMap", () => {
  test("numbers children by their position in the tree", () => {
    const tree = node("1", "Root", [
      node("2", "Zeta"),
      node("3", "Alfa", [node("4", "Leaf")]),
    ]);

    const map = new Map<string, number>();
    buildOrderMap(tree, map);

    expect(map.get("2")).toBe(1);
    expect(map.get("3")).toBe(2);
    expect(map.get("4")).toBe(1);
  });

  test("the root has no siblings and gets no entry", () => {
    const map = new Map<string, number>();
    buildOrderMap(node("1", "Root"), map);

    expect(map.has("1")).toBe(false);
  });
});
