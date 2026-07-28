import { test, expect } from "./fixtures";
import { spawnSync } from "node:child_process";

const SUBPATHS = [
  "@techfides/tf-doc-vault/eslint",
  "@techfides/tf-doc-vault/prettier",
  "@techfides/tf-doc-vault/tsconfig",
  "@techfides/tf-doc-vault/docker/Dockerfile",
  "@techfides/tf-doc-vault/docker/nginx.conf",
  "@techfides/tf-doc-vault/docker/nginx-auth.conf",
  // Wildcard subpath export: a bare directory export resolves nothing.
  "@techfides/tf-doc-vault/templates/ana-docs/docs/index.md",
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
