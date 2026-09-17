# Řazení sidebaru přes `order`: implementační plán

> **Pro agenty:** plán se vykonává přes `superpowers:subagent-driven-development`.
> Kroky jsou zaškrtávací (`- [ ]`). Zadání je `specs/frontmatter-order-sorting.md`,
> tenhle dokument je jeho rozpad na commity.

**Cíl:** `order` ve frontmatteru se stane skutečným řadicím klíčem sidebaru, nav
a print stránky, povinným polem hlídaným lintem, které `normalize` umí doplnit
do existujícího stromu beze změny vykresleného pořadí.

**Architektura:** dva nové interní moduly v `src/shared/` drží jednu definici
pořadí; sidebar, print skript a lint je konzumují místo vlastních `sort` a
vlastních parserů frontmatteru. Publikované API se nemění.

**Stack:** TypeScript 6 (strict, `noUncheckedIndexedAccess`, NodeNext, ESM),
Node >= 24, pnpm 11.1.3, Vitest, Playwright.

## Globální omezení

- Žádná nová npm závislost. Ruční parsování frontmatteru zůstává, `gray-matter` se nezavádí.
- `src/**` nesmí nikde zmínit název konkrétní šablony (`ana-docs`, `tech-docs`).
- Nikdy needitovat `dist/`, generuje ho `pnpm build`.
- Komentáře anglicky a jen tam, kde čtenář nemůže věc vyčíst z kódu. Bez pomlčky `—` v textu.
- Publikované signatury `generateNav`, `generateSidebar`, `getVersions` se nemění.
- Commit messages: Conventional Commits, anglicky, bez `Refs:` footeru, bez jakékoli
  zmínky o Claude nebo Anthropic.
- Před prvním commitem v čerstvém worktree spustit `pnpm install`, jinak lefthook
  neproběhne. Nikdy neobcházet přes `LEFTHOOK=0`.
- Testy skriptů spouštějí `dist/scripts/*.js` jako subproces, takže před `pnpm test:unit`
  musí proběhnout `pnpm build`.
- Brána každého celku: `pnpm build && pnpm lint && pnpm typecheck && pnpm knip && pnpm test:unit`.
  Smoke testy se pouští až v závěrečné integraci.

## Vlny a modely

Celek 1 je blokující, protože definuje kontrakty. Celky 2 až 6 na sobě nezávisí,
nesdílí jediný soubor a jedou paralelně, každý ve vlastním git worktree založeném
nad commitem celku 1. Celek 7 potřebuje hotové celky 3 a 4.

| vlna | celek                         | soubory                                                    | model     | proč ten model                                                                          |
| ---- | ----------------------------- | ---------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| 1    | 1. Sdílené jádro a sidebar    | `src/shared/*`, `src/sidebar/index.ts`                     | Opus      | definuje kontrakt pro všechny ostatní, pět volajících míst, rozdělení „verze se neřadí" |
| 2    | 2. Print stránka              | `src/scripts/build-print-page.ts`                          | Sonnet    | mechanická výměna tří helperů za sdílené                                                |
| 2    | 3. Lint                       | `src/scripts/validate-docs.ts`                             | Opus      | vlastnictví sourozeneckých množin, dvě výjimky, nový průchod stromem                    |
| 2    | 4. Normalize                  | `src/scripts/normalize-docs.ts`                            | Opus      | přiřazovací algoritmus a přestavba zápisové smyčky                                      |
| 2    | 5. Confluence importér        | `src/confluence/layout.ts`, `src/cli/import-confluence.ts` | Sonnet    | malá čistá funkce a její zadrátování                                                    |
| 2    | 6. Dokumentace                | markdown v `docs/`, `boilerplate/`, `AGENTS.md`            | Sonnet    | próza v domácím stylu, nulová logika                                                    |
| 3    | 7. Doplnění `order` do obsahu | `playground/docs/**`, `templates/*/docs/**`                | Haiku 4.5 | spustit příkaz, ověřit výstup, commitnout                                               |

```text
        ┌─────────────┐
        │  1. jádro   │  Opus
        └──────┬──────┘
   ┌─────┬─────┼─────┬─────┐
   │     │     │     │     │
   2     3     4     5     6      Sonnet / Opus / Opus / Sonnet / Sonnet
   │     │     │     │     │
   └─────┴──┬──┴─────┴─────┘
            │
        ┌───┴────┐
        │ 7. obsah│  Haiku 4.5
        └────────┘
```

---

## Celek 1: sdílené jádro a sidebar

**Model:** Opus. **Vlna:** 1 (blokující).

**Soubory:**

- Vytvořit: `src/shared/frontmatter.ts`
- Vytvořit: `src/shared/ordering.ts`
- Vytvořit: `tests/unit/shared/frontmatter.test.ts`
- Vytvořit: `tests/unit/shared/ordering.test.ts`
- Upravit: `src/sidebar/index.ts`
- Upravit: `tests/unit/sidebar/sidebar.test.ts`

**Rozhraní:**

- Konzumuje: nic.
- Produkuje, na tohle spoléhají celky 2 až 5:
  - `parseFrontmatter(content: string): Record<string, string> | null`
  - `readFrontmatter(filePath: string): Record<string, string> | null`
  - `readTitle(filePath: string): string`
  - `parseOrder(raw: string | undefined): number | null`
  - `sortSiblings<T extends Sibling>(dir: string, entries: T[]): T[]`, kde
    `Sibling` je `{ name: string; isDirectory(): boolean }`, což `fs.Dirent` splňuje

**Proč zrovna takhle:** `parseFrontmatter` bere řetězec, protože `validate-docs`
soubor už jednou přečetlo kvůli jiným kontrolám a druhé čtení nepotřebuje.
`readFrontmatter` je nad tím obálka pro volající, kteří mají jen cestu.
`orderOf` se nevyváží: nikdo mimo `ordering.ts` ho nepotřebuje a `knip` v CI
hlásí nepoužité exporty.

- [ ] **Krok 1: napsat padající testy sdílených modulů**

