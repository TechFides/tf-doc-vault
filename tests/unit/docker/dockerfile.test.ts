import { describe, test, expect } from "vitest";
import path from "node:path";
import { readText } from "../../../src/shared/text-file.js";

const DOCKERFILE = path.resolve(__dirname, "../../../docker/Dockerfile");

describe("docker/Dockerfile", () => {
  test("copies tf-doc-vault.json before docs:print and docs:build read it", () => {
    const lines = readText(DOCKERFILE).split("\n");
    const copy = lines.findIndex((l) =>
      /^COPY\s.*\btf-doc-vault\.json\*?\s/.test(l),
    );
    const build = lines.findIndex((l) => l.includes("docs:print"));

    expect(copy).toBeGreaterThan(-1);
    expect(copy).toBeLessThan(build);
  });
});
