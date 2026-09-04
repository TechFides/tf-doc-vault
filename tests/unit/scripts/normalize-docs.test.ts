import { describe, test, expect, beforeAll, afterAll, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(REPO_ROOT, "dist/scripts/normalize-docs.js");

let workdir: string;
let docsRoot: string;

/**
 * normalize-docs is a CLI script, not an exported function, so each test runs
 * it as a subprocess against a temp `docs/` tree and reads the file back.
 */
function runNormalize(): { exitCode: number; stdout: string; stderr: string } {
  const r = spawnSync("node", [SCRIPT, "--root=docs"], {
    cwd: workdir,
    encoding: "utf-8",
  });
  return {
    exitCode: r.status ?? -1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

beforeAll(() => {
  if (!fs.existsSync(SCRIPT)) {
    throw new Error(
      `${SCRIPT} not found. Run \`pnpm build\` before \`pnpm test:unit\`.`,
    );
  }
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "normalize-"));
  docsRoot = path.join(workdir, "docs");
  fs.mkdirSync(docsRoot, { recursive: true });
});

afterAll(() => {
  fs.rmSync(workdir, { recursive: true, force: true });
});

describe("normalize-docs (flat frontmatter)", () => {
  test("reorders fields to canonical order: title → status → updated_at → rest", () => {
    const file = path.join(docsRoot, "flat.md");
    fs.writeFileSync(
      file,
      [
        "---",
        "updated_at: 2026-01-01",
        "status: published",
        "title: Test",
        "custom: value",
        "---",
        "",
        "body",
      ].join("\n"),
    );

    const r = runNormalize();
    expect(r.exitCode).toBe(0);

    const after = fs.readFileSync(file, "utf-8");
    const lines = after.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[1]).toBe("title: Test");
    expect(lines[2]).toBe("status: published");
    expect(lines[3]).toBe("updated_at: 2026-01-01");
    expect(lines[4]).toBe("custom: value");
  });

  test("reorders a CRLF file and writes it back as LF", () => {
    const file = path.join(docsRoot, "crlf.md");
    fs.writeFileSync(
      file,
      [
        "---",
        "status: published",
        "title: Test",
        "updated_at: 2026-01-01",
        "---",
        "",
        "body",
        "",
      ].join("\r\n"),
    );

    expect(runNormalize().exitCode).toBe(0);

    const after = fs.readFileSync(file, "utf-8");
    expect(after).not.toContain("\r");
    expect(after.split("\n")[1]).toBe("title: Test");
  });

  test("leaves already-canonical files unchanged", () => {
    const file = path.join(docsRoot, "canonical.md");
    const original = [
      "---",
      "title: Canonical",
      "status: published",
      "updated_at: 2026-01-01",
      "---",
      "",
      "body",
    ].join("\n");
    fs.writeFileSync(file, original);
    const before = fs.statSync(file).mtimeMs;

    runNormalize();

    // Same content + file should not have been rewritten
    expect(fs.readFileSync(file, "utf-8")).toBe(original);
    expect(fs.statSync(file).mtimeMs).toBe(before);
  });
});

/**
 * Nested YAML (the hero / features blocks of a VitePress home page) has to
 * survive normalization with its indentation and every list entry intact.
 */
describe("normalize-docs (nested frontmatter)", () => {
  test("preserves nested hero block and full features list", () => {
    const file = path.join(docsRoot, "home.md");
    const original = [
      "---",
      "title: Home",
      "status: published",
      "layout: home",
      "",
      "hero:",
      "  name: Project",
      "  text: Tagline",
      "  actions:",
      "    - theme: brand",
      "      text: Get started",
      "      link: /v1/",
      "",
      "features:",
      "  - title: Card 1",
      "    details: Details 1",
      "  - title: Card 2",
      "    details: Details 2",
      "  - title: Card 3",
      "    details: Details 3",
      "---",
      "",
      "body",
    ].join("\n");
    fs.writeFileSync(file, original);

    const r = runNormalize();
    expect(r.exitCode).toBe(0);

    const after = fs.readFileSync(file, "utf-8");

    // All three feature cards must survive
    expect(after).toContain("Card 1");
    expect(after).toContain("Card 2");
    expect(after).toContain("Card 3");

    // Nested indentation must be preserved (canary: the `name:` line must NOT
    // be at column 0; it should be indented under `hero:`)
    const lines = after.split("\n");
    const nameIdx = lines.findIndex((l) => /^\s*name:\s+Project/.test(l));
    expect(nameIdx).toBeGreaterThan(-1);
    expect(lines[nameIdx]!.startsWith("  ")).toBe(true);
  });
});