`tests/unit/shared/frontmatter.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseFrontmatter,
  readFrontmatter,
  readTitle,
  parseOrder,
} from "../../../src/shared/frontmatter.js";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "frontmatter-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(name: string, content: string): string {
  const full = path.join(dir, name);
  fs.writeFileSync(full, content);
  return full;
}

describe("parseFrontmatter", () => {
  test("reads top-level scalar fields", () => {
    expect(parseFrontmatter("---\ntitle: A\norder: 3\n---\n\nbody")).toEqual({
      title: "A",
      order: "3",
    });
  });

  test("returns null without a frontmatter block", () => {
    expect(parseFrontmatter("# Just a heading\n")).toBeNull();
  });

  test("keeps a colon inside the value", () => {
    expect(parseFrontmatter("---\ntitle: A: B\n---\n")).toEqual({
      title: "A: B",
    });
  });
});

describe("readFrontmatter", () => {
  test("returns null for a file that does not exist", () => {
    expect(readFrontmatter(path.join(dir, "nope.md"))).toBeNull();
  });
});

describe("readTitle", () => {
  test("prefers the title field", () => {
    const file = write("page.md", "---\ntitle: Nadpis\n---\n");
    expect(readTitle(file)).toBe("Nadpis");
  });

  test("falls back to the file name", () => {
    const file = write("page.md", "no frontmatter here\n");
    expect(readTitle(file)).toBe("page");
  });
});

describe("parseOrder", () => {
  test("accepts integers", () => {
    expect(parseOrder("3")).toBe(3);
    expect(parseOrder(" 12 ")).toBe(12);
    expect(parseOrder("-1")).toBe(-1);
  });

  test("rejects anything that is not an integer", () => {
    expect(parseOrder(undefined)).toBeNull();
    expect(parseOrder("")).toBeNull();
    expect(parseOrder("1.5")).toBeNull();
    expect(parseOrder("abc")).toBeNull();
  });
});
```

`tests/unit/shared/ordering.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sortSiblings } from "../../../src/shared/ordering.js";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ordering-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(rel: string, ...fields: string[]): void {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, ["---", ...fields, "---", "", ""].join("\n"));
}

/** Everything in the temp dir except its own index.md, in sorted order. */
function names(): string[] {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !(e.isFile() && e.name === "index.md"));
  return sortSiblings(dir, entries).map((e) => e.name);
}

describe("sortSiblings", () => {
  test("orders by order ascending, not by name", () => {
    write("zeta.md", "title: Z", "order: 1");
    write("alfa.md", "title: A", "order: 2");
    expect(names()).toEqual(["zeta.md", "alfa.md"]);
  });

  test("a directory takes its order from index.md", () => {
    write("zeta/index.md", "title: Z", "order: 1");
    write("alfa/index.md", "title: A", "order: 2");
    expect(names()).toEqual(["zeta", "alfa"]);
  });

  test("files and directories share one number space", () => {
    write("page.md", "title: P", "order: 2");
    write("group/index.md", "title: G", "order: 1");
    expect(names()).toEqual(["group", "page.md"]);
  });

  test("items without order go last, alphabetically", () => {
    write("beta.md", "title: B");
    write("alfa.md", "title: A");
    write("zeta.md", "title: Z", "order: 9");
    expect(names()).toEqual(["zeta.md", "alfa.md", "beta.md"]);
  });

  test("duplicate order falls back to the name", () => {
    write("beta.md", "title: B", "order: 1");
    write("alfa.md", "title: A", "order: 1");
    expect(names()).toEqual(["alfa.md", "beta.md"]);
  });

  test("an invalid order counts as missing", () => {
    write("alfa.md", "title: A", "order: abc");
    write("beta.md", "title: B", "order: 1");
    expect(names()).toEqual(["beta.md", "alfa.md"]);
  });

  test("a directory without index.md lands in the tail", () => {
    fs.mkdirSync(path.join(dir, "orphan"));
    write("page.md", "title: P", "order: 5");
    expect(names()).toEqual(["page.md", "orphan"]);
  });
});
```

- [ ] **Krok 2: ověřit, že testy padají**

```bash
pnpm test:unit -- tests/unit/shared
```

Očekávané: FAIL, `Cannot find module '../../../src/shared/frontmatter.js'`.

- [ ] **Krok 3: napsat `src/shared/frontmatter.ts`**

```ts
import fs from "node:fs";
import path from "node:path";

const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---/;
const KEY_VALUE = /^(\w+):\s*(.+)$/;
const INTEGER = /^-?\d+$/;

/** Top-level scalar fields of the YAML frontmatter block, or null when there is none. */
export function parseFrontmatter(
  content: string,
): Record<string, string> | null {
  const match = FRONTMATTER.exec(content);
  if (!match) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const kv = KEY_VALUE.exec(line.trim());
    if (kv) fields[kv[1]!] = kv[2]!.trim();
  }
  return fields;
}

/** Null also when the file is missing: the sidebar walks directories that may not hold one. */
export function readFrontmatter(
  filePath: string,
): Record<string, string> | null {
  try {
    return parseFrontmatter(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/** `title` from the frontmatter, falling back to the file name. */
export function readTitle(filePath: string): string {
  const title = readFrontmatter(filePath)?.["title"];
  return title && title.length > 0 ? title : path.basename(filePath, ".md");
}

/** An `order` value, or null when absent or not an integer. */
export function parseOrder(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = raw.trim();
  return INTEGER.test(value) ? Number(value) : null;
}
```

- [ ] **Krok 4: napsat `src/shared/ordering.ts`**

```ts
import path from "node:path";
import { readFrontmatter, parseOrder } from "./frontmatter.js";

export interface Sibling {
  name: string;
  isDirectory(): boolean;
}

/** A file's own `order`; a directory's comes from its index.md. */
function orderOf(dir: string, entry: Sibling): number | null {
  const carrier = entry.isDirectory()
    ? path.join(dir, entry.name, "index.md")
    : path.join(dir, entry.name);
  return parseOrder(readFrontmatter(carrier)?.["order"]);
}

/**
 * Items with a valid `order` first and ascending, the rest alphabetically behind
 * them. Ties fall back to the name, so a duplicate `order` still sorts
 * deterministically; the lint is what reports it.
 */
export function sortSiblings<T extends Sibling>(
  dir: string,
  entries: T[],
): T[] {
  return entries
    .map((entry) => ({ entry, order: orderOf(dir, entry) }))
    .sort((a, b) => {
      if (a.order !== null && b.order !== null && a.order !== b.order) {
        return a.order - b.order;
      }
      if (a.order !== null && b.order === null) return -1;
      if (a.order === null && b.order !== null) return 1;
      return a.entry.name.localeCompare(b.entry.name, "cs");
    })
    .map((keyed) => keyed.entry);
}
```

- [ ] **Krok 5: ověřit, že testy sdílených modulů procházejí**

