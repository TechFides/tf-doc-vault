/**
 * Pure sorting logic for data tables, kept separate from the DOM wiring in
 * TableEnhancer.vue so it can be unit-tested. The column type is auto-detected:
 * a column whose non-empty cells all parse as numbers sorts numerically,
 * everything else sorts as text (ISO dates included — lexicographic order is
 * chronological, so no separate date handling is needed).
 *
 * Number parsing is locale-aware via the `decimal` separator: in `en` a comma
 * groups thousands and a dot is the decimal point; in `cs` (and most of
 * Europe) it's the reverse. Callers pass the separator resolved from the site
 * locale (see `getDecimalSeparator`).
 */

export type ColumnType = "number" | "text";
export type SortDirection = "ascending" | "descending";

/** The decimal separator for a locale (e.g. "." for en, "," for cs). */
export function getDecimalSeparator(locale?: string): string {
  const part = new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((p) => p.type === "decimal");
  return part?.value ?? ".";
}

/**
 * Parse a cell into a number, or null if it isn't one. Tolerates a trailing
 * `%`, group separators and surrounding whitespace so columns like `99.95%`,
 * `1,000` (en) or `1 000,5` (cs) still sort numerically. `decimal` is the
 * locale's decimal separator; the other of `.`/`,` is treated as grouping.
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

/**
 * Compare two cell values for the given column type and direction. Empty cells
 * always sort last, regardless of direction.
 */
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
