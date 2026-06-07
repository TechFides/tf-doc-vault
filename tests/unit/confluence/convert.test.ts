import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  convertAdf,
  ATLASSIAN_EMOJI,
} from "../../../src/confluence/convert.js";
import { parseMediaRefs } from "../../../src/confluence/resolve-media.js";

// ─── tiny ADF builders ───────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
const doc = (...content: any[]): any => ({ type: "doc", version: 1, content });
const para = (...content: any[]): any => ({ type: "paragraph", content });
const text = (t: string, marks?: any[]): any => ({
  type: "text",
  text: t,
  ...(marks ? { marks } : {}),
});
const heading = (level: number, ...content: any[]): any => ({
  type: "heading",
  attrs: { level },
  content,
});
const strong = [{ type: "strong" }];
const conv = (...content: any[]): string =>
  convertAdf(doc(...content)).markdown;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("emoji", () => {
  test("atlassian shortname emoji → unicode", () => {
    const md = conv(
      para({
        type: "emoji",
        attrs: {
          id: "atlassian-check_mark",
          text: ":check_mark:",
          shortName: ":check_mark:",
        },
      }),
    );
    expect(md).toContain("✅");
    expect(md).not.toContain(":check_mark:");
  });

  test("emoji map covers the common Atlassian set", () => {
    expect(ATLASSIAN_EMOJI[":check_mark:"]).toBe("✅");
    expect(ATLASSIAN_EMOJI[":cross_mark:"]).toBe("❌");
    expect(ATLASSIAN_EMOJI[":warning:"]).toBe("⚠️");
  });
});

describe("panels → VitePress containers", () => {
  const panel = (panelType: string): string =>
    conv({
      type: "panel",
      attrs: { panelType },
      content: [para(text("body"))],
    });

  test("info → ::: info", () => expect(panel("info")).toContain("::: info"));
  test("warning → ::: warning", () =>
    expect(panel("warning")).toContain("::: warning"));
  test("error → ::: danger", () =>
    expect(panel("error")).toContain("::: danger"));
  test("success → ::: tip", () =>
    expect(panel("success")).toContain("::: tip"));
  test("note → ::: info", () => expect(panel("note")).toContain("::: info"));
  test("container is closed", () =>
    expect(panel("info")).toMatch(/::: info\nbody\n:::/));
});

describe("smart links (no raw JSON fragments)", () => {
  test("blockCard → markdown link", () => {
    const url =
      "https://example.atlassian.net/wiki/spaces/DOC/pages/1234567890";
    const md = conv({ type: "blockCard", attrs: { url } });
    expect(md).toContain(`(${url})`);
    expect(md).not.toContain("adf:unknown");
    expect(md).not.toContain('"type"');
  });

  test("embedCard → markdown link", () => {
    const url = "https://youtube.com/watch?v=x";
    const md = conv({ type: "embedCard", attrs: { url } });
    expect(md).toContain(`(${url})`);
    expect(md).not.toContain("adf:unknown");
  });

  test("inlineCard → markdown link", () => {
    const url = "https://example.com/x";
    const md = conv(para({ type: "inlineCard", attrs: { url } }));
    expect(md).toContain(`(${url})`);
    expect(md).not.toContain("adf://");
  });
});

describe("inline nodes", () => {
  test("mention → plain @text", () => {
    const md = conv(
      para({ type: "mention", attrs: { id: "1", text: "@Jane" } }),
    );
    expect(md).toContain("@Jane");
    expect(md).not.toContain("adf://");
  });

  test("status → bold bracketed label", () => {
    const md = conv(
      para({ type: "status", attrs: { text: "DONE", color: "green" } }),
    );
    expect(md).toContain("[DONE]");
    expect(md).not.toContain("{status");
  });
});

describe("lists that the library treats as unknown", () => {
  test("taskList → GFM checkboxes", () => {
    const md = conv({
      type: "taskList",
      attrs: { localId: "x" },
      content: [
        {
          type: "taskItem",
          attrs: { localId: "1", state: "DONE" },
          content: [text("a")],
        },
        {
          type: "taskItem",
          attrs: { localId: "2", state: "TODO" },
          content: [text("b")],
        },
      ],
    });
    expect(md).toContain("- [x] a");
    expect(md).toContain("- [ ] b");
    expect(md).not.toContain("adf:unknown");
  });

  test("decisionList → bullet list", () => {
    const md = conv({
      type: "decisionList",
      attrs: { localId: "x" },
      content: [
        {
          type: "decisionItem",
          attrs: { localId: "1", state: "DECIDED" },
          content: [text("ship it")],
        },
      ],
    });
    expect(md).toContain("ship it");
    expect(md).not.toContain("adf:unknown");
  });
});

