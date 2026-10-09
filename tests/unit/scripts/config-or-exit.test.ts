import { describe, test, expect, vi, afterEach } from "vitest";
import { configOrExit } from "../../../src/scripts/config-or-exit.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function stubExit(): {
  exit: ReturnType<typeof vi.spyOn>;
  error: ReturnType<typeof vi.spyOn>;
} {
  const exit = vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit");
  });
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  return { exit, error };
}

describe("configOrExit", () => {
  test("returns what the reader returns", () => {
    expect(configOrExit(() => 42)).toBe(42);
  });

  test("prints the error message with a ✗ marker and exits 1", () => {
    const { exit, error } = stubExit();
    expect(() =>
      configOrExit(() => {
        throw new Error("tf-doc-vault.json could not be read: nope");
      }),
    ).toThrow("process.exit");
    expect(error).toHaveBeenCalledWith(
      "✗ tf-doc-vault.json could not be read: nope",
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  test("stringifies a thrown value that is not an Error", () => {
    const { error } = stubExit();
    expect(() =>
      configOrExit(() => {
        throw "plain string";
      }),
    ).toThrow("process.exit");
    expect(error).toHaveBeenCalledWith("✗ plain string");
  });
});
