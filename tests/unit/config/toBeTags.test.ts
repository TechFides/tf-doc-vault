import { describe, test, expect } from "vitest";
import { createMarkdownRenderer } from "vitepress";
import { toBeTags, type ToBeTags } from "../../../src/config/toBeTags.js";

const JIRA = "https://acme.atlassian.net/browse";

async function render(
  markdown: string,
  options: Partial<ToBeTags> = {},
): Promise<string> {
  const md = await createMarkdownRenderer(process.cwd());
  toBeTags(md, { jiraBaseUrl: JIRA, ...options });
  return md.render(markdown);
}

describe("toBeTags inline rule", () => {
  test("wraps the span, links the ticket and keeps the literal braces", async () => {
    const html = await render("{ADD DOC-9693}nový text{/ADD}\n");
    expect(html).toContain('class="tf-tobe tf-tobe-add"');
    expect(html).toContain(`href="${JIRA}/DOC-9693"`);
    expect(html).toContain("{ADD&nbsp;");
    expect(html).toContain("{/ADD}");
    expect(html).toContain("nový text");
  });

  test("works mid-sentence, which the block form cannot express", async () => {
    const html = await render(
      "štítek `featureFlag` {ADD DOC-9693}a přesměruje klienta{/ADD}.\n",
    );
    expect(html).toContain("<code>featureFlag</code>");
    expect(html).toContain('<span class="tf-tobe tf-tobe-add">');
    // The span opens and closes inside the same paragraph.
    expect(html).toMatch(
      /<p>[^]*<span class="tf-tobe tf-tobe-add">[^]*<\/span>/,
    );
  });

  test("DEL uses its own class", async () => {
    const html = await render("{DEL DOC-9693}starý text{/DEL}\n");
    expect(html).toContain('class="tf-tobe tf-tobe-del"');
    expect(html).toContain("{/DEL}");
  });

  test("markdown inside a tag still parses", async () => {
    const html = await render("{ADD DOC-1}text s **tučným** slovem{/ADD}\n");
    expect(html).toContain("<strong>tučným</strong>");
  });

  test("two tags in one paragraph pair independently", async () => {
    const html = await render(
      "{ADD DOC-1}první{/ADD} mezi {ADD DOC-2}druhý{/ADD}\n",
    );
    expect(html.match(/tf-tobe-add/g)).toHaveLength(2);
    expect(html).toContain("mezi");
  });
});

describe("toBeTags block rule", () => {
  test("wraps whole blocks without breaking headings, lists or tables", async () => {
    const html = await render(
      [
        "::: add DOC-9693",
        "## Nadpis",
        "",
        "- položka",
        "",
        "| a | b |",
        "| - | - |",
        "| 1 | 2 |",
        ":::",
        "",
      ].join("\n"),
    );
    expect(html).toContain('<div class="tf-tobe tf-tobe-add">');
    expect(html).toMatch(/<h2[^>]*>/);
    expect(html).toContain("<li>položka</li>");
    expect(html).toContain("<table");
    expect(html).toContain("{/ADD}");
  });

  test("del block renders the del wrapper", async () => {
    const html = await render("::: del DOC-9693\nke zmazání\n:::\n");
    expect(html).toContain('<div class="tf-tobe tf-tobe-del">');
  });

  test("a container name that merely starts with add is not matched", async () => {
    const html = await render("::: added DOC-9693\ntext\n:::\n");
    expect(html).not.toContain("tf-tobe");
  });

  test("a block without a ticket is left alone", async () => {
    const html = await render("::: add\ntext\n:::\n");
    expect(html).not.toContain("tf-tobe");
  });

  // Prettier inserts a blank line after the opener when it formats a docs page,
  // so both spacings have to work: the one an analyst types and the one the
  // formatter leaves behind.
  test("a blank line after the opener is accepted", async () => {
    const html = await render("::: add DOC-9693\n\n## Nadpis\n\n:::\n");
    expect(html).toContain('<div class="tf-tobe tf-tobe-add">');
    expect(html).toMatch(/<h2[^>]*>/);
  });
});

describe("toBeTags pairing and tokenisation", () => {
  test("an unclosed opener renders as literal text, not a half-open span", async () => {
    const html = await render("{ADD DOC-9693}text bez konce\n");
    expect(html).not.toContain("tf-tobe");
    expect(html).toContain("{ADD DOC-9693}");
  });

  test("a stray closer renders as literal text", async () => {
    const html = await render("text a pak {/ADD}\n");
    expect(html).not.toContain("tf-tobe");
    expect(html).toContain("{/ADD}");
  });

  test("a tag cannot span two paragraphs", async () => {
    const html = await render("{ADD DOC-1}první\n\ndruhý{/ADD}\n");
    expect(html).not.toContain("tf-tobe");
  });

  // The ticket is never validated against a project key, so any tracker's
  // format has to work with no configuration.
  test("any ticket format is accepted verbatim", async () => {
    for (const ticket of ["DOC-9693", "ABC-42", "PROJ_1", "1234", "gh-7"]) {
      const html = await render(`{ADD ${ticket}}text{/ADD}\n`);
      expect(html).toContain('class="tf-tobe tf-tobe-add"');
      expect(html).toContain(`href="${JIRA}/${ticket}"`);
    }
  });

  // The ticket is one whitespace-free token, so prose that happens to start
  // with the keyword is not swallowed as a marker.
  test("a multi-word ticket is not a marker", async () => {
    const html = await render("{ADD a note here}text{/ADD}\n");
    expect(html).not.toContain("tf-tobe");
    expect(html).toContain("{ADD a note here}");
  });

  test("an empty ticket is not a marker", async () => {
    const html = await render("{ADD }text{/ADD}\n");
    expect(html).not.toContain("tf-tobe");
  });

  test("ordinary braces are untouched", async () => {
    const html = await render('`{ "key": "value" }` a {něco jiného}\n');
    expect(html).not.toContain("tf-tobe");
  });
});

describe("toBeTags options", () => {
  // VitePress hands out one cached renderer per process, so re-invoking
  // toBeTags has to retarget the existing rules rather than leave the first
  // call's options in force or install a second copy of everything.
  test("re-registering with new options retargets the installed rules", async () => {
    const md = await createMarkdownRenderer(process.cwd());
    toBeTags(md, { jiraBaseUrl: JIRA });
    expect(md.render("{ADD AAA-1}text{/ADD}\n")).toContain(
      `href="${JIRA}/AAA-1"`,
    );

    toBeTags(md, { jiraBaseUrl: "https://other.example/browse" });
    const second = md.render("{ADD DOC-7}text{/ADD}\n");
    expect(second).toContain('href="https://other.example/browse/DOC-7"');
    // Not a second copy of every rule, and no stale base URL.
    expect(second).not.toContain(JIRA);
    expect(second.match(/tf-tobe-add/g)).toHaveLength(1);
  });

  test("a trailing slash on jiraBaseUrl does not double up", async () => {
    const html = await render("{ADD DOC-1}text{/ADD}\n", {
      jiraBaseUrl: `${JIRA}/`,
    });
    expect(html).toContain(`href="${JIRA}/DOC-1"`);
  });
});