describe("layout", () => {
  test("layoutSection flattens columns to stacked blocks", () => {
    const md = conv({
      type: "layoutSection",
      content: [
        {
          type: "layoutColumn",
          attrs: { width: 50 },
          content: [para(text("left"))],
        },
        {
          type: "layoutColumn",
          attrs: { width: 50 },
          content: [para(text("right"))],
        },
      ],
    });
    expect(md).toContain("left");
    expect(md).toContain("right");
    expect(md).not.toContain("adf:unknown");
  });
});

describe("tables", () => {
  const cell = (t: string): any => ({
    type: "tableCell",
    attrs: {},
    content: [para(text(t))],
  });
  const header = (t: string): any => ({
    type: "tableHeader",
    attrs: {},
    content: [para(text(t))],
  });
  const row = (...cells: any[]): any => ({ type: "tableRow", content: cells });

  test("table with a header row renders with a separator", () => {
    const md = conv({
      type: "table",
      content: [row(header("A"), header("B")), row(cell("1"), cell("2"))],
    });
    expect(md).toMatch(/\|\s*-+\s*\|\s*-+\s*\|/);
    expect(md).toContain("A");
    expect(md).toContain("1");
  });

  test("header-less table is promoted so it still renders as a table", () => {
    const md = conv({
      type: "table",
      content: [row(cell("a"), cell("b")), row(cell("c"), cell("d"))],
    });
    // Without a separator row markdown-it would render this as plain text.
    expect(md).toMatch(/\|\s*-+\s*\|\s*-+\s*\|/);
  });

  test("block content in a cell keeps <br> (not escaped away)", () => {
    const md = conv({
      type: "table",
      content: [
        row({
          type: "tableCell",
          attrs: {},
          content: [
            {
              type: "bulletList",
              content: [
                { type: "listItem", content: [para(text("one"))] },
                { type: "listItem", content: [para(text("two"))] },
              ],
            },
          ],
        }),
      ],
    });
    expect(md).toContain("<br>");
    expect(md).not.toContain("\\<br");
  });
});

describe("bold with whitespace inside the markers", () => {
  test("trailing space inside ** is moved outside so it renders as bold", () => {
    const md = conv(heading(1, text("MySQL 8 ", strong)));
    expect(md).toContain("**MySQL 8**");
    expect(md).not.toContain("MySQL 8 **");
  });

  test("leading and trailing spaces are both moved outside", () => {
    const md = conv(para(text(" spaced ", strong)));
    expect(md).toContain("**spaced**");
    expect(md).not.toContain("** spaced");
    expect(md).not.toContain("spaced **");
  });

  test("already-tight bold is left untouched", () => {
    const md = conv(para(text("Service", strong)));
    expect(md).toContain("**Service**");
  });
});

describe("headings inside table cells", () => {
  const cell = (...content: any[]): any => ({
    type: "tableCell",
    attrs: {},
    content,
  });
  const header = (t: string): any => ({
    type: "tableHeader",
    attrs: {},
    content: [para(text(t))],
  });
  const row = (...cells: any[]): any => ({ type: "tableRow", content: cells });

  test("a heading in a cell is demoted (no literal ### markup leaks)", () => {
    const md = conv({
      type: "table",
      content: [
        row(header("Type"), header("Detail")),
        row(
          cell(heading(3, text("Unit tests", strong)), para(text("Run fast."))),
          cell(para(text("code"))),
        ),
      ],
    });
    expect(md).not.toContain("###");
    // title stays bold, separated from the body by a line break (not glued to it)
    expect(md).toMatch(/\*\*Unit tests\*\*\s*<br>\s*Run fast\./);
    // the table still renders (header separator intact)
    expect(md).toMatch(/\|\s*-+\s*\|\s*-+\s*\|/);
  });
});