```bash
pnpm test:unit -- tests/unit/shared
```

Očekávané: PASS.

- [ ] **Krok 6: napsat padající testy sidebaru**

Připojit na konec `tests/unit/sidebar/sidebar.test.ts`. Helper `fm` v tom souboru
už existuje a bere další pole jako variadické argumenty, takže `fm("A", "order: 1")`
funguje beze změny.

```ts
describe("order", () => {
  test("nav sections follow order from their index.md", () => {
    write("v1/zeta/index.md", fm("Zeta", "order: 1"));
    write("v1/alfa/index.md", fm("Alfa", "order: 2"));

    expect(generateNav(docsRoot, "v1")).toEqual([
      { text: "Zeta", link: "/v1/zeta/" },
      { text: "Alfa", link: "/v1/alfa/" },
    ]);
  });

  test("versions ignore order and stay alphabetical", () => {
    write("v2/index.md", fm("V2", "order: 1"));
    write("v1/index.md", fm("V1", "order: 2"));

    expect(getVersions(docsRoot)).toEqual(["v1", "v2"]);
  });

  test("the version index stays first against a negative order", () => {
    write("v1/index.md", fm("Přehled"));
    write("v1/page.md", fm("Stránka", "order: -10"));

    expect(generateSidebar(docsRoot, { unified: true })["/v1/"]).toEqual([
      { text: "Přehled", link: "/v1/" },
      { text: "Stránka", link: "/v1/page" },
    ]);
  });

  test("pages and groups inside a section share one number space", () => {
    write("v1/a/index.md", fm("A", "order: 1"));
    write("v1/b/index.md", fm("B", "order: 2"));
    write("v1/a/page.md", fm("Stránka", "order: 2"));
    write("v1/a/skupina/index.md", fm("Skupina", "order: 1"));
    write("v1/a/skupina/leaf.md", fm("List", "order: 1"));

    expect(generateSidebar(docsRoot)["/v1/a/"]).toEqual([
      {
        text: "Skupina",
        link: "/v1/a/skupina/",
        collapsed: true,
        items: [{ text: "List", link: "/v1/a/skupina/leaf" }],
      },
      { text: "Stránka", link: "/v1/a/page" },
    ]);
  });

  test("items without order keep the alphabetical tail", () => {
    write("v1/index.md", fm("Přehled"));
    write("v1/beta.md", fm("Beta"));
    write("v1/alfa.md", fm("Alfa"));
    write("v1/zeta.md", fm("Zeta", "order: 1"));

    expect(generateSidebar(docsRoot, { unified: true })["/v1/"]).toEqual([
      { text: "Přehled", link: "/v1/" },
      { text: "Zeta", link: "/v1/zeta" },
      { text: "Alfa", link: "/v1/alfa" },
      { text: "Beta", link: "/v1/beta" },
    ]);
  });

  test("a tree without a single order renders as it did before", () => {
    write("v1/index.md", fm("Přehled"));
    write("v1/beta.md", fm("Beta"));
    write("v1/alfa.md", fm("Alfa"));

    expect(generateSidebar(docsRoot, { unified: true })["/v1/"]).toEqual([
      { text: "Přehled", link: "/v1/" },
      { text: "Alfa", link: "/v1/alfa" },
      { text: "Beta", link: "/v1/beta" },
    ]);
  });
});
```

- [ ] **Krok 7: ověřit, že testy sidebaru padají**

```bash
pnpm test:unit -- tests/unit/sidebar
```

Očekávané: FAIL v testech `nav sections follow order` a dalších, protože pořadí
je zatím abecední.

- [ ] **Krok 8: přepsat `src/sidebar/index.ts`**

Odstranit lokální `extractTitle` a nahradit importem. `subDirs` se rozpadá na dvě
funkce, protože `getVersions` řadit přes `order` nesmí.

```ts
import fs from "node:fs";
import path from "node:path";
import type { DefaultTheme } from "vitepress";
import { readTitle } from "../shared/frontmatter.js";
import { sortSiblings } from "../shared/ordering.js";

const IGNORE = new Set([".vitepress", "node_modules", "public"]);

function dirEntries(dir: string): fs.Dirent[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."),
    );
}

/** Non-index Markdown files, in sidebar order. */
function mdFilesIn(dir: string): string[] {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) => e.isFile() && e.name.endsWith(".md") && e.name !== "index.md",
    );
  return sortSiblings(dir, files).map((e) => e.name);
}

function subDirs(dir: string): string[] {
  return sortSiblings(dir, dirEntries(dir)).map((e) => e.name);
}

/** Each top-level directory in `docs/` is a documentation version. */
export function getVersions(docsRoot: string): string[] {
  // Alphabetical on purpose: v1, v2, v3 is already chronological, so versions
  // are the one level `order` does not govern.
  return dirEntries(docsRoot)
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "cs"));
}
```

Zbytek souboru se mění takto:

- `generateNav`: `extractTitle(indexPath)` → `readTitle(indexPath)`; ve větvi bez
  sekcí zmizí `.filter((f) => f !== "index.md")`, protože `mdFilesIn` už index
  nevrací.
- `buildSidebarItems`: `.sort((a, b) => a.name.localeCompare(b.name, "cs"))` →
  obalit celý filtrovaný seznam do `sortSiblings(dir, …)`; obě volání
  `extractTitle` → `readTitle`.
- `generateSidebar`: obě volání `extractTitle` → `readTitle`; ve smyčce přes
  `mdFilesIn(versionRoot)` zmizí `if (file === "index.md") continue;`.

Konkrétně `buildSidebarItems` začne takto:

```ts
function buildSidebarItems(
  dir: string,
  urlBase: string,
): DefaultTheme.SidebarItem[] {
  const entries = sortSiblings(
    dir,
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(
        (e) =>
          (e.isFile() && e.name.endsWith(".md") && e.name !== "index.md") ||
          (e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith(".")),
      ),
  );
```