let isolated: string[] = [];

afterEach(() => {
  for (const dir of isolated) fs.rmSync(dir, { recursive: true, force: true });
  isolated = [];
});

/**
 * Its own tree, not the shared `workdir`: normalize numbers a whole folder at
 * once, so what the tests above left there would shift the values asserted here.
 */
function normalizeTree(tree: Record<string, string>): Record<string, string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "normalize-order-"));
  isolated.push(dir);
  for (const [rel, content] of Object.entries(tree)) {
    const full = path.join(dir, "docs", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  const r = spawnSync("node", [SCRIPT, "--root=docs"], {
    cwd: dir,
    encoding: "utf-8",
  });
  // Without this a crash would turn every `not.toContain` below into a pass.
  expect(r.status, r.stderr).toBe(0);
  return Object.fromEntries(
    Object.keys(tree).map((rel) => [
      rel,
      fs.readFileSync(path.join(dir, "docs", rel), "utf-8"),
    ]),
  );
}

describe("order backfill", () => {
  test("numbers a folder that has no order at all", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/beta.md": "---\ntitle: Beta\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 1");
    expect(files["v1/beta.md"]).toContain("order: 2");
    expect(files["v1/index.md"]).not.toContain("order:");
  });

  test("appends above the highest existing order and keeps it", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\norder: 7\n---\n\nbody\n",
      "v1/beta.md": "---\ntitle: Beta\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 7");
    expect(files["v1/beta.md"]).toContain("order: 8");
  });

  test("a directory gets its order written into index.md", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/sekce/index.md": "---\ntitle: Sekce\n---\n\nbody\n",
      "v1/sekce/page.md": "---\ntitle: Stránka\n---\n\nbody\n",
    });

    expect(files["v1/sekce/index.md"]).toContain("order: 1");
    expect(files["v1/sekce/page.md"]).toContain("order: 1");
  });

  test("an invalid order is replaced, not duplicated", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\norder: abc\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 1");
    expect(files["v1/alfa.md"]).not.toContain("order: abc");
    expect(files["v1/alfa.md"].match(/^order:/gm)).toHaveLength(1);
  });

  test("order lands right after updated_at", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md":
        "---\nconfluence_id: 12\ntitle: Alfa\nstatus: draft\nupdated_at: 2026-01-01\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain(
      "title: Alfa\nstatus: draft\nupdated_at: 2026-01-01\norder: 1\nconfluence_id: 12",
    );
  });

  test("running twice changes nothing the second time", () => {
    const tree = {
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\n---\n\nbody\n",
    };
    const once = normalizeTree(tree);
    const twice = normalizeTree(once);

    expect(twice).toEqual(once);
  });
  test("keeps a negative existing order and numbers the rest above it", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\norder: -5\n---\n\nbody\n",
      "v1/beta.md": "---\ntitle: Beta\n---\n\nbody\n",
      "v1/gama.md": "---\ntitle: Gama\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: -5");
    expect(files["v1/beta.md"]).toContain("order: 1");
    expect(files["v1/gama.md"]).toContain("order: 2");
  });

  test("stops at a sibling directory that has no index.md to write into", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\n---\n\nbody\n",
      "v1/bravo/page.md": "---\ntitle: Page\n---\n\nbody\n",
      "v1/charlie.md": "---\ntitle: Charlie\n---\n\nbody\n",
    });

    // bravo/ renders in the alphabetical tail but cannot carry a value, so
    // charlie must stay behind it instead of leapfrogging it.
    expect(files["v1/alfa.md"]).toContain("order: 1");
    expect(files["v1/charlie.md"]).not.toContain("order:");
    // Its own children are still numbered: that cannot move bravo/ itself.
    expect(files["v1/bravo/page.md"]).toContain("order: 1");
  });

  test("stops at a sibling that has no frontmatter block to write into", () => {
    const plain = "# Bravo\n\nbody\n";
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\n---\n\nbody\n",
      "v1/bravo.md": plain,
      "v1/charlie.md": "---\ntitle: Charlie\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 1");
    expect(files["v1/bravo.md"]).toBe(plain);
    expect(files["v1/charlie.md"]).not.toContain("order:");
  });

  test("rewriting an invalid order keeps the block's continuation lines", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md":
        "---\ntitle: Alfa\norder: abc\n# why this page is first\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 1\n# why this page is first");
  });
});
