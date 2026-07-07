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
 * validate-docs is a CLI script, not an exported function. Each test builds
 * its own temp `docs/` tree (the script validates the whole tree, so trees
 * can't be shared across tests) and invokes the script as a subprocess.
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
 * Regression tests for the missing-images check — external http(s) image
 * URLs used to be resolved as local filesystem paths and were always
 * reported as "missing image".
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
