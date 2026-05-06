# Tech Docs — instrukce pro Claude Code / AI agenty

Tato složka obsahuje technickou dokumentaci pro službu **__SERVICE_ID__** projektu **__PROJECT__**.

## Struktura

Versioned struktura — všechny `.md` soubory aktuální dokumentace jsou v `v1/`.
Sidebar v UI se generuje automaticky z file struktury + H2/H3 nadpisů.

```
v1/
├── index.md          # úvod, klíčové vlastnosti služby, kontakty
├── architektura.md   # high-level overview
├── moduly/           # podadresáře jsou povolené pro logické grupování
│   ├── auth.md
│   └── api.md
└── deployment.md
```

## Konvence pro úpravu

**Frontmatter** je povinný:

```yaml
---
title: Architektura
status: published   # published | draft | review | archived
updated_at: 2026-04-30
---
```

- `updated_at` aktualizuj při každé úpravě obsahu (formát `YYYY-MM-DD`).
- Pro diagramy používej Mermaid v code blocks (` ```mermaid `).
- Obrázky ukládej do `tech-docs/public/images/` a odkazuj absolutně `/images/foo.png`.

## Pravidla pro AI agenty

- Při úpravě jakéhokoli `.md` souboru aktualizuj `updated_at` na dnešní datum.
- Pokud měníš strukturu (přidáváš/odebíráš soubory), aktualizuj odkazy v `index.md`.
- Nezasahuj do `.vitepress/config.ts` bez explicitní instrukce — sidebar se generuje automaticky.
- Před commitem spusť `pnpm docs:fix`.

## Lokální preview

```bash
pnpm docs:dev   # http://localhost:5174
```

## Validace

```bash
pnpm docs:validate   # frontmatter, broken links, chybějící obrázky, markdown lint
pnpm docs:fix        # LF normalizace, frontmatter normalize, lint, validate
```

## Vystavení v běžící službě

Dokumentace je mountována v NestJS `main.ts` přes `setupTechDocs(...)` na `/tech-docs`,
chráněná Basic auth z `TECH_DOCS_PASSWORD` env. Dostupná pouze na non-prod prostředích.
