import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveSource,
  resolveDependencyValue,
  originUrl,
} from "../../../src/cli/scaffold.js";

const CTX = { version: "9.9.9", packageDir: "/abs/pkg" };

/** Root package.json version, which the production `ctx` default resolves to. */
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const REAL_VERSION = (
  JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"),
  ) as { version: string }
).version;

describe("resolveSource", () => {
  test("defaults to npm (no git credentials needed in CI)", () => {
    expect(resolveSource({})).toBe("npm");
  });

  test("--dev is a shortcut for file", () => {
    expect(resolveSource({ dev: true })).toBe("file");
  });

  test("explicit --source wins over --dev", () => {
    expect(resolveSource({ dev: true, source: "git" })).toBe("git");
  });
});

describe("resolveDependencyValue", () => {
  // The default has to be npm: a git+ssh GitHub URL is unfetchable from GitLab CI.
  test("npm default resolves to the published version", () => {
    expect(resolveDependencyValue({}, "/tmp/proj", CTX)).toBe("9.9.9");
  });

  // Covers the real ctx default (packageVersion()/PACKAGE_DIR); every other test injects CTX.
  test("production default arm reads the real package version (no injected ctx)", () => {
    expect(resolveDependencyValue({}, "/tmp/proj")).toBe(REAL_VERSION);
    expect(REAL_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("git source pins to the version tag by default", () => {
    expect(resolveDependencyValue({ source: "git" }, "/tmp/proj", CTX)).toBe(
      "git+ssh://git@github.com/techfides/tf-doc-vault.git#v9.9.9",
    );
  });

  test("git source honors an explicit --ref and --git-url", () => {
    expect(
      resolveDependencyValue(
        { source: "git", ref: "main", "git-url": "git+https://example/x.git" },
        "/tmp/proj",
        CTX,
      ),
    ).toBe("git+https://example/x.git#main");
  });

  test("file source (--dev) points at the package via a relative path", () => {
    const target = "/tmp/proj";
    expect(resolveDependencyValue({ dev: true }, target, CTX)).toBe(
      `file:${path.relative(target, CTX.packageDir)}`,
    );
  });

  test("file source honors an explicit --file-path", () => {
    expect(
      resolveDependencyValue(
        { source: "file", "file-path": "../local" },
        "/tmp/proj",
        CTX,
      ),
    ).toBe("file:../local");
  });
});

describe("originUrl", () => {
  // The epilogue must print the GitLab origin; no git@github.com path exists.
  test("points at the GitLab analysis group, not GitHub", () => {
    expect(originUrl("lapa_ana")).toBe(
      "git@gitlab.com:techfides/tf-analysis/lapa_ana.git",
    );
  });
});
