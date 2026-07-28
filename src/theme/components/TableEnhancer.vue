<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from "vue";
import { useData, useRouter } from "vitepress";
import { useI18n } from "vue-i18n";
import {
  detectColumnType,
  compareCells,
  getDecimalSeparator,
  type SortDirection,
} from "./tableSort.js";

const { lang } = useData();
const { t } = useI18n();
const router = useRouter();

// Decimal separator for the site locale, so numeric columns parse per locale
// (cs uses "," as the decimal point, en uses ".").
const decimal = getDecimalSeparator(lang.value || undefined);

// Authored row order per <tbody>, captured before the first sort so a third
// click can restore it. rowText caches each row's normalised text so live
// filtering doesn't re-normalise on every keystroke.
const originalOrder = new WeakMap<
  HTMLTableSectionElement,
  HTMLTableRowElement[]
>();
const shadowWired = new WeakSet<HTMLElement>();
const filterWired = new WeakSet<HTMLElement>();
const rowText = new WeakMap<HTMLTableRowElement, string>();

// Data rows only, skipping the injected "no results" row.
function dataRows(tbody: HTMLTableSectionElement): HTMLTableRowElement[] {
  return [...tbody.rows].filter((r) => !r.classList.contains("tf-no-results"));
}

// Case- and diacritics-insensitive normalisation for filter matching.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Stripe every 2nd visible row with a class rather than CSS nth-child: after a
// sort or filter the visible set changes and nth-child cannot retrack it
// (parity shift plus buggy hidden-row invalidation).
function restripe(tbody: HTMLTableSectionElement): void {
  let visible = 0;
  for (const row of dataRows(tbody)) {
    row.classList.add("tf-row");
    if (row.hidden) {
      row.classList.remove("tf-stripe");
      continue;
    }
    visible += 1;
    row.classList.toggle("tf-stripe", visible % 2 === 0);
  }
}

// ─── click-to-sort ───────────────────────────────────────────────────────────

function headerFromEvent(target: HTMLElement): HTMLTableCellElement | null {
  // Clicks on links inside a header cell should navigate, not sort.
  if (target.closest("a")) return null;
  const th = target.closest<HTMLTableCellElement>(".vp-doc thead th");
  if (!th || !th.closest("table")?.tBodies.length) return null;
  return th;
}

type NextSort = SortDirection | "none";

// Cycle: unsorted → ascending → descending → back to authored order.
function nextDirection(current: string | null): NextSort {
  if (current === "ascending") return "descending";
  if (current === "descending") return "none";
  return "ascending";
}

function sortByHeader(th: HTMLTableCellElement): void {
  const table = th.closest("table");
  const tbody = table?.tBodies[0];
  const headRow = th.parentElement as HTMLTableRowElement | null;
  if (!table || !tbody || !headRow) return;

  const rows = dataRows(tbody);
  if (rows.length < 2) return;

  // Capture a copy of the authored order once so "none" can restore it; the
  // sort below mutates `rows` in place.
  if (!originalOrder.has(tbody)) originalOrder.set(tbody, [...rows]);

  const direction = nextDirection(th.getAttribute("aria-sort"));
  for (const cell of headRow.cells) cell.removeAttribute("aria-sort");

  if (direction === "none") {
    for (const row of originalOrder.get(tbody)!) tbody.appendChild(row);
    restripe(tbody);
    return;
  }

  const colIndex = th.cellIndex;
  const cellText = (row: HTMLTableRowElement): string =>
    row.cells[colIndex]?.textContent?.trim() ?? "";
  const type = detectColumnType(rows.map(cellText), decimal);
  const collator = new Intl.Collator(lang.value || undefined, {
    numeric: true,
    sensitivity: "base",
  });

  // Array.prototype.sort is stable, so equal rows keep their relative order.
  rows.sort((a, b) =>
    compareCells(cellText(a), cellText(b), type, direction, collator, decimal),
  );
  for (const row of rows) tbody.appendChild(row);
  restripe(tbody);
  th.setAttribute("aria-sort", direction);
}

function onClick(e: MouseEvent): void {
  const th = headerFromEvent(e.target as HTMLElement);
  if (th) sortByHeader(th);
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key !== "Enter" && e.key !== " ") return;
  const th = headerFromEvent(e.target as HTMLElement);
  if (!th) return;
  e.preventDefault();
  sortByHeader(th);
}

// ─── per-render decoration ───────────────────────────────────────────────────

// Right-align auto-detected numeric columns, unless the author aligned them
// explicitly in Markdown (`:---:`), in which case leave them alone.
function alignNumericColumns(table: HTMLTableElement): void {
  const head = table.tHead?.rows[0];
  const body = table.tBodies[0];
  if (!head || !body) return;
  const rows = dataRows(body);

  for (let c = 0; c < head.cells.length; c++) {
    const th = head.cells[c];
    const cells = rows
      .map((r) => r.cells[c])
      .filter((cell): cell is HTMLTableCellElement => cell != null);
    if (th?.style.textAlign || cells.some((cell) => cell.style.textAlign)) {
      continue;
    }
    const values = cells.map((cell) => cell.textContent?.trim() ?? "");
    if (detectColumnType(values, decimal) !== "number") continue;
    th?.classList.add("tf-col-num");
    for (const cell of cells) cell.classList.add("tf-col-num");
  }
}