- [ ] **Krok 9: ověřit, že celá jednotková sada prochází**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm knip && pnpm test:unit
```

Očekávané: vše zelené. `knip` musí být čistý; každý export z `src/shared/` má
v tomhle commitu svého konzumenta, takže nic nehlásí.

- [ ] **Krok 10: commit**

```bash
git add src/shared src/sidebar/index.ts tests/unit/shared tests/unit/sidebar
git commit -m "feat(sidebar): sort nav and sidebar by frontmatter order"
```

---

## Celek 2: print stránka

**Model:** Sonnet. **Vlna:** 2, paralelně s celky 3 až 6.

**Soubory:**

- Upravit: `src/scripts/build-print-page.ts`
- Vytvořit: `tests/unit/scripts/build-print-page.test.ts`

**Rozhraní:**

- Konzumuje z celku 1: `readTitle(filePath)`, `sortSiblings(dir, entries)`.
- Produkuje: nic pro další celky.

**Kontext:** skript má vlastní kopie `subDirs`, `mdFilesIn` a `extractTitle`
(`src/scripts/build-print-page.ts:22-54`) a v hlavičce tvrdí, že řadí obsah
v pořadí sidebaru. Bez téhle změny se print stránka a z ní generované PDF
rozejdou s webem. `collectPages` čte přesně dvě úrovně: sekce a skupinu.

- [ ] **Krok 1: napsat padající test**

`tests/unit/scripts/build-print-page.test.ts`:

```ts
import { describe, test, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(REPO_ROOT, "dist/scripts/build-print-page.js");

let workdirs: string[] = [];

/**
 * build-print-page is a CLI script with docs/ hardcoded relative to the cwd, so
 * each test builds its own temp tree and runs it as a subprocess.
 */
function runPrint(files: Record<string, string>): string {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"));
  workdirs.push(workdir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(workdir, "docs", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  spawnSync("node", [SCRIPT], { cwd: workdir, encoding: "utf-8" });
  return fs.readFileSync(path.join(workdir, "docs", "print.md"), "utf-8");
}

afterEach(() => {
  for (const dir of workdirs) fs.rmSync(dir, { recursive: true, force: true });
  workdirs = [];
});

function page(title: string, order: number, body: string): string {
  return `---\ntitle: ${title}\norder: ${order}\n---\n\n${body}\n`;
}

describe("build-print-page", () => {
  test("emits pages in order, not alphabetically", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/skupina/index.md": page("Skupina", 1, "skupina"),
      "v1/sekce/skupina/zeta.md": page("Zeta", 1, "obsah zeta"),
      "v1/sekce/skupina/alfa.md": page("Alfa", 2, "obsah alfa"),
    });

    expect(out.indexOf("obsah zeta")).toBeLessThan(out.indexOf("obsah alfa"));
  });

  test("sections and groups follow order from their index.md", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/zeta/index.md": page("Zeta", 1, "z"),
      "v1/zeta/g/index.md": page("G", 1, "g"),
      "v1/zeta/g/p.md": page("P", 1, "ze zety"),
      "v1/alfa/index.md": page("Alfa", 2, "a"),
      "v1/alfa/g/index.md": page("G", 1, "g"),
      "v1/alfa/g/p.md": page("P", 1, "z alfy"),
    });

    expect(out.indexOf("ze zety")).toBeLessThan(out.indexOf("z alfy"));
  });
});
```

- [ ] **Krok 2: ověřit, že test padá**

```bash
pnpm build && pnpm test:unit -- tests/unit/scripts/build-print-page
```

Očekávané: FAIL, `obsah alfa` je v souboru dřív než `obsah zeta`.

- [ ] **Krok 3: nahradit lokální helpery sdílenými**

V `src/scripts/build-print-page.ts` smazat funkce `subDirs`, `mdFilesIn`
a `extractTitle` a doplnit importy:

```ts
import { readTitle } from "../shared/frontmatter.js";
import { sortSiblings } from "../shared/ordering.js";
```

Nové znění obou průchodů:

```ts
function subDirs(dir: string): string[] {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."),
    );
  return sortSiblings(dir, entries).map((e) => e.name);
}

/** Non-index Markdown files, in sidebar order. */
function mdFilesIn(dir: string): string[] {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) => e.isFile() && e.name.endsWith(".md") && e.name !== "index.md",
    );
  return sortSiblings(dir, files).map((e) => e.name);
}
```

V `collectPages` zmizí `.filter((f) => f !== "index.md")`, protože `mdFilesIn`
už index nevrací, a `extractTitle(filePath)` se změní na `readTitle(filePath)`.

- [ ] **Krok 4: ověřit, že test prochází**

```bash
pnpm build && pnpm test:unit -- tests/unit/scripts/build-print-page
```

Očekávané: PASS.

- [ ] **Krok 5: brána a commit**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm knip && pnpm test:unit
git add src/scripts/build-print-page.ts tests/unit/scripts/build-print-page.test.ts
git commit -m "fix(print): follow frontmatter order in the print page"
```

---

## Celek 3: lint

**Model:** Opus. **Vlna:** 2, paralelně s celky 2, 4, 5, 6.

**Soubory:**

- Upravit: `src/scripts/validate-docs.ts`
- Upravit: `tests/unit/scripts/validate-docs.test.ts`

**Rozhraní:**

- Konzumuje z celku 1: `parseFrontmatter(content)`, `parseOrder(raw)`.
- Produkuje: nic pro další celky. Celek 7 na výstupu tohoto lintu ověřuje svou práci.

**Kontext:** `validate-docs.ts` má vlastní `parseFrontmatter`, který se v tomhle
celku nahrazuje sdíleným. Dokud by měl lint svůj parser a generátor svůj, mohl by
lint schválit hodnotu, kterou sidebar ignoruje.

- [ ] **Krok 1: napsat padající testy**

Připojit na konec `tests/unit/scripts/validate-docs.test.ts`. Helper `runValidate`
a konstanta `FRONTMATTER` v souboru už existují; `FRONTMATTER` je pole řádků bez
`order`, takže se hodí jako „soubor, kterému order chybí".

