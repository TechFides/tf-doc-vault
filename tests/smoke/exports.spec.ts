import { test, expect } from "./fixtures";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SUBPATHS = [
  "@techfides/tf-doc-vault/eslint",
  "@techfides/tf-doc-vault/prettier",
  "@techfides/tf-doc-vault/tsconfig",
  "@techfides/tf-doc-vault/docker/Dockerfile",
  "@techfides/tf-doc-vault/docker/nginx.conf",
  "@techfides/tf-doc-vault/docker/nginx-auth.conf",
  // Wildcard subpath export: a bare directory export resolves nothing.
  "@techfides/tf-doc-vault/templates/ana-docs/docs/index.md",
  "@techfides/tf-doc-vault/theme/styles/base.css",
  "@techfides/tf-doc-vault/theme/styles/tokens.css",
];

for (const subpath of SUBPATHS) {
  test(`subpath export resolves: ${subpath}`, ({ sandboxes }) => {
    const r = spawnSync(
      "node",
      ["-e", `console.log(require.resolve(${JSON.stringify(subpath)}))`],
      { cwd: sandboxes.anaDir, encoding: "utf-8" },
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toMatch(/@techfides\/tf-doc-vault/);
  });
}

/*
 * base.css is a published export, so it has to carry the tokens its own var()
 * calls read. They live in tokens.css, and a consumer importing this file instead
 * of calling createTheme() has no other way to pull them in: without the @import
 * every colour, size and radius in here resolves to nothing and the regression is
 * invisible to a build.
 */
test("the base.css export resolves the tokens it consumes", ({ sandboxes }) => {
  const r = spawnSync(
    "node",
    [
      "-e",
      `console.log(require.resolve("@techfides/tf-doc-vault/theme/styles/base.css"))`,
    ],
    { cwd: sandboxes.anaDir, encoding: "utf-8" },
  );
  expect(r.status, r.stderr).toBe(0);

  const baseFile = r.stdout.trim();
  const base = fs.readFileSync(baseFile, "utf-8");
  expect(base).toMatch(/var\(--brand-|var\(--tf-/);

  // Follow the one level of @import base.css is allowed to have.
  const imported = [...base.matchAll(/@import\s+"([^"]+)"/g)]
    .map((m) =>
      fs.readFileSync(path.resolve(path.dirname(baseFile), m[1]!), "utf-8"),
    )
    .join("\n");

  expect(base + imported).toMatch(/--brand-primary:/);
  expect(base + imported).toMatch(/--tf-color-accent:/);
});

// `specs/` is internal planning material kept out of the tarball by `files`.
test("the packed tarball ships no specs/ paths", ({ sandboxes }) => {
  const r = spawnSync("tar", ["-tzf", sandboxes.tgz], { encoding: "utf-8" });
  expect(r.status, r.stderr).toBe(0);

  const paths = r.stdout.split("\n").filter((line) => line.trim() !== "");
  expect(paths.length).toBeGreaterThan(0);
  expect(paths.filter((entry) => /^package\/specs\//.test(entry))).toEqual([]);
  expect(paths.some((entry) => entry.startsWith("package/boilerplate/"))).toBe(
    true,
  );
  expect(paths.some((entry) => entry.startsWith("package/templates/"))).toBe(
    true,
  );
});
