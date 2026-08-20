import { describe, test, expect, beforeAll, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(REPO_ROOT, "dist/scripts/validate-docs.js");

const FRONTMATTER = [
  "---",
  "title: Test",
  "status: published",
  "updated_at: 2026-01-01",
  "---",
];

let workdirs: string[] = [];

/**
 * validate-docs is a CLI script, not an exported function. It validates a whole
 * tree at once, so each test builds its own temp `docs/` tree and runs the
 * script as a subprocess.
 */
function runValidate(files: Record<string, string>): {
  exitCode: number;
  stdout: string;
} {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-"));
  workdirs.push(workdir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(workdir, "docs", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  const r = spawnSync("node", [SCRIPT, "--root=docs"], {
    cwd: workdir,
    encoding: "utf-8",
  });
  return { exitCode: r.status ?? -1, stdout: r.stdout ?? "" };
}

function page(...body: string[]): string {
  return [...FRONTMATTER, "", ...body, ""].join("\n");
}

beforeAll(() => {
  if (!fs.existsSync(SCRIPT)) {
    throw new Error(
      `${SCRIPT} not found. Run \`pnpm build\` before \`pnpm test:unit\`.`,
    );
  }
});

afterEach(() => {
  for (const dir of workdirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  workdirs = [];
});

/**
 * The missing-images check must skip external http(s) URLs; only local paths
 * can be resolved on disk.
 */
describe("validate-docs (missing images)", () => {
  test("does not flag external http(s) images", () => {
    const r = runValidate({
      "page.md": page(
        "![balsamiq](https://balsamiq.cloud/project/mockup.png)",
        "",
        "![plain http](http://example.com/diagram.svg)",
        "",
        "![uppercase scheme](HTTPS://example.com/photo.jpg)",
      ),
    });

    expect(r.stdout).toContain("✓ Missing images");
    expect(r.exitCode).toBe(0);
  });

  test("still flags missing local images", () => {
    const r = runValidate({
      "page.md": page("![gone](./nope.png)"),
    });

    expect(r.stdout).toContain("missing image: ./nope.png");
    expect(r.exitCode).toBe(1);
  });

  test("accepts existing local images (relative and public-root absolute)", () => {
    const r = runValidate({
      "page.md": page("![relative](./shot.png)", "", "![absolute](/logo.svg)"),
      "shot.png": "fake-png",
      "public/logo.svg": "<svg></svg>",
    });

    expect(r.stdout).toContain("✓ Missing images");
    expect(r.exitCode).toBe(0);
  });
});

describe("Order", () => {
  const ok = (title: string, order: number): string =>
    [
      "---",
      `title: ${title}`,
      "status: published",
      "updated_at: 2026-01-01",
      `order: ${order}`,
      "---",
      "",
      "# " + title,
      "",
    ].join("\n");

  test("both roots are exempt, everything else needs order", () => {
    const { exitCode, stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": ok("Stránka", 1),
    });

    expect(stdout).toContain("✓ Order");
    expect(exitCode).toBe(0);
  });

  test("a missing order is an error", () => {
    const { exitCode, stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": [...FRONTMATTER, "", "# Stránka", ""].join("\n"),
    });

    expect(stdout).toContain("v1/page.md: missing required field: order");
    expect(exitCode).toBe(1);
  });

  test("a section index needs order", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/sekce/index.md": [...FRONTMATTER, "", "# Sekce", ""].join("\n"),
      "v1/sekce/page.md": ok("Stránka", 1),
    });

    expect(stdout).toContain(
      "v1/sekce/index.md: missing required field: order",
    );
  });

  test("a non-integer order is an error", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": [
        ...FRONTMATTER.slice(0, -1),
        "order: abc",
        "---",
        "",
        "# Stránka",
        "",
      ].join("\n"),
    });

    expect(stdout).toContain('v1/page.md: invalid order: "abc"');
  });

  test("a duplicate order names both files", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/alfa.md": ok("Alfa", 2),
      "v1/beta.md": ok("Beta", 2),
    });

    expect(stdout).toContain("duplicate order 2");
    expect(stdout).toContain("v1/alfa.md");
    expect(stdout).toContain("v1/beta.md");
  });

  test("a page and a group may not share a number", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": ok("Stránka", 1),
      "v1/skupina/index.md": ok("Skupina", 1),
      "v1/skupina/leaf.md": ok("List", 5),
    });

    expect(stdout).toContain(
      "v1/skupina/index.md: duplicate order 1 (also in v1/page.md)",
    );
  });

  test("the same number in different folders is fine", () => {
    const { exitCode } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/a/index.md": ok("A", 1),
      "v1/a/page.md": ok("Stránka A", 1),
      "v1/b/index.md": ok("B", 2),
      "v1/b/page.md": ok("Stránka B", 1),
    });

    expect(exitCode).toBe(0);
  });

  test("files under an ignored or dot directory are not ordered", () => {
    const { exitCode, stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": ok("Stránka", 1),
      "public/fragment.md": [...FRONTMATTER, "", "# Fragment", ""].join("\n"),
      ".drafts/nota.md": [...FRONTMATTER, "", "# Nota", ""].join("\n"),
    });

    expect(stdout).toContain("✓ Order");
    expect(exitCode).toBe(0);
  });

  test("a directory without index.md is an error, a version directory is not", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/sekce/index.md": ok("Sekce", 1),
      "v1/sekce/sirotek/page.md": ok("Stránka", 1),
    });

    expect(stdout).toContain("v1/sekce/sirotek: directory has no index.md");
    expect(stdout).not.toContain("v1: directory has no index.md");
  });
});

describe("Order: directories without pages", () => {
  const page = (title: string, order: number): string =>
    [
      "---",
      `title: ${title}`,
      "status: published",
      "updated_at: 2026-01-01",
      `order: ${order}`,
      "---",
      "",
      `# ${title}`,
      "",
    ].join("\n");

  test("an asset folder is not asked for an index.md", () => {
    const { exitCode, stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/sekce/index.md": page("Sekce", 1),
      "images-diagrams/diagrams/c4.svg": "<svg/>",
    });

    expect(stdout).toContain("\u2713 Order");
    expect(exitCode).toBe(0);
  });

  test("a directory that does hold a page still needs one", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/sekce/index.md": page("Sekce", 1),
      "v1/sekce/sirotek/x.md": page("X", 1),
    });

    expect(stdout).toContain("v1/sekce/sirotek: directory has no index.md");
  });
});
