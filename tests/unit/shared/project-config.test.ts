import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isVersioned,
  readProjectConfig,
} from "../../../src/shared/project-config.js";

let projectRoot: string;
let docsRoot: string;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "project-config-"));
  docsRoot = path.join(projectRoot, "docs");
  fs.mkdirSync(docsRoot);
});
afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function writeConfig(body: string): void {
  fs.writeFileSync(path.join(projectRoot, "tf-doc-vault.json"), body);
}

describe("readProjectConfig", () => {
  test("a missing file reads as an empty config", () => {
    expect(readProjectConfig(projectRoot)).toEqual({});
  });

  test("a file that does not parse throws and names the file", () => {
    writeConfig("{ versioned: false");
    expect(() => readProjectConfig(projectRoot)).toThrow(
      /^tf-doc-vault\.json could not be read: /,
    );
  });

  test("a JSON value that is not an object throws", () => {
    writeConfig("[]");
    expect(() => readProjectConfig(projectRoot)).toThrow(
      "expected a JSON object",
    );
  });
});

describe("isVersioned", () => {
  test("defaults to the versioned layout without a file", () => {
    expect(isVersioned(docsRoot)).toBe(true);
  });

  test("defaults to the versioned layout when the key is absent", () => {
    writeConfig(JSON.stringify({ pdf: { mark: "X" } }));
    expect(isVersioned(docsRoot)).toBe(true);
  });

  test("reads versioned: false from the docs root's parent", () => {
    writeConfig(JSON.stringify({ versioned: false }));
    expect(isVersioned(docsRoot)).toBe(false);
  });

  test("rejects a value that is not a boolean", () => {
    writeConfig(JSON.stringify({ versioned: "false" }));
    expect(() => isVersioned(docsRoot)).toThrow(
      '"versioned" must be true or false, got "false"',
    );
  });
});

describe("readProjectConfig keys", () => {
  test("warns about an unknown top-level key, names it and keeps going", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    writeConfig(JSON.stringify({ $schema: "./s.json", Versioned: false }));
    expect(readProjectConfig(projectRoot)).toEqual({
      $schema: "./s.json",
      Versioned: false,
    });
    expect(warn).toHaveBeenCalledWith(
      '⚠ tf-doc-vault.json: unknown key "$schema" (expected one of: pdf, versioned)',
    );
    expect(warn).toHaveBeenCalledWith(
      '⚠ tf-doc-vault.json: unknown key "Versioned" (expected one of: pdf, versioned)',
    );
    warn.mockRestore();
  });

  test("documented keys produce no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    writeConfig(JSON.stringify({ pdf: {}, versioned: true }));
    readProjectConfig(projectRoot);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test("accepts the documented keys", () => {
    writeConfig(JSON.stringify({ pdf: { mark: "X" }, versioned: false }));
    expect(readProjectConfig(projectRoot)).toEqual({
      pdf: { mark: "X" },
      versioned: false,
    });
  });
});