describe("media", () => {
  test("media → adf:media placeholder with alt", () => {
    const md = conv({
      type: "mediaSingle",
      content: [
        { type: "media", attrs: { id: "abc-1", alt: "pic.png", type: "file" } },
      ],
    });
    expect(md).toContain("![pic.png](adf:media:abc-1)");
    expect(parseMediaRefs(md)).toEqual([{ alt: "pic.png", id: "abc-1" }]);
  });

  test("mediaInline → adf:media placeholder", () => {
    const md = conv(
      para({ type: "mediaInline", attrs: { id: "xyz", type: "file" } }),
    );
    expect(md).toContain("adf:media:xyz");
    expect(md).not.toContain("adf:unknown");
  });

  test("external media → link (not a broken adf:media:unknown)", () => {
    const md = conv({
      type: "mediaSingle",
      content: [
        {
          type: "media",
          attrs: {
            type: "external",
            url: "https://img.example/x.png",
            alt: "ext",
          },
        },
      ],
    });
    expect(md).toContain("https://img.example/x.png");
    expect(md).not.toContain("adf:media:unknown");
  });

  test("figure caption is preserved (not dropped as unknown)", () => {
    const result = convertAdf(
      doc({
        type: "mediaSingle",
        content: [
          {
            type: "media",
            attrs: { id: "pic-1", alt: "fig.png", type: "file" },
          },
          { type: "caption", content: [text("Figure 1: the diagram")] },
        ],
      }),
    );
    expect(result.markdown).toContain("![fig.png](adf:media:pic-1)");
    expect(result.markdown).toContain("Figure 1: the diagram");
    expect(result.unknownTypes).not.toContain("caption");
  });
});

describe("expand", () => {
  test("expand → ::: details container", () => {
    const md = conv({
      type: "expand",
      attrs: { title: "More" },
      content: [para(text("hidden"))],
    });
    expect(md).toContain("::: details More");
    expect(md).toContain("hidden");
  });
});

describe("unknown nodes and safety", () => {
  test("unknown node leaves no raw JSON fragment and is reported", () => {
    const result = convertAdf(
      doc({
        type: "weirdoNode",
        attrs: { foo: 1 },
        content: [para(text("x"))],
      }),
    );
    expect(result.unknownTypes).toContain("weirdoNode");
    expect(result.markdown).not.toContain("weirdoNode");
    expect(result.markdown).not.toContain("adf:unknown");
  });

  test("round-trip <!-- adf:* --> comments are stripped", () => {
    const md = conv(
      para({
        type: "emoji",
        attrs: {
          id: "atlassian-check_mark",
          text: ":check_mark:",
          shortName: ":check_mark:",
        },
      }),
    );
    expect(md).not.toContain("<!-- adf:");
  });

  test("stray < > and {{ in prose are escaped for Vue", () => {
    const md = conv(para(text("a < b and {{x}} and <Foo>")));
    expect(md).toContain("\\<");
    expect(md).toContain("&#123;&#123;");
  });

  test("code content is never escaped", () => {
    const md = conv({
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [text("const x: Array<number> = [];")],
    });
    expect(md).toContain("Array<number>");
    expect(md).not.toContain("Array\\<number");
  });

  test("null / non-doc input does not throw", () => {
    expect(convertAdf({ type: "doc", version: 1, content: [] }).markdown).toBe(
      "",
    );
  });
});

describe("representative Confluence page (end-to-end fixture)", () => {
  // A single realistic page exercising the full node mix: prose, a list with a
  // link, an image, headings, code blocks (with and without a language), a
  // smart link, and a table with inline emoji.
  const adf = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "fixtures", "example-page.adf.json"),
      "utf-8",
    ),
  );
  const { markdown, unknownTypes } = convertAdf(adf);

  test("no nodes dropped as unknown", () => {
    expect(unknownTypes).toEqual([]);
  });
  test("table is intact with emoji checkmarks", () => {
    expect(markdown).toMatch(/\|\s*-+\s*\|\s*-+\s*\|/);
    expect(markdown).toContain("✅");
    expect(markdown).toContain("**Service**");
  });
  test("image is a resolvable placeholder", () => {
    expect(markdown).toContain("![architecture-diagram.png](adf:media:");
  });
  test("the 'see' blockCard became a real link, not a fragment", () => {
    expect(markdown).toContain("/pages/1234567890)");
    expect(markdown).not.toContain("adf:unknown");
    expect(markdown).not.toContain('"type": "blockCard"');
  });
  test("both code blocks survive (with and without language)", () => {
    expect(markdown).toContain("```typescript");
    expect(markdown).toContain("npm install example-otel");
  });
  test("no round-trip comments leak", () => {
    expect(markdown).not.toContain("<!-- adf:");
  });
});
