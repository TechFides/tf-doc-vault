import { describe, test, expect } from "vitest";
import { createMarkdownRenderer } from "vitepress";
import { taskLists } from "../../../src/config/taskLists.js";

async function render(markdown: string): Promise<string> {
  const md = await createMarkdownRenderer(process.cwd());
  taskLists(md);
  return md.render(markdown);
}

describe("taskLists markdown-it rule", () => {
  test("renders GFM task items as disabled checkboxes", async () => {
    const html = await render(
      ["- [x] done", "- [ ] open", "  - [x] nested"].join("\n"),
    );
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toContain('class="task-list-item"');
    expect(html).toContain("contains-task-list");
    expect(html).not.toContain("[x]");
    expect(html).not.toContain("[ ]");
  });

  test("unchecked items render without the checked attribute", async () => {
    const html = await render("- [ ] todo\n");
    const checkbox = /<input[^>]*>/.exec(html)?.[0] ?? "";
    expect(checkbox).toContain("disabled");
    expect(checkbox).not.toContain("checked");
  });

  test("leaves ordinary lists untouched", async () => {
    const html = await render("- plain item\n");
    expect(html).not.toContain("checkbox");
    expect(html).not.toContain("task-list");
  });

  test("ignores [x] outside a list item start", async () => {
    const html = await render("text with [x] inside a paragraph\n");
    expect(html).not.toContain("checkbox");
  });
});
