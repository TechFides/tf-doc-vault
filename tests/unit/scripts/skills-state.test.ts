import { describe, expect, test } from "vitest";
import {
  adviceFor,
  classify,
  isPristine,
  matchesTemplate,
} from "../../../src/scripts/skills-state.js";

const BOILERPLATE = [
  "docs-from-code",
  "docs-technical-from-code",
  "docs-learn-from-session",
];

describe("classify", () => {
  test("a bundled-only name present means the bundled set", () => {
    expect(
      classify(
        ["docs-technical-from-code", "docs-learn-from-session"],
        BOILERPLATE,
      ),
    ).toBe("fallback");
  });

  test("only shared or library names means the library set", () => {
    expect(
      classify(["docs-base", "docs-learn-from-session"], BOILERPLATE),
    ).toBe("library");
  });

  test("an empty target has nothing to protect", () => {
    expect(classify([], BOILERPLATE)).toBe("library");
  });
});

describe("isPristine", () => {
  const packaged = new Map([
    ["a/SKILL.md", Buffer.from("a")],
    ["a/resources/r.md", Buffer.from("b")],
  ]);

  test("identical trees are pristine", () => {
    expect(isPristine(new Map(packaged), packaged)).toBe(true);
  });

  test("one edited byte is not", () => {
    const d = new Map(packaged);
    d.set("a/SKILL.md", Buffer.from("A"));
    expect(isPristine(d, packaged)).toBe(false);
  });

  test("an extra local file is not", () => {
    const d = new Map(packaged);
    d.set("a/notes.md", Buffer.from("mine"));
    expect(isPristine(d, packaged)).toBe(false);
  });

  test("a missing local file is not", () => {
    const d = new Map(packaged);
    d.delete("a/resources/r.md");
    expect(isPristine(d, packaged)).toBe(false);
  });
});

describe("matchesTemplate", () => {
  const tpl = "# CLAUDE.md\n\nDocs of the **__PROJECT__** project.\n";

  test("a filled-in placeholder matches", () => {
    expect(
      matchesTemplate(
        "# CLAUDE.md\n\nDocs of the **nabidka-acme** project.\n",
        tpl,
      ),
    ).toBe(true);
  });

  test("any other edit does not", () => {
    expect(
      matchesTemplate(
        "# CLAUDE.md\n\nDocs of the **nabidka-acme** project.\nExtra rule.\n",
        tpl,
      ),
    ).toBe(false);
  });

  test("regex metacharacters in the template are literal", () => {
    expect(matchesTemplate("a.b (c) [d]", "a.b (c) [d]")).toBe(true);
    expect(matchesTemplate("aXb (c) [d]", "a.b (c) [d]")).toBe(false);
  });
});

describe("adviceFor", () => {
  test("behind: an update hint with the absolute target", () => {
    const text = adviceFor(
      { behind: 2, needForce: false },
      "/p/.claude/skills",
    );
    expect(text).toContain("2 documentation skill(s) behind the library");
    expect(text).toContain("update --target /p/.claude/skills");
  });

  test("current: nothing to say", () => {
    expect(
      adviceFor({ behind: 0, needForce: false }, "/p/.claude/skills"),
    ).toBeNull();
  });

  test("locally modified: mentions --force", () => {
    expect(
      adviceFor({ behind: 1, needForce: true }, "/p/.claude/skills"),
    ).toContain("--force");
  });
});
