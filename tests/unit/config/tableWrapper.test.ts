import { describe, test, expect } from "vitest";
import { createMarkdownRenderer } from "vitepress";
import { tableWrapper } from "../../../src/config/tableWrapper.js";

async function render(markdown: string): Promise<string> {
  const md = await createMarkdownRenderer(process.cwd());
  tableWrapper(md);
  return md.render(markdown);
}

const TABLE = ["| A | B |", "| - | - |", "| 1 | 2 |"].join("\n");

describe("tableWrapper markdown-it rule", () => {
  test("wraps a table in a .tf-table scroll container", async () => {
    const html = await render(TABLE);
    expect(html).toContain('<div class="tf-table">');
    // Outer frame div wraps an inner scroller, then the table opens.
    // (VitePress adds attributes such as tabindex to the <table>.)
    expect(html).toMatch(
      /<div class="tf-table"><div class="tf-table-scroll"><table[^>]*>/,
    );
    expect(html).toMatch(/<\/table>\n?<\/div><\/div>/);
  });

  test("wraps every table independently", async () => {
    const html = await render(`${TABLE}\n\ntext\n\n${TABLE}`);
    expect(html.match(/<div class="tf-table">/g)).toHaveLength(2);
    expect(html.match(/<div class="tf-table-scroll">/g)).toHaveLength(2);
  });

  test("leaves documents without tables untouched", async () => {
    const html = await render("# Heading\n\nA paragraph.\n");
    expect(html).not.toContain("tf-table");
  });
});