```ts
describe("Order", () => {
  const ok = (title: string, order: number): string =>
    [
      "---",
      `title: ${title}`,
      "status: published",
      "updated_at: 2026-01-01",
      `order: ${order}`,
      "---",
      "",
      "# " + title,
      "",
    ].join("\n");

  test("both roots are exempt, everything else needs order", () => {
    const { exitCode, stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": ok("Stránka", 1),
    });

    expect(stdout).toContain("✓ Order");
    expect(exitCode).toBe(0);
  });

  test("a missing order is an error", () => {
    const { exitCode, stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": [...FRONTMATTER, "", "# Stránka", ""].join("\n"),
    });

    expect(stdout).toContain("v1/page.md: missing required field: order");
    expect(exitCode).toBe(1);
  });

  test("a section index needs order", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/sekce/index.md": [...FRONTMATTER, "", "# Sekce", ""].join("\n"),
      "v1/sekce/page.md": ok("Stránka", 1),
    });

    expect(stdout).toContain(
      "v1/sekce/index.md: missing required field: order",
    );
  });

  test("a non-integer order is an error", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": [...FRONTMATTER, "order: abc", "", "# Stránka", ""].join(
        "\n",
      ),
    });

    expect(stdout).toContain('v1/page.md: invalid order: "abc"');
  });

  test("a duplicate order names both files", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/alfa.md": ok("Alfa", 2),
      "v1/beta.md": ok("Beta", 2),
    });

    expect(stdout).toContain("duplicate order 2");
    expect(stdout).toContain("v1/alfa.md");
    expect(stdout).toContain("v1/beta.md");
  });

  test("a page and a group may not share a number", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/page.md": ok("Stránka", 1),
      "v1/skupina/index.md": ok("Skupina", 1),
      "v1/skupina/leaf.md": ok("List", 1),
    });

    expect(stdout).toContain("duplicate order 1");
  });

  test("the same number in different folders is fine", () => {
    const { exitCode } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/index.md": [...FRONTMATTER, "", "# V1", ""].join("\n"),
      "v1/a/index.md": ok("A", 1),
      "v1/a/page.md": ok("Stránka A", 1),
      "v1/b/index.md": ok("B", 2),
      "v1/b/page.md": ok("Stránka B", 1),
    });

    expect(exitCode).toBe(0);
  });

  test("a directory without index.md is an error, a version directory is not", () => {
    const { stdout } = runValidate({
      "index.md": [...FRONTMATTER, "", "# Root", ""].join("\n"),
      "v1/sekce/index.md": ok("Sekce", 1),
      "v1/sekce/sirotek/page.md": ok("Stránka", 1),
    });

    expect(stdout).toContain("v1/sekce/sirotek: directory has no index.md");
    expect(stdout).not.toContain("v1: directory has no index.md");
  });
});
```

- [ ] **Krok 2: ověřit, že testy padají**

```bash
pnpm build && pnpm test:unit -- tests/unit/scripts/validate-docs
```

Očekávané: FAIL, ve výstupu chybí skupina `Order`.

- [ ] **Krok 3: nahradit lokální parser sdíleným**

Smazat funkci `parseFrontmatter` z `src/scripts/validate-docs.ts` a doplnit:

```ts
import { parseFrontmatter, parseOrder } from "../shared/frontmatter.js";
```

Zároveň doplnit sadu ignorovaných složek, kterou soubor zatím nemá:

```ts
const IGNORE = new Set([".vitepress", "node_modules", "public"]);
```

- [ ] **Krok 4: přidat kontrolu pořadí**

```ts
/**
 * The folder whose sibling set this file competes in: its own, or the parent
 * when it is an index.md standing in for its directory.
 */
function orderOwner(file: string): string {
  const dir = path.dirname(file);
  return path.basename(file) === "index.md" ? path.dirname(dir) : dir;
}

/** `docs/index.md` and `docs/<version>/index.md` have no siblings to sort against. */
function isOrderExempt(file: string): boolean {
  if (path.basename(file) !== "index.md") return false;
  return path.relative(DOCS_ROOT, file).split(path.sep).length <= 2;
}

function checkOrder(files: string[]): Issue[] {
  const issues: Issue[] = [];
  const takenPerOwner = new Map<string, Map<number, string>>();

  for (const file of files) {
    if (isOrderExempt(file)) continue;
    const rel = slugOf(file);
    const fm = parseFrontmatter(fs.readFileSync(file, "utf-8"));
    // A file with no frontmatter at all is already reported by checkFrontmatter.
    if (!fm) continue;

    const raw = fm["order"];
    if (raw === undefined) {
      issues.push({ file: rel, message: "missing required field: order" });
      continue;
    }

    const value = parseOrder(raw);
    if (value === null) {
      issues.push({
        file: rel,
        message: `invalid order: "${raw}" (expected an integer)`,
      });
      continue;
    }

    const owner = orderOwner(file);
    const taken = takenPerOwner.get(owner) ?? new Map<number, string>();
    const clash = taken.get(value);
    if (clash) {
      issues.push({
        file: rel,
        message: `duplicate order ${value} (also in ${clash})`,
      });
    } else {
      taken.set(value, rel);
      takenPerOwner.set(owner, taken);
    }
  }

  return issues;
}

/** A directory with no index.md has nowhere to put its own `order`. */
function checkSectionIndexes(): Issue[] {
  const issues: Issue[] = [];

  const walk = (dir: string, depth: number): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        !entry.isDirectory() ||
        IGNORE.has(entry.name) ||
        entry.name.startsWith(".")
      ) {
        continue;
      }
      const sub = path.join(dir, entry.name);
      // depth 0 holds the version directories, which are not ordered by `order`.
      if (depth > 0 && !fs.existsSync(path.join(sub, "index.md"))) {
        issues.push({
          file: path.relative(DOCS_ROOT, sub),
          message: "directory has no index.md, so it cannot carry order",
        });
      }
      walk(sub, depth + 1);
    }
  };

  walk(DOCS_ROOT, 0);
  return issues;
}
```

Do pole `checks` přidat jako poslední položku:

```ts
  {
    name: "Order",
    issues: [...checkOrder(files), ...checkSectionIndexes()],
  },
```

- [ ] **Krok 5: ověřit, že testy procházejí**

```bash
pnpm build && pnpm test:unit -- tests/unit/scripts/validate-docs
```

Očekávané: PASS včetně stávajících testů, které se o `order` nestarají.

