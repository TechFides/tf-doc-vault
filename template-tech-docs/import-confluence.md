# Migrace dokumentace z Confluence

Subcommand `import-confluence` stáhne strom stránek z Confluence a převede je do Markdown souborů kompatibilních s VitePress.

## Použití

```bash
export CONFLUENCE_USER_EMAIL=vas@email.cz
export CONFLUENCE_API_TOKEN=<token>          # Atlassian API token (Settings → Security → API tokens)

tf-doc-vault import-confluence \
  --site=myorg.atlassian.net \
  --root-page-id=<id> \
  --output=./tech-docs/v1
```

Root page ID najdeš v URL Confluence stránky: `.../pages/**1184333837**/...`

## Co importer udělá

- Stáhne root stránku a rekurzivně všechny potomky
- Převede ADF (Atlassian Document Format) → Markdown
- Zachová hierarchii: stránky s dětmi → podsložka + `index.md`; listy → `.md`
- Slugifikuje názvy souborů (lowercase, bez diakritiky, bez `[SERVICE_ID]` prefixů)
- Stáhne přílohy obrázků do `tech-docs/public/images/`
- Interní Confluence linky přepíše na relativní MD cesty
- Vygeneruje frontmatter: `title`, `status: review`, `updated_at`
- **Idempotentní:** existující soubor s `status: published` si zachová svůj status

## Výstupní struktura

```
tech-docs/v1/
  index.md                         ← root stránka
  autentizace-autorizace.md        ← leaf stránka
  architektura/
    index.md                       ← stránka s dětmi
    moduly.md
    deployment.md
```

## Po importu

```bash
pnpm docs:dev        # vizuální kontrola na http://localhost:5173
pnpm docs:validate   # frontmatter, broken links, lint
```

Projdi vygenerované soubory a:
1. Nastav `status: published` u stránek, které jsou kompletní
2. Ručně doplň nebo oprav obsah tam, kde konverze ztratila formátování (tabulky, panely, inline obrázky)
3. Případně přejmenovej soubory/složky podle projektové konvence
