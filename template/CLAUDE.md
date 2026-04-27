# CLAUDE.md — Instrukce pro Claude Code

## O projektu

Repozitář **__PROJECT__** slouží k tvorbě byznys, funkčních a technických specifikací SW projektu __PROJECT__. Dokumentace je psána v češtině, verzovaná v Gitu a publikovaná jako webový portál (VitePress) přes sdílený tooling `@techfides/ana-docs`.

Primární uživatel tohoto repozitáře je **SW analytik** — nepíše produkční kód, ale vytváří specifikační dokumenty v `docs/`.

## Práce s dokumentací

### Struktura

```
docs/
  v1/                        ← verze dokumentace
    <sekce>/                 ← položka v horním menu
      <skupina>/             ← collapsible skupina v levém menu
        index.md             ← název skupiny (nezobrazuje se jako položka)
        soubor.md            ← stránka
  v2/                        ← další verze
```

### Povinný frontmatter

```markdown
---
title: Název stránky
status: published
updated_at: 2026-04-27
---
```

| Pole         | Hodnoty                                       |
| ------------ | --------------------------------------------- |
| `title`      | Zobrazí se v navigaci a jako nadpis záložky   |
| `status`     | `published` / `draft` / `review` / `archived` |
| `updated_at` | `YYYY-MM-DD` nebo `YYYY-MM-DD HH:MM`          |

### Konvence

- Jazyk obsahu: **čeština s diakritikou**
- Názvy souborů a složek: `kebab-case`
- Soubory jsou řazeny abecedně; pro pevné pořadí použij prefix `01-`, `02-`
- `print.md` je generovaný soubor — neupravovat, není verzován

## Příkazy

```bash
pnpm docs:dev          # dev server na http://localhost:5173
pnpm docs:build        # produkční build
pnpm docs:validate     # frontmatter, broken links, lint
pnpm docs:normalize    # kanonické řazení frontmatter
pnpm docs:pdf          # export do PDF (artifacts/docs-full.pdf)
pnpm fix               # full polish (LF, normalize, format, lint, typecheck, validate)
```

Doporučené před každým commitem:

```bash
pnpm fix
pnpm docs:build
```

## Pokyny pro Claude

- Piš specifikace **v češtině**, odborně, bez zbytečného žargonu.
- Při tvorbě nové stránky vždy přidej frontmatter se všemi třemi poli.
- Aktuální datum pro `updated_at` zjisti ze systémového kontextu (`currentDate`).
- Pokud uživatel nespecifikuje `status`, použij `draft`.
- Neupravuj soubory mimo `docs/`, pokud tě uživatel explicitně nepožádá.
- Neupravuj `.vitepress/` konfiguraci bez explicitní žádosti — chování je řízené balíčkem `@techfides/ana-docs` (factory `makeConfig` / `createTheme`).
- Při přidání nové skupiny nebo sekce přidej i `index.md` s frontmatter.
- Obrázky sdílené přes více dokumentů patří do `docs/public/images/`; lokální obrázky ulož vedle `.md` souboru.

## Verzování dokumentace

Nová verze = nová složka `docs/vX/`. VitePress ji automaticky přidá do dropdown přepínače verzí (řízené factory `makeConfig`).
