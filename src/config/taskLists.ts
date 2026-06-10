import type { MarkdownRenderer } from "vitepress";

const TASK_MARKER = /^\[([ xX])\](?: |$)/;

export function taskLists(md: MarkdownRenderer): void {
  md.core.ruler.after("inline", "task-lists", (state) => {
    const tokens = state.tokens;
    const listStack: (typeof tokens)[number][] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      if (token.type === "bullet_list_open") {
        listStack.push(token);
        continue;
      }
      if (token.type === "bullet_list_close") {
        listStack.pop();
        continue;
      }

      // A task item parses as: list_item_open, paragraph_open, inline
      // whose first child is a text token starting with the `[x] ` marker.
      if (
        token.type !== "inline" ||
        tokens[i - 1]?.type !== "paragraph_open" ||
        tokens[i - 2]?.type !== "list_item_open"
      ) {
        continue;
      }
      const first = token.children?.[0];
      if (!first || first.type !== "text") continue;
      const marker = TASK_MARKER.exec(first.content);
      if (!marker) continue;

      first.content = first.content.slice(marker[0].length);
      const checkbox = new state.Token("html_inline", "", 0);
      const checked = marker[1] === " " ? "" : " checked";
      checkbox.content = `<input class="task-list-item-checkbox" type="checkbox" disabled${checked}> `;
      token.children?.unshift(checkbox);

      tokens[i - 2]?.attrJoin("class", "task-list-item");
      listStack[listStack.length - 1]?.attrJoin("class", "contains-task-list");
    }
  });
}