const FILTER_MIN_ROWS = 15;

// Filter box above the table plus a hidden "no results" row, once per table.
function injectFilter(outer: HTMLElement, table: HTMLTableElement): void {
  if (filterWired.has(outer)) return;
  const tbody = table.tBodies[0];
  if (!tbody || dataRows(tbody).length <= FILTER_MIN_ROWS) return;
  filterWired.add(outer);

  const toolbar = document.createElement("div");
  toolbar.className = "tf-table-toolbar";
  const input = document.createElement("input");
  input.type = "search";
  input.className = "tf-table-filter";
  input.placeholder = t("table.filter");
  input.setAttribute("aria-label", t("table.filter"));
  // Debounce so fast typing doesn't re-scan every row on each keystroke.
  let debounce: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => filterTable(table, input.value), 120);
  });
  toolbar.appendChild(input);
  outer.insertBefore(toolbar, outer.firstChild);

  // `tf-row` keeps the message row's background transparent (no zebra) even
  // though restripe ignores it.
  const tr = document.createElement("tr");
  tr.className = "tf-no-results tf-row";
  tr.hidden = true;
  const td = document.createElement("td");
  td.colSpan = table.tHead?.rows[0]?.cells.length ?? 1;
  td.textContent = t("table.noResults");
  tr.appendChild(td);
  tbody.appendChild(tr);
}

// Hide rows that don't contain the query in any cell; toggle "no results".
function filterTable(table: HTMLTableElement, query: string): void {
  const tbody = table.tBodies[0];
  if (!tbody) return;
  const q = normalize(query.trim());
  let anyVisible = false;
  for (const row of dataRows(tbody)) {
    let text = rowText.get(row);
    if (text === undefined) {
      text = normalize(row.textContent ?? "");
      rowText.set(row, text);
    }
    const match = q === "" || text.includes(q);
    row.hidden = !match;
    if (match) anyVisible = true;
  }
  const noResults = tbody.querySelector<HTMLTableRowElement>(".tf-no-results");
  if (noResults) noResults.hidden = anyVisible || q === "";
  restripe(tbody);
}

// Toggle edge-shadow classes based on how far the table is scrolled.
function updateShadows(outer: HTMLElement, scroller: HTMLElement): void {
  const overflowing = scroller.scrollWidth - scroller.clientWidth > 1;
  const atStart = scroller.scrollLeft <= 1;
  const atEnd =
    scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
  outer.classList.toggle("is-overflow-start", overflowing && !atStart);
  outer.classList.toggle("is-overflow-end", overflowing && !atEnd);
}

function enhanceTables(): void {
  // Header cells become keyboard-focusable so sorting works without a mouse.
  for (const th of document.querySelectorAll<HTMLTableCellElement>(
    ".vp-doc thead th",
  )) {
    if (!th.hasAttribute("tabindex")) th.setAttribute("tabindex", "0");
  }

  for (const outer of document.querySelectorAll<HTMLElement>(
    ".vp-doc .tf-table",
  )) {
    const scroller = outer.querySelector<HTMLElement>(".tf-table-scroll");
    const table = outer.querySelector("table");
    if (!scroller || !table) continue;

    injectFilter(outer, table);
    alignNumericColumns(table);
    if (table.tBodies[0]) restripe(table.tBodies[0]);

    if (!shadowWired.has(scroller)) {
      shadowWired.add(scroller);
      scroller.addEventListener(
        "scroll",
        () => updateShadows(outer, scroller),
        { passive: true },
      );
    }
    updateShadows(outer, scroller);
  }
}

function onResize(): void {
  for (const outer of document.querySelectorAll<HTMLElement>(
    ".vp-doc .tf-table",
  )) {
    const scroller = outer.querySelector<HTMLElement>(".tf-table-scroll");
    if (scroller) updateShadows(outer, scroller);
  }
}

// ─── lifecycle ───────────────────────────────────────────────────────────────

const prevAfterRouteChanged = router.onAfterRouteChanged;

onMounted(() => {
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onResize, { passive: true });
  void nextTick(enhanceTables);
  router.onAfterRouteChanged = (to): void => {
    prevAfterRouteChanged?.(to);
    void nextTick(enhanceTables);
  };
});

onUnmounted(() => {
  document.removeEventListener("click", onClick);
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", onResize);
  router.onAfterRouteChanged = prevAfterRouteChanged;
});
</script>

<template>
  <!-- Behaviour only: the script enhances .vp-doc tables in place. -->
</template>