- [ ] **Krok 6: brána a commit**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm knip && pnpm test:unit
git add src/scripts/validate-docs.ts tests/unit/scripts/validate-docs.test.ts
git commit -m "feat(validate): require a unique integer order on every page"
```

---

## Celek 4: normalize

**Model:** Opus. **Vlna:** 2, paralelně s celky 2, 3, 5, 6.

**Soubory:**

- Upravit: `src/scripts/normalize-docs.ts`
- Upravit: `tests/unit/scripts/normalize-docs.test.ts`

**Rozhraní:**

- Konzumuje z celku 1: `readFrontmatter(filePath)`, `parseOrder(raw)`.
- Produkuje: nic pro další celky. Celek 7 tenhle skript spouští na obsahu repa.

**Kontext:** skript dnes jede po plochém seznamu z `allMdFiles` a jen přerovnává
pořadí polí. Doplnění `order` potřebuje kontext složky, takže se nejdřív projde
strom a spočítá přiřazení, teprve pak běží stávající zápisová smyčka.

Klíčové pravidlo: nové hodnoty se přidávají za nejvyšší existující `order` v té
složce, v abecedním pořadí. Tím je vykreslené pořadí před i po `normalize`
totožné, protože runtime dává položky bez `order` na konec taky abecedně.
Existující platná hodnota se nikdy nepřepisuje; neplatná (`order: abc`) se
z pohledu přiřazení chová jako chybějící a přepíše se.

- [ ] **Krok 1: napsat padající testy**

Připojit na konec `tests/unit/scripts/normalize-docs.test.ts`. Ten soubor sdílí
jeden dočasný adresář přes `beforeAll`, což pro doplňování `order` nestačí:
přiřazení je per složka, takže by se testy navzájem znečišťovaly. Proto vlastní
helper s izolovaným stromem na každý test. Do importu z `vitest` doplnit `afterEach`.

```ts
let isolated: string[] = [];

afterEach(() => {
  for (const dir of isolated) fs.rmSync(dir, { recursive: true, force: true });
  isolated = [];
});

/** Runs normalize over an isolated tree and reads every input file back. */
function normalizeTree(tree: Record<string, string>): Record<string, string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "normalize-order-"));
  isolated.push(dir);
  for (const [rel, content] of Object.entries(tree)) {
    const full = path.join(dir, "docs", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  spawnSync("node", [SCRIPT, "--root=docs"], { cwd: dir, encoding: "utf-8" });
  return Object.fromEntries(
    Object.keys(tree).map((rel) => [
      rel,
      fs.readFileSync(path.join(dir, "docs", rel), "utf-8"),
    ]),
  );
}
```

```ts
describe("order backfill", () => {
  test("numbers a folder that has no order at all", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/beta.md": "---\ntitle: Beta\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 1");
    expect(files["v1/beta.md"]).toContain("order: 2");
    expect(files["v1/index.md"]).not.toContain("order:");
  });

  test("appends above the highest existing order and keeps it", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\norder: 7\n---\n\nbody\n",
      "v1/beta.md": "---\ntitle: Beta\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 7");
    expect(files["v1/beta.md"]).toContain("order: 8");
  });

  test("a directory gets its order written into index.md", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/sekce/index.md": "---\ntitle: Sekce\n---\n\nbody\n",
      "v1/sekce/page.md": "---\ntitle: Stránka\n---\n\nbody\n",
    });

    expect(files["v1/sekce/index.md"]).toContain("order: 1");
    expect(files["v1/sekce/page.md"]).toContain("order: 1");
  });

  test("an invalid order is replaced, not duplicated", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\norder: abc\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain("order: 1");
    expect(files["v1/alfa.md"]).not.toContain("order: abc");
    expect(files["v1/alfa.md"].match(/^order:/gm)).toHaveLength(1);
  });

  test("order lands right after updated_at", () => {
    const files = normalizeTree({
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md":
        "---\nconfluence_id: 12\ntitle: Alfa\nstatus: draft\nupdated_at: 2026-01-01\n---\n\nbody\n",
    });

    expect(files["v1/alfa.md"]).toContain(
      "title: Alfa\nstatus: draft\nupdated_at: 2026-01-01\norder: 1\nconfluence_id: 12",
    );
  });

  test("running twice changes nothing the second time", () => {
    const tree = {
      "v1/index.md": "---\ntitle: V1\n---\n\nbody\n",
      "v1/alfa.md": "---\ntitle: Alfa\n---\n\nbody\n",
    };
    const once = normalizeTree(tree);
    const twice = normalizeTree(once);

    expect(twice).toEqual(once);
  });
});
```

- [ ] **Krok 2: ověřit, že testy padají**

```bash
pnpm build && pnpm test:unit -- tests/unit/scripts/normalize-docs
```

Očekávané: FAIL, žádný `order` se nedoplňuje.

- [ ] **Krok 3: rozšířit `FIELD_ORDER` a zpřísnit `blocksEqual`**

```ts
const FIELD_ORDER = ["title", "status", "updated_at", "order"];
```

`blocksEqual` dnes porovnává jen posloupnost klíčů, takže by přepis hodnoty
uvnitř existujícího `order` bloku zůstal nezapsaný. Porovnávat i obsah:

```ts
function blocksEqual(a: Block[], b: Block[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (blk, i) =>
      b[i]?.key === blk.key && b[i]?.lines.join("\n") === blk.lines.join("\n"),
  );
}
```

- [ ] **Krok 4: spočítat přiřazení `order`**

```ts
import { readFrontmatter, parseOrder } from "../shared/frontmatter.js";

const IGNORE = new Set([".vitepress", "node_modules", "public"]);

/**
 * The `order` to write, keyed by the absolute path of the file that carries it.
 * Missing values are appended above the folder's highest existing order, in the
 * alphabetical order the tail already renders in, so the rendered result is
 * identical before and after.
 */
function planOrders(root: string): Map<string, number> {
  const assigned = new Map<string, number>();

  const walk = (dir: string, depth: number): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const dirs = entries.filter(
      (e) => e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."),
    );
    const files = entries.filter(
      (e) => e.isFile() && e.name.endsWith(".md") && e.name !== "index.md",
    );

    // depth 0 is the docs root, whose children are versions: neither is ordered.
    if (depth >= 1) {
      const siblings = [...files, ...dirs]
        .map((e) => ({
          name: e.name,
          carrier: e.isDirectory()
            ? path.join(dir, e.name, "index.md")
            : path.join(dir, e.name),
        }))
        .filter((s) => fs.existsSync(s.carrier))
        .map((s) => ({
          ...s,
          order: parseOrder(readFrontmatter(s.carrier)?.["order"]),
        }));

      let next =
        siblings.reduce(
          (max, s) => (s.order !== null && s.order > max ? s.order : max),
          0,
        ) + 1;

      for (const sibling of siblings
        .filter((s) => s.order === null)
        .sort((a, b) => a.name.localeCompare(b.name, "cs"))) {
        assigned.set(sibling.carrier, next++);
      }
    }

    for (const sub of dirs) walk(path.join(dir, sub.name), depth + 1);
  };

  walk(root, 0);
  return assigned;
}

