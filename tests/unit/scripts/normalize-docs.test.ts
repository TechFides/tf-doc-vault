import { describe, test, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(REPO_ROOT, "dist/scripts/normalize-docs.js");

let workdir: string;
let docsRoot: string;

/**
 * normalize-docs is a CLI script, not an exported function. We invoke it as
 * a subprocess against a temp `docs/` tree, then read the file back to
 * inspect what it did to the frontmatter.
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
 * Regression test for the YAML-flattening bug — the original line-based
 * frontmatter parser collapsed nested YAML (hero / features blocks in vitepress
 * home pages) and truncated list entries past the first. The block-based parser
 * preserves indentation and every list entry.
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
