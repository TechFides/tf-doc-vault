import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BOILERPLATE_DIR,
  TRACKED_FILES,
  resolveBoilerplatePath,
} from "../../../src/scripts/sync-template.js";
import { consumerName } from "../../../src/cli/scaffold.js";

// Pinned, not derived from TRACKED_FILES: a test that only iterates the list
// cannot notice an entry disappearing from it.
const EXPECTED_TRACKED_FILES = [
  "Dockerfile",
  ".gitlab-ci.yml",
  ".gitignore",
  ".prettierrc",
  ".prettierignore",
  "eslint.config.js",
  "tsconfig.json",
  "docker/nginx.conf",
  "docker/nginx-auth.conf",
  "infra/main.tf",
  "infra/variables.tf",
  "infra/outputs.tf",
  "infra/terraform.tfvars.example",
];

describe("tracked files", () => {
  test("the tracked list is exactly what the boilerplate is expected to cover", () => {
    expect(TRACKED_FILES).toEqual(EXPECTED_TRACKED_FILES);
  });

  // A tracked file without a counterpart makes every sync run fail.
  test("every tracked file resolves to a file inside the boilerplate", () => {
    for (const rel of TRACKED_FILES) {
      const resolved = resolveBoilerplatePath(rel);
      expect(resolved.startsWith(BOILERPLATE_DIR)).toBe(true);
      expect(fs.existsSync(resolved), resolved).toBe(true);
    }
  });

  // Unless sync resolves a renamed file back, it reports a missing baseline for
  // a file the scaffold does ship.
  test("resolves every name the scaffold renames on copy", () => {
    for (const source of ["_gitignore", "_pnpm-workspace.yaml"]) {
      expect(resolveBoilerplatePath(consumerName(source))).toBe(
        path.join(BOILERPLATE_DIR, source),
      );
    }
  });

  test("leaves a name the scaffold copies verbatim alone", () => {
    expect(resolveBoilerplatePath("docker/nginx.conf")).toBe(
      path.join(BOILERPLATE_DIR, "docker/nginx.conf"),
    );
  });
});