function withOrder(blocks: Block[], value: number): Block[] {
  const line = `order: ${value}`;
  const existing = blocks.find((b) => b.key === "order");
  if (!existing) return [...blocks, { key: "order", lines: [line] }];
  return blocks.map((b) =>
    b === existing ? { key: "order", lines: [line] } : b,
  );
}
```

- [ ] **Krok 5: zapojit přiřazení do zápisové smyčky**

Nad smyčkou:

```ts
const orders = planOrders(DOCS_ROOT);
```

Uvnitř smyčky, mezi `parse` a `normalize`:

```ts
const assigned = orders.get(file);
const blocks =
  assigned === undefined ? parsed.blocks : withOrder(parsed.blocks, assigned);
const normalized = normalize(blocks);
```

- [ ] **Krok 6: ověřit, že testy procházejí**

```bash
pnpm build && pnpm test:unit -- tests/unit/scripts/normalize-docs
```

Očekávané: PASS.

- [ ] **Krok 7: brána a commit**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm knip && pnpm test:unit
git add src/scripts/normalize-docs.ts tests/unit/scripts/normalize-docs.test.ts
git commit -m "feat(normalize): backfill frontmatter order without changing rendered order"
```

---

## Celek 5: Confluence importér

**Model:** Sonnet. **Vlna:** 2, paralelně s celky 2, 3, 4, 6.

**Soubory:**

- Upravit: `src/confluence/layout.ts`
- Upravit: `src/cli/import-confluence.ts`
- Upravit: `tests/unit/confluence/layout.test.ts`

**Rozhraní:**

- Konzumuje z celku 1: nic.
- Produkuje: `buildOrderMap(node: TreeNode, map: Map<string, number>): void`
  v `src/confluence/layout.ts`.

**Kontext:** `children` z `GET /wiki/api/v2/pages/{id}/children` chodí v pořadí
stromu a `buildTree` v `src/confluence/client.ts:258-292` ho zachovává, protože
`Promise.all` drží indexy a `filter` je jen zúží. Bez tohohle celku by každý
čerstvý import okamžitě padal na novém lintu a pořadí z Confluence by se dál
ztrácelo. Kořen importu končí v `<outputDir>/index.md`, což je přesně soubor,
který je z lintu vyjmutý, takže `order` nedostane.

- [ ] **Krok 1: napsat padající test**

Připojit na konec `tests/unit/confluence/layout.test.ts`. Tovární funkce
`node(id, title, children)` je v tom souboru na řádku 13, používej ji. Do importu
z `../../../src/confluence/layout.js` doplnit `buildOrderMap`.

```ts
describe("buildOrderMap", () => {
  test("numbers children by their position in the tree", () => {
    const tree = node("1", "Root", [
      node("2", "Zeta"),
      node("3", "Alfa", [node("4", "Leaf")]),
    ]);

    const map = new Map<string, number>();
    buildOrderMap(tree, map);

    expect(map.get("2")).toBe(1);
    expect(map.get("3")).toBe(2);
    expect(map.get("4")).toBe(1);
  });

  test("the root has no siblings and gets no entry", () => {
    const map = new Map<string, number>();
    buildOrderMap(node("1", "Root"), map);

    expect(map.has("1")).toBe(false);
  });
});
```

- [ ] **Krok 2: ověřit, že test padá**

```bash
pnpm test:unit -- tests/unit/confluence/layout
```

Očekávané: FAIL, `buildOrderMap` není exportováno.

- [ ] **Krok 3: přidat `buildOrderMap` do `src/confluence/layout.ts`**

```ts
/**
 * Sibling position of every page, 1-based. Numbered after failed pages were
 * already dropped from the tree, so the values stay contiguous. The root has no
 * siblings and gets no entry.
 */
export function buildOrderMap(node: TreeNode, map: Map<string, number>): void {
  node.children.forEach((child, index) => {
    map.set(child.page.id, index + 1);
    buildOrderMap(child, map);
  });
}
```

- [ ] **Krok 4: zapojit do importéru**

V `src/cli/import-confluence.ts` rozšířit import z `../confluence/layout.js`
o `buildOrderMap`, přidat pole do `WriteContext`:

```ts
pageOrderMap: Map<string, number>;
```

Vedle stavby `pagePathMap` (kolem `src/cli/import-confluence.ts:374`):

```ts
const pageOrderMap = new Map<string, number>();
buildOrderMap(tree, pageOrderMap);
```

Doplnit `pageOrderMap` do objektu `ctx` a v `writePage` do zápisu frontmatteru:

```ts
const order = ctx.pageOrderMap.get(node.page.id);
const orderLine = order === undefined ? "" : `\norder: ${order}`;

fs.mkdirSync(path.dirname(filePath), { recursive: true });
fs.writeFileSync(
  filePath,
  `---
title: ${yamlString(displayTitle)}
status: ${status}
updated_at: ${updatedAt}${orderLine}
---

${markdown}
`,
  "utf-8",
);
```

- [ ] **Krok 5: ověřit, že test prochází**

```bash
pnpm test:unit -- tests/unit/confluence
```

Očekávané: PASS.

- [ ] **Krok 6: fixture kontrola importéru**

`docs/TESTING.md` má sekci Confluence importer verification. Projít ji;
fixture varianta nepotřebuje přístup do Confluence.

