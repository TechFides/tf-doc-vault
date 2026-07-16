import { describe, test, expect } from "vitest";
import {
  parseNumber,
  detectColumnType,
  compareCells,
  getDecimalSeparator,
} from "../../../src/theme/components/tableSort.js";

const collator = new Intl.Collator("cs", {
  numeric: true,
  sensitivity: "base",
});

function sort(
  values: string[],
  direction: "ascending" | "descending",
): string[] {
  const type = detectColumnType(values);
  return [...values].sort((a, b) =>
    compareCells(a, b, type, direction, collator),
  );
}

describe("parseNumber", () => {
  test("parses plain numbers, percentages and thousands separators", () => {
    expect(parseNumber("42")).toBe(42);
    expect(parseNumber("3.14")).toBe(3.14);
    expect(parseNumber("-5")).toBe(-5);
    expect(parseNumber("99.95%")).toBe(99.95);
    expect(parseNumber("1,000")).toBe(1000);
  });

  test("rejects non-numbers", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("v0.2.9")).toBeNull();
    expect(parseNumber("2026-07-15")).toBeNull();
    expect(parseNumber("Node 24")).toBeNull();
  });

  test("respects a comma decimal separator (cs locale)", () => {
    expect(parseNumber("1,5", ",")).toBe(1.5);
    expect(parseNumber("99,95 %", ",")).toBe(99.95);
    expect(parseNumber("1 000,50", ",")).toBe(1000.5);
    expect(parseNumber("1.000", ",")).toBe(1000); // dot groups thousands in cs
  });
});

describe("getDecimalSeparator", () => {
  test("resolves the locale's decimal separator", () => {
    expect(getDecimalSeparator("en")).toBe(".");
    expect(getDecimalSeparator("cs")).toBe(",");
  });
});

describe("locale-aware sorting", () => {
  const csCollator = new Intl.Collator("cs", {
    numeric: true,
    sensitivity: "base",
  });
  test("cs decimals detect as numeric and sort by magnitude", () => {
    const values = ["1,5", "10,2", "2,3"];
    expect(detectColumnType(values, ",")).toBe("number");
    const sorted = [...values].sort((a, b) =>
      compareCells(a, b, "number", "ascending", csCollator, ","),
    );
    expect(sorted).toEqual(["1,5", "2,3", "10,2"]);
  });
});

describe("detectColumnType", () => {
  test("numeric when every non-empty cell is a number", () => {
    expect(detectColumnType(["1", "2", "10"])).toBe("number");
    expect(detectColumnType(["99.9%", "", "100%"])).toBe("number");
  });

  test("text when any cell is non-numeric", () => {
    expect(detectColumnType(["1", "2", "N/A"])).toBe("text");
    expect(detectColumnType(["FR-001", "FR-002"])).toBe("text");
    expect(detectColumnType([])).toBe("text");
  });
});

describe("compareCells / sorting", () => {
  test("numbers sort numerically, not lexically", () => {
    expect(sort(["10", "2", "1"], "ascending")).toEqual(["1", "2", "10"]);
    expect(sort(["10", "2", "1"], "descending")).toEqual(["10", "2", "1"]);
  });

  test("percentages sort numerically", () => {
    expect(sort(["100%", "99.95%", "99.0%"], "ascending")).toEqual([
      "99.0%",
      "99.95%",
      "100%",
    ]);
  });

  test("ISO dates sort chronologically as text", () => {
    expect(
      sort(["2026-07-15", "2026-04-10", "2026-07-01"], "ascending"),
    ).toEqual(["2026-04-10", "2026-07-01", "2026-07-15"]);
  });

  test("text sorts case-insensitively with natural number ordering", () => {
    expect(sort(["item10", "item2", "Item1"], "ascending")).toEqual([
      "Item1",
      "item2",
      "item10",
    ]);
  });

  test("empty cells sort last in both directions", () => {
    expect(sort(["3", "", "1"], "ascending")).toEqual(["1", "3", ""]);
    expect(sort(["3", "", "1"], "descending")).toEqual(["3", "1", ""]);
  });
});
