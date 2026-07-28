/**
 * Pure sorting logic for data tables, kept out of TableEnhancer.vue's DOM wiring
 * so it can be unit-tested. A column whose non-empty cells all parse as numbers
 * sorts numerically, everything else as text; ISO dates need no special case
 * because lexicographic order is already chronological. Number parsing follows
 * the site locale's decimal separator (`.` in en, `,` in cs).
 */

export type ColumnType = "number" | "text";
export type SortDirection = "ascending" | "descending";

export function getDecimalSeparator(locale?: string): string {
  const part = new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((p) => p.type === "decimal");
  return part?.value ?? ".";
}

/**
 * Parse a cell into a number, or null. Tolerates a trailing `%`, group
 * separators and whitespace, so `99.95%`, `1,000` (en) and `1 000,5` (cs) all
 * sort numerically. Whichever of `.`/`,` is not `decimal` counts as grouping.
 */
export function parseNumber(raw: string, decimal: string = "."): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (decimal === ",") {
    // cs-style: `.`/space group thousands, `,` is the decimal point.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // en-style: `,` groups thousands, `.` is the decimal point.
    s = s.replace(/,/g, "");
  }
  if (s === "" || !/^[+-]?(\d+\.?\d*|\.\d+)%?$/.test(s)) return null;
  return parseFloat(s);
}

/** A column is numeric only if every non-empty cell parses as a number. */
export function detectColumnType(
  values: readonly string[],
  decimal: string = ".",
): ColumnType {
  const nonEmpty = values.filter((v) => v.trim() !== "");
  if (nonEmpty.length === 0) return "text";
  return nonEmpty.every((v) => parseNumber(v, decimal) !== null)
    ? "number"
    : "text";
}

/** Empty cells always sort last, regardless of direction. */
export function compareCells(
  a: string,
  b: string,
  type: ColumnType,
  direction: SortDirection,
  collator: Intl.Collator,
  decimal: string = ".",
): number {
  const emptyA = a.trim() === "";
  const emptyB = b.trim() === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  const result =
    type === "number"
      ? parseNumber(a, decimal)! - parseNumber(b, decimal)!
      : collator.compare(a, b);
  return direction === "descending" ? -result : result;
}