- [ ] **Krok 7: brána a commit**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm knip && pnpm test:unit
git add src/confluence/layout.ts src/cli/import-confluence.ts tests/unit/confluence/layout.test.ts
git commit -m "feat(confluence): write frontmatter order from the page tree position"
```

---

## Celek 6: dokumentace

**Model:** Sonnet. **Vlna:** 2, paralelně s celky 2 až 5.

**Soubory:**

- Upravit: `boilerplate/CLAUDE.md`
- Upravit: `boilerplate/README.md`
- Upravit: `boilerplate/.claude/skills/docs-from-code/resources/frontmatter-template.md`
- Upravit: `docs/updating-docs.md`
- Upravit: `docs/MIGRATIONS.md`
- Upravit: `docs/confluence-import.md`
- Upravit: `AGENTS.md`

**Rozhraní:** žádné. Nesahá na jediný `.ts` soubor, proto může běžet souběžně
s kódovými celky. Zdrojem pravdy o chování je `specs/frontmatter-order-sorting.md`.

**Styl:** `docs/`, kořenový markdown a `AGENTS.md` jsou anglicky. Bez pomlčky `—`,
bez konstrukce „not just X, but Y", bez marketingových přívlastků. `boilerplate/`
a `templates/` se v `pnpm format:check` záměrně nekontrolují.

- [ ] **Krok 1: `boilerplate/CLAUDE.md`**

Do tabulky povinných polí (kolem řádku 100) přidat řádek pro `order` s hodnotou
`integer` a do příkladu frontmatteru (kolem řádku 92) řádek `order: 1` za
`updated_at`. Doplnit odstavec s pravidly: `order` je povinný na každé stránce
kromě kořenového `docs/index.md` a `docs/<verze>/index.md`; pořadí složky nese
její `index.md`; sourozenci ve stejné složce, soubory i podsložky, sdílí jeden
číselný prostor a hodnota musí být unikátní.

- [ ] **Krok 2: `boilerplate/README.md`**

Do příkladu frontmatteru (kolem řádku 78) přidat `order: 1`.

- [ ] **Krok 3: `frontmatter-template.md`**

Šablona Content page má dnes jen `title`, `status`, `updated_at`. Přidat `order`.
Sekční a skupinové šablony v `docs-technical-from-code` a `docs-functional-from-code`
ho už mají, takže se nesahají.

- [ ] **Krok 4: `docs/updating-docs.md`**

Nová sekce o řazení: čtyři pravidla ze sekce Pravidla řazení ve specu, role
`index.md`, unikátnost mezi sourozenci a věta, že chybějící `order` sidebar
nerozbije, ale `docs:validate` na něj hlásí chybu.

- [ ] **Krok 5: `docs/MIGRATIONS.md`**

Nová sekce ve stejném tvaru jako stávající tři. Musí říct nahlas, že
`docs:validate` v existujícím repu začne padat, dokud neproběhne
`docs:normalize`, a uvést fix:

```bash
pnpm docs:normalize && pnpm docs:validate
```

Dál poznámka, že číselné prefixy v názvech (`001-`) můžou zůstat, `order` vyhrává
nad názvem. Kdo je chce uklidit, musí počítat s tím, že přejmenování mění URL,
takže je potřeba projít odkazy; nástroj na to není.

- [ ] **Krok 6: `docs/confluence-import.md`**

Doplnit, že importér zapisuje `order` podle pozice ve stromu, takže pořadí
z Confluence zůstane zachované a čerstvý import projde lintem.

- [ ] **Krok 7: `AGENTS.md`**

Do repo mapy přidat řádek pro `src/shared/`: sdílená čtečka frontmatteru
a řazení sourozenců, kterou konzumuje sidebar, print skript i lint.

- [ ] **Krok 8: ověřit odkazy a formát**

```bash
pnpm format:check
```

Ručně projít relativní odkazy, kterých ses dotkl; nic je nekontroluje automaticky.

- [ ] **Krok 9: commit**

```bash
git add AGENTS.md docs boilerplate
git commit -m "docs: document the frontmatter order convention"
```

---

## Celek 7: doplnění `order` do obsahu repa

**Model:** Haiku 4.5. **Vlna:** 3, až po celcích 3 a 4.

**Soubory:**

- Upravit: `playground/docs/**/*.md`
- Upravit: `templates/ana-docs/docs/**/*.md`
- Upravit: `templates/tech-docs/docs/**/*.md`

**Rozhraní:** žádné. Čistě obsahová změna generovaná nástrojem z celku 4
a ověřená lintem z celku 3.

**Kontext:** `playground/docs` má přes čtyřicet souborů s prefixy `001-`
a `order` jen ve čtyřech index souborech, kde je dnes mrtvý. Prefixy zůstávají:
jsou důkazem, že `order` vyhrává nad názvem.

- [ ] **Krok 1: postavit dist a doplnit order**

```bash
pnpm build
node dist/scripts/normalize-docs.js --root=playground/docs
node dist/scripts/normalize-docs.js --root=templates/ana-docs/docs
node dist/scripts/normalize-docs.js --root=templates/tech-docs/docs
```

- [ ] **Krok 2: ověřit skupinu Order**

```bash
node dist/scripts/validate-docs.js --root=playground/docs
```

Očekávané: řádek `✓ Order`.

Tenhle obsah se dosud nikdy nevalidoval, takže ostatní skupiny (Markdown lint,
Broken links) můžou hlásit chyby, které tu byly i předtím. Ty **neopravuj**:
nepatří do tohohle celku. Vypiš je v reportu jako existující dluh a pokračuj.
Jediné, co musí být zelené, je `Order`.

- [ ] **Krok 3: ověřit, že se sidebar nezměnil**

```bash
pnpm test:unit
```

Očekávané: PASS. Sidebarové testy staví vlastní dočasné stromy, takže na obsah
playgroundu nesahají; tenhle běh hlídá, že doplnění nerozbilo nic jiného.

- [ ] **Krok 4: prohlédnout diff**

```bash
git diff --stat
git diff playground/docs/v1/tokens
```

Očekávané: v každém souboru přibyl jediný řádek `order: N` za `updated_at`,
u souborů bez `updated_at` za `title`. Žádná jiná změna. Číslování musí sedět
na dnešní abecední pořadí.

- [ ] **Krok 5: commit**

```bash
git add playground/docs templates
git commit -m "chore(docs): backfill frontmatter order in playground and templates"
```

---

## Závěrečná integrace

Není commit, je to brána před předáním.

- [ ] Sloučit všechny větve do jedné a vyřešit případné konflikty.
- [ ] `pnpm build && pnpm lint && pnpm typecheck && pnpm knip && pnpm format:check && pnpm test`
- [ ] `pnpm dev:docs` a očima zkontrolovat, že sidebar playgroundu vypadá stejně jako před změnou.
- [ ] Nahlásit výsledek každého příkazu. Verzi ani release neřešit.

## Kontrola pokrytí specifikace

| požadavek specifikace                                  | celek                          |
| ------------------------------------------------------ | ------------------------------ |
| `src/shared/frontmatter.ts` a `src/shared/ordering.ts` | 1                              |
| pravidla řazení na všech pěti místech                  | 1 (čtyři místa), 2 (print)     |
| verze se neřadí přes `order`                           | 1                              |
| `validate-docs` sdílí parser                           | 3                              |
| skupina kontrol Order, čtyři pravidla                  | 3                              |
| `order` v `FIELD_ORDER` a doplňování hodnot            | 4                              |
| importér zapisuje `order` z pozice ve stromu           | 5                              |
| dokumentace v sedmi souborech                          | 6                              |
| obsah repa doplněný a zelený vůči lintu                | 7                              |
| akceptační kritéria 1 až 6                             | 1 (AK 1, 2, 3, 6), 3 (AK 4, 5) |
