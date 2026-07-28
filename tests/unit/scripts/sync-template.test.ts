import { describe, test, expect } from "vitest";
import fs from "node:fs";
import {
  BOILERPLATE_DIR,
  TRACKED_FILES,
  boilerplateNameFor,
  resolveBoilerplatePath,
} from "../../../src/scripts/sync-template.js";

describe("boilerplateNameFor", () => {
  // `npm pack` strips these dotfiles, so the baseline ships them prefixed.
  test("maps the dotfiles the package cannot ship", () => {
    expect(boilerplateNameFor(".gitignore")).toBe("_gitignore");
    expect(boilerplateNameFor(".npmrc")).toBe("_npmrc");
    expect(boilerplateNameFor("Dockerfile")).toBe("Dockerfile");
  });
});

describe("tracked files", () => {
  // A tracked file without a counterpart makes every sync run fail, so the
  // mapping is asserted here instead of only in the smoke suite.
  test.each(TRACKED_FILES)("%s resolves inside the boilerplate", (rel) => {
    const resolved = resolveBoilerplatePath(rel);
    expect(resolved.startsWith(BOILERPLATE_DIR)).toBe(true);
    expect(fs.existsSync(resolved), resolved).toBe(true);
  });
});
