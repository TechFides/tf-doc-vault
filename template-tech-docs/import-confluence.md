# Migrace dokumentace z Confluence

Subcommand `import-confluence` stáhne strom stránek z Confluence a převede je do Markdown souborů kompatibilních s VitePress.

## Použití

```bash
export CONFLUENCE_USER_EMAIL=vas@email.cz
export CONFLUENCE_API_TOKEN=<token>          # Atlassian API token (Settings → Security → API tokens)

tf-doc-vault import-confluence \
  --site=myorg.atlassian.net \
  --root-page-id=<id> \
  --output=./tech-docs/docs/v1
```

Root page ID najdeš v URL Confluence stránky: `.../pages/**1184333837**/...`

## Co importer udělá

- Stáhne root stránku a rekurzivně všechny potomky
- Převede ADF (Atlassian Document Format) → Markdown
- Zachová hierarchii: stránky s dětmi → podsložka + `index.md`; listy → `.md`
- Slugifikuje názvy souborů (lowercase, bez diakritiky, bez `[SERVICE_ID]` prefixů)
- Stáhne přílohy obrázků do `tech-docs/docs/public/images/`
- Interní Confluence linky přepíše na relativní MD cesty
- Vygeneruje frontmatter: `title`, `status: review`, `updated_at`
- **Idempotentní:** existující soubor s `status: published` si zachová svůj status

## Výstupní struktura

```
tech-docs/docs/v1/
  index.md                              ← root stránka
  autentizace-autorizace/
    index.md                            ← sekce s přímými potomky
    prihlaseni.md
    odhlaseni.md
  architektura/
    index.md                            ← sekce s podskupinami
    moduly/
      index.md                          ← skupina (má vlastní potomky)
      auth-modul.md
      api-modul.md
    deployment.md
```

Tato struktura odpovídá ana-docs konvenci (`sekce/skupina/stránka`),
takže sidebar se generuje stejnou logikou jako u analytické dokumentace.

## Po importu

```bash
pnpm docs:dev        # vizuální kontrola na http://localhost:5174
pnpm docs:validate   # frontmatter, broken links, lint
```

Projdi vygenerované soubory a:
1. Nastav `status: published` u stránek, které jsou kompletní
2. Ručně doplň nebo oprav obsah tam, kde konverze ztratila formátování (tabulky, panely, inline obrázky)
3. Případně přejmenovej soubory/složky podle projektové konvence
