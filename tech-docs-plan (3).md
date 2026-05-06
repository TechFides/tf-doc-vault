# Plán: Per-service technická dokumentace v repozitáři

**Status:** Návrh k diskusi
**Pilot:** `srvc-bat` (Flexifin BE service)

---

## 1. Kontext a cíl

Aktuálně máme technickou dokumentaci v Confluence a na všech projektech držíme [standardní strukturu dokumentace](https://techfides.atlassian.net/wiki/spaces/TFR/pages/4511432705/Standardn+struktura+dokumentace). Cíl tohoto projektu:

1. Vzít aktuální technickou dokumentaci v Confluence pro konkrétní službu.
2. Transformovat ji do MD souborů v repozitáři dané služby (informace se nemění, jen formát).
3. Vystavit dokumentaci přímo z běžící služby — podobně jako Swagger, bez separátní infrastruktury.
4. Auth na úrovni Nest/Next, pro analytiky i vývojáře — sdílené heslo z 1Password, jen na dev/staging, na produkci úplně vypnuto.
5. Pro AI agenty (Claude Code) i vývojáře čitelná struktura.

Pilot proběhne na `srvc-bat` (BE NestJS service projektu Flexifin). Po validaci pilotu rolloutneme na další Node.js služby. .NET je out of scope pro tuto iteraci.

## 2. Architektura jednou větou

> `tech-docs/v1/**/*.md` → `vitepress build` (Docker stage) → `tech-docs/.vitepress/dist/` → `setupTechDocs(app, opts)` v `main.ts` → mount na `/tech-docs` s Basic auth guardem (jen na non-prod, heslo z `TECH_DOCS_PASSWORD`).

Klíčové vlastnosti:

- **Žádná separátní infra.** Dokumentace se buildí během `docker build` služby, mountuje se ze stejného běžícího procesu jako API.
- **Žádný separátní repozitář.** `tech-docs/` žije přímo v repu služby.
- **Auth ze stejné služby.** Žádný sidecar nginx, žádný IAP před Cloud Run — Basic auth guard přímo v Express middleware.
- **Symetrie se Swagger.** Stejný shape integrace (`setupTechDocs(app, opts)` jako `SwaggerModule.setup(...)`).
- **AI-first.** Každý `tech-docs/` adresář obsahuje `CLAUDE.md` s instrukcemi, jak má AI agent (Claude Code) s dokumentací pracovat.
- **Verzovaná struktura, prozatím jen `v1`.** Verzování zachováváme kvůli kompatibilitě s analýzovým use-casem balíčku, ale pro tech-docs zatím vždy pracujeme jen s `v1` adresářem. Verze `v2` se zakládá až při skutečné potřebě (breaking změna obsahu, ne kódu).

## 3. Klíčová architektonická rozhodnutí

| Rozhodnutí                | Volba                                                                                                                    | Alternativy zvažované                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Tooling pro VitePress     | Fork `@techfides/ana-docs` do `tf-doc-vault` na GitHub; zachovat původní analytical use case + přidat tech-docs use case | Rozšířit ana-docs in-place na GitLabu; psát samostatný balíček |
| Distribuce balíčku        | Public na npmjs.com pod `@techfides` scope, open source (MIT licence)                                                    | Soukromé na GitHub Packages; soukromé na GitLab                |
| Mount mechanismus         | Express middleware mountovaný v `main.ts`                                                                                | NestJS `MiddlewareConsumer` modul; sidecar nginx               |
| Renderování               | `vitepress build` v Docker stage → static dist                                                                           | Runtime render z `.md` (Docsify-like)                          |
| Per-service vs. centrální | Per-service, dokumentace v repu služby                                                                                   | Centrální `*_techdocs` repo per projekt                        |
| Verzování dokumentace     | Zachovat `v1/` adresář (zatím pracujeme jen s `v1`)                                                                      | Plochá struktura bez verzování                                 |
| Struktura souborů         | `tech-docs/v1/<sekce>.md` plus volitelně podadresáře `v1/<sekce>/<podsekce>.md`                                          | Striktně plochá; striktně hierarchická                         |
| Pojmenování souborů       | Organicky z Confluence titulků (slugify)                                                                                 | Pevná jména dle TFR standardu                                  |
| Auth UX                   | Basic auth (browser prompt)                                                                                              | Login stránka se session                                       |
| Credentials               | Jedno sdílené heslo pro všechny                                                                                          | Per-user credentials                                           |
| Prostředí                 | Jen dev/staging, na prod úplně vypnuto                                                                                   | Všude za heslem; dev veřejně                                   |
| Confluence migrace        | Jednorázová, výstup je source of truth                                                                                   | Průběžná synchronizace                                         |

## 4. Změny v balíčku `@techfides/tf-doc-vault`

Cílová verze: **v0.1.0** (nový balíček po přesunu na GitHub a npmjs.com). Funkčně je to nadmnožina původního `@techfides/ana-docs@0.1.11` — analytical use case zůstává, přibývá tech-docs.

### A.1 — Fork z `@techfides/ana-docs` do `tf-doc-vault`

Balíček je dnes na GitLabu jako `@techfides/ana-docs`, primárně pro analýzové (`*_ana`) repos. Pro tech-docs use case forknu repo na GitHub do TechFides organizace, přejmenuju na `tf-doc-vault` a publikuju veřejně na npmjs.com pod scope `@techfides`.

**Důležité:** `tf-doc-vault` bude obsahovat **oba use cases** — původní analytical docs (scaffolder pro samostatné `*_ana` repos, Cloud Run runtime, terraform modul) **i** nový tech-docs (per-service mount v existujících službách). Žádný scaffolding se nezahazuje. Tech-docs je další use case, ne náhrada toho původního.

**Důvody pro fork (ne rozšíření in-place):**

- **Přesun na GitHub.** Vývoj balíčku se přesouvá z GitLabu na GitHub (kde je většina TechFides Node.js repozitářů). Fork s přejmenováním je přirozená příležitost na ten přesun.
- **Veřejná publikace.** Balíček je dnes private na GitLab; chceme veřejný npm balíček (zjednodušuje konzumaci v Docker buildu — žádný `GH_NPM_TOKEN` v každé service).
- **Lepší jméno.** `ana-docs` evokuje "analytical documentation"; `tf-doc-vault` lépe vystihuje fakt, že balíček obsluhuje víc dokumentačních use cases.
- **Čistý cut.** Starý `@techfides/ana-docs` na GitLabu se zafrosne (žádné další releases). Existující `*_ana` repos buď postupně migrujou na `@techfides/tf-doc-vault`, nebo zůstávají na poslední GitLab verzi (záleží na potřebě).

**Konkrétní akce:**

1. Vytvořit GitHub repo `techfides/tf-doc-vault` (forkem z GitLabu nebo fresh import zachovávající git historii).
2. Přejmenovat v `package.json`: `"name": "@techfides/tf-doc-vault"`, `"version": "0.1.0"`.
3. **Zachovat existující strukturu balíčku beze změny:**
4. **Přidat tech-docs use case** (sekce A.2–A.12 níže).
5. Přidat: GitHub Actions workflow pro `npm publish` na release tag (nahrazuje `.gitlab-ci.yml`).
6. Přidat: `LICENSE` (MIT), `CONTRIBUTING.md`, security policy (`SECURITY.md`).
7. Aktualizovat README — popisuje oba use cases (analytical docs + tech-docs).

### A.1.1 — Veřejná publikace na npmjs.com

**Scope:** `@techfides` na npmjs.com (pokud ještě není zaregistrovaný, vytvořit org).

**Licence:** MIT.

**Setup pro publish:**

- npm token vygenerovaný pro CI (`NPM_TOKEN` v GitHub Actions secrets).
- Publish workflow běží na GitHub release tag (`v*`).
- `package.json` má `"publishConfig": { "access": "public" }`.

**Důsledek:** Konzument (např. BAT) nepotřebuje žádný `.npmrc` registry override, žádný auth token v Docker buildu. `pnpm install` jednoduše stáhne z výchozího npmjs.com registry. **Tohle dramaticky zjednodušuje docs-build stage v Dockerfile** (viz A.9).

**Out of scope pro pilot:** přijímání externích PR, semver guarantee pro v0.x. Public publish nás formálně nezavazuje k podpoře — readme jasně říká "internal tooling, no support guarantees".

### A.2 — `makeConfig` použít existující versioned mód s jedinou verzí `v1`

**Soubor:** `src/config/makeConfig.ts`

**Žádná změna v API factory.** Zachováváme původní versioned mód balíčku — `getVersions()` rozeznává `v1/`, `v2/` adresáře a generuje sidebar/nav podle nich. Pro tech-docs pilot vždy používáme **pouze `v1/`**:

```
tech-docs/
├── .vitepress/config.ts
└── v1/
    ├── index.md
    ├── architektura.md
    └── moduly/                  # podadresáře jsou OK
        ├── auth.md
        └── catch-all.md
```

**Drobná úprava:** version dropdown v navbaru se skryje, pokud je k dispozici jen jediná verze. Tahle změna je drobná a hodí se i pro analýzové repos, které začínají na `v1`.

**Soubor:** `src/config/makeConfig.ts`

```ts
const versions = getVersions(docsRoot);

const versionItems = versions.map((v) => ({ text: v, link: `/${v}/` }));

const themeConfig: DefaultTheme.Config = {
  nav: [
    // version dropdown jen pokud existuje víc než jedna verze
    ...(versions.length > 1
      ? [{ text: latestVersion, items: versionItems }]
      : []),
    // ... rest unchanged
  ],
};
```

### A.3 — Mount middleware (Express + NestJS)

**Nový soubor:** `src/setup/express.ts`

Framework-agnostic Express middleware factory:

```ts
import express, { type RequestHandler } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { timingSafeEqual } from 'node:crypto';

export interface SetupTechDocsOptions {
  /** Absolutní cesta k vybudovanému dist adresáři. Default: `<cwd>/tech-docs/.vitepress/dist`. */
  distDir?: string;
  /** URL prefix. Default: "/tech-docs". */
  basePath?: string;
  /** Auth. Pokud `undefined` (nebo password prázdný), endpoint vrací 404. */
  auth?: {
    username?: string; // default "docs"
    password: string; // pokud prázdný → mount skipnut
    realm?: string; // default "Tech Docs"
  };
  /** Logger callback. Default: console.warn. */
  logger?: (msg: string) => void;
}

export function createTechDocsHandler(
  opts: SetupTechDocsOptions = {},
): RequestHandler | null {
  const distDir =
    opts.distDir ?? path.resolve(process.cwd(), 'tech-docs/.vitepress/dist');
  const log = opts.logger ?? ((m: string) => console.warn(`[tech-docs] ${m}`));

  if (!opts.auth?.password) {
    log('auth.password not set; tech-docs endpoint disabled');
    return null;
  }

  if (
    !fs.existsSync(distDir) ||
    !fs.existsSync(path.join(distDir, 'index.html'))
  ) {
    log(`dist directory not found at ${distDir}; tech-docs endpoint disabled`);
    return null;
  }

  const router = express.Router();
  router.use(
    basicAuthGuard({
      username: opts.auth.username ?? 'docs',
      password: opts.auth.password,
      realm: opts.auth.realm ?? 'Tech Docs',
    }),
  );
  router.use(
    express.static(distDir, { extensions: ['html'], index: 'index.html' }),
  );
  router.get('*', (_req, res) =>
    res.sendFile(path.join(distDir, 'index.html')),
  );

  return router;
}

function basicAuthGuard(opts: {
  username: string;
  password: string;
  realm: string;
}): RequestHandler {
  const expected = Buffer.from(`${opts.username}:${opts.password}`);
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Basic ')) {
      const provided = Buffer.from(header.slice(6), 'base64');
      if (
        provided.length === expected.length &&
        timingSafeEqual(provided, expected)
      ) {
        return next();
      }
    }
    res.setHeader(
      'WWW-Authenticate',
      `Basic realm="${opts.realm}", charset="UTF-8"`,
    );
    res.status(401).end('Authentication required');
  };
}
```

**Nový soubor:** `src/setup/nest.ts`

Tenký NestJS wrapper se stejným shapem jako `SwaggerModule.setup`:

```ts
import type { INestApplication } from '@nestjs/common';
import { createTechDocsHandler, type SetupTechDocsOptions } from './express.js';

/**
 * Mount technical documentation alongside the API.
 * Mirrors the shape of `SwaggerModule.setup(path, app, document)`.
 *
 * @example
 *   setupTechDocs("tech-docs", app, {
 *     auth: { password: process.env.TECH_DOCS_PASSWORD },
 *   });
 */
export function setupTechDocs(
  pathOrApp: string | INestApplication,
  appOrOpts?: INestApplication | SetupTechDocsOptions,
  maybeOpts?: SetupTechDocsOptions,
): void {
  // Support both shapes:
  //   setupTechDocs(app, opts)
  //   setupTechDocs("tech-docs", app, opts)
  let app: INestApplication;
  let basePath: string;
  let opts: SetupTechDocsOptions;

  if (typeof pathOrApp === 'string') {
    basePath = pathOrApp.startsWith('/') ? pathOrApp : `/${pathOrApp}`;
    app = appOrOpts as INestApplication;
    opts = maybeOpts ?? {};
  } else {
    basePath = '/tech-docs';
    app = pathOrApp;
    opts = (appOrOpts as SetupTechDocsOptions) ?? {};
  }

  const handler = createTechDocsHandler({ ...opts, basePath });
  if (!handler) return;

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.use(basePath, handler);
}
```

**Pozn:** `@nestjs/common` jen jako `peerDependency` — neforčíme NestJS verzi konzumentovi.

### A.4 — `package.json` exports

**Soubor:** `package.json`

Přidat:

```json
{
  "exports": {
    "./setup/express": {
      "types": "./dist/setup/express.d.ts",
      "default": "./dist/setup/express.js"
    },
    "./setup/nest": {
      "types": "./dist/setup/nest.d.ts",
      "default": "./dist/setup/nest.js"
    }
  },
  "peerDependencies": {
    "express": "^4 || ^5",
    "@nestjs/common": "^10 || ^11"
  },
  "peerDependenciesMeta": {
    "express": { "optional": true },
    "@nestjs/common": { "optional": true }
  }
}
```

`peerDependenciesMeta.optional: true` — analýzové use case (`*_ana` repos) ani nemusí mít NestJS/Express nainstalovaný; nesmí to lock zavléct.

### A.5 — `--root=<dir>` flag pro validate/normalize/fix scripty

**Soubory:**

- `src/scripts/validate-docs.ts`
- `src/scripts/normalize-docs.ts`
- `src/scripts/ensure-lf.ts`
- `src/scripts/fix.ts`

Každý script přijme `--root=<dir>` flag (default `docs`):

```ts
const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith('--root='))?.split('=')[1];
const DOCS_ROOT = path.resolve(process.cwd(), rootArg ?? 'docs');
```

Bin dispatcher (`bin/tf-doc-vault.mjs`): pass-through extra args (už dnes dělá přes `extraArgs`).

### A.6 — Nový subcommand `init-tech-docs`

**Nový soubor:** `bin/init-tech-docs.mjs`

**Co dělá:**

- Spuštěn v rootu existujícího repo (`pnpm dlx @techfides/tf-doc-vault init-tech-docs`).
- Vytvoří adresář `tech-docs/` s:
  - `.vitepress/config.ts` (volá `makeConfig({ project: "..." })` — versioned mód, výchozí)
  - `v1/index.md` placeholder s úvodním textem
  - `CLAUDE.md` (viz A.8)
  - `.gitkeep` v `public/` pro budoucí obrázky
- Aktualizuje `package.json` repa:
  - Přidá `@techfides/tf-doc-vault`, `vitepress`, `vitepress-plugin-mermaid`, `mermaid`, `vue` do `devDependencies` (idempotentně — nepřidává, pokud už tam jsou).
  - Přidá scripts: `docs:dev`, `docs:build`, `docs:validate`, `docs:fix`.
- Aktualizuje `.gitignore`: přidá `tech-docs/.vitepress/dist/` a `tech-docs/.vitepress/cache/`.
- **Neaktualizuje** Dockerfile ani `main.ts` — to je manuální krok s diff review.
- Vypíše instrukce na stdout: "Next steps: 1) Add docs-builder stage to Dockerfile. 2) Call setupTechDocs() in main.ts. 3) Set TECH_DOCS_PASSWORD env var."

**Args:** `--service-id=BAT`, `--project=flexifin`, `--repo=flexifincz/srvc-bat` (pro edit link).

### A.7 — `template/tech-docs/` jako embeddable šablona

```
template/tech-docs/
├── .vitepress/
│   └── config.ts            # makeConfig({ project: "__PROJECT__" })
├── v1/
│   └── index.md             # úvod, link na další stránky
└── CLAUDE.md                # AI-first instrukce
```

`init-tech-docs` z template kopíruje a substituuje placeholdery `__PROJECT__`, `__SERVICE_ID__`, `__REPO__`.

### A.8 — `template/tech-docs/CLAUDE.md`

Šablona instrukcí pro AI agenty:

````markdown
# Tech Docs — instrukce pro Claude Code / AI agenty

Tato složka obsahuje technickou dokumentaci pro službu ****SERVICE_ID**** projektu **PROJECT**.

## Struktura

Versioned struktura — všechny `.md` soubory aktuální dokumentace jsou v `v1/`. Sidebar v UI se generuje automaticky z file struktury + H2/H3 nadpisů.

v1/
├── index.md # úvod, klíčové vlastnosti služby, kontakty
├── architektura.md # high-level overview
├── moduly/ # podadresáře jsou povolené pro logické grupování
│ ├── auth.md
│ └── catch-all.md
└── deployment.md

## Konvence pro úpravu

- **Frontmatter** je povinný:
  ```yaml
  ---
  title: Architektura
  status: published # published | draft | review | archived
  updated_at: 2026-04-30
  ---
  ```
- `updated_at` aktualizuj při každé úpravě obsahu (datum ve formátu `YYYY-MM-DD`).
- Pro diagramy používej Mermaid v code blocks (` ```mermaid `).
- Obrázky ukládej do `tech-docs/public/images/` a odkazuj absolutně `/images/foo.png`.
- Validuj změny: `pnpm docs:validate` (frontmatter, broken links, missing images, markdown lint).

## Pravidla pro AI agenty

- Při úpravě jakéhokoli `.md` souboru aktualizuj `updated_at` na dnešní datum.
- Pokud měníš strukturu (přidáváš/odebíráš soubory), aktualizuj odkazy v `index.md`.
- Nezasahuj do `.vitepress/config.ts` bez explicitní instrukce — sidebar se generuje automaticky.
- Před commitem spusť `pnpm docs:fix` (LF normalizace, frontmatter normalize, lint, validate).

## Lokální preview

\`\`\`bash
pnpm docs:dev # http://localhost:5174
\`\`\`

## Vystavení v běžící službě

Dokumentace je mountována v NestJS `main.ts` přes `setupTechDocs(...)` na `/tech-docs`,
chráněná Basic auth z `TECH_DOCS_PASSWORD` env. Dostupná pouze na non-prod.
````

### A.9 — `docker/docs-build-stage.md`

Dokumentace s ready-to-copy Dockerfile fragmentem. Žádný kód v balíčku, jen reference pro vývojáře:

```markdown
# Tech-docs build stage pro service Dockerfile

Přidej před production stage:

\`\`\`dockerfile
###################

# TECH-DOCS BUILD

###################

FROM node:24-alpine AS docs-build

RUN npm install -g pnpm@10
WORKDIR /usr/src/app

COPY --chown=node:node pnpm-lock.yaml package.json ./

# tf-doc-vault je veřejný npm balíček, žádný auth není potřeba

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --chown=node:node tech-docs ./tech-docs

RUN pnpm exec vitepress build tech-docs
\`\`\`

A v production stage:

\`\`\`dockerfile
COPY --chown=node:node --from=docs-build \
 /usr/src/app/tech-docs/.vitepress/dist \
 ./tech-docs/.vitepress/dist
\`\`\`

**Důležité:**

- docs-build stage běží paralelně s app build stage (Buildkit). Edit
  `tech-docs/architecture.md` invaliduje jen docs cache, ne app cache.
- Žádný `GH_NPM_TOKEN` ani `.npmrc` registry override — `@techfides/tf-doc-vault`
  je veřejně dostupný z npmjs.com.
```

### A.10 — `bin/import-confluence.mjs` (subcommand)

**Co dělá:**

- Vstup: `--space=FLEX --root-page-id=1184333837 --output=./tech-docs/v1 --site=flexifin.atlassian.net`.
- Vyžaduje env `CONFLUENCE_API_TOKEN` + `CONFLUENCE_USER_EMAIL` (Basic auth proti Confluence REST API).
- Stáhne root stránku + descendants přes `GET /wiki/api/v2/pages/{id}` s `body-format=atlas_doc_format`.
  > **Preferujeme `atlas_doc_format` (ADF JSON)** — strukturovanější, jednodušší konverze než XHTML storage format.
- Konvertuje ADF → Markdown přes `[@atlaskit/adf-to-md](https://www.npmjs.com/package/@atlaskit/adf-to-md)`. Pro pilot stačí pokrýt heading, paragraph, bulletList, orderedList, codeBlock, table, link, panel.
- Stáhne přílohy přes `GET /wiki/rest/api/content/{id}/child/attachment` → uloží do `tech-docs/public/images/<orig-filename>`.
- Generuje frontmatter:
- Mapuje názvy souborů z Confluence titulků (organicky, ne dle pevného TFR seznamu):
  - `[BAT] Back Admin Tool - Technická dokumentace` → `v1/index.md` (root → index)
  - `[BAT] Stav projektu po založení` → `v1/stav-projektu-po-zalozeni.md` (slugify, odstranit prefix `[BAT]`)
  - `[BAT] Autentizace & autorizace` → `v1/autentizace-autorizace.md`
  - Pokud má stránka v Confluence sub-stránky, importer vytvoří **podsložku** se stejným jménem a do ní uloží `index.md` + děti. Mapování zachovává Confluence hierarchii.
- Inter-page linky: `<custom data-type="smartlink">` v Confluence → relativní MD link, pokud cíl je v migrované sadě, jinak absolutní URL na Confluence.
- **Idempotence:** existující soubor přepíše, ale `status: review` zachová `published` pokud už existuje (post-edit safety).

**Použití pro BAT pilot:**

```bash
export CONFLUENCE_USER_EMAIL=...
export CONFLUENCE_API_TOKEN=...
cd ~/repos/srvc-bat
pnpm dlx @techfides/tf-doc-vault import-confluence \
  --site=flexifin.atlassian.net \
  --root-page-id=1184333837 \
  --output=./tech-docs/v1
```

### A.11 — `bin/tf-doc-vault.mjs` dispatcher update

Přidat dva nové commandy do dispatcheru:

```js
const COMMANDS = {
  // ...existing
  'init-tech-docs': '../bin/init-tech-docs.mjs',
  'import-confluence': '../bin/import-confluence.mjs',
};
```

Plus speciální handling (oba jsou `.mjs` v `bin/`, ne v `dist/scripts/`).

### A.12 — README balíčku

Aktualizovaný README popisující **oba use cases** balíčku — analytical docs (samostatné `*_ana` repos) i tech-docs (per-service mount):

- Co balíček dělá v jedné větě.
- **Use case 1: Analytical docs** — odkaz na quickstart s `create-ana` scaffolderem (zachováno z původního README).
- **Use case 2: Tech-docs** — quickstart `pnpm dlx @techfides/tf-doc-vault init-tech-docs ...`.
- API reference pro oba módy: `makeConfig`, `setupTechDocs(path, app, opts)`.
- Link na `docker/docs-build-stage.md` (Docker fragment pro tech-docs).
- Link na `docs/import-confluence.md` (jak migrovat z Confluence).
- Licence (MIT), security policy.
- Disclaimer: "Internal TechFides tooling, no support guarantees, breaking changes možné v 0.x verzích."

## 5. Změny v `srvc-bat` repu (pilot)

### B.1 — Spustit `init-tech-docs`

```bash
cd ~/repos/srvc-bat
pnpm dlx @techfides/tf-doc-vault init-tech-docs --service-id=BAT --project=flexifin --repo=flexifincz/srvc-bat
```

Vytvoří `tech-docs/` strukturu, upraví `package.json`, `.gitignore`.

### B.2 — Spustit `import-confluence`

```bash
pnpm dlx @techfides/tf-doc-vault import-confluence \
  --site=flexifin.atlassian.net \
  --root-page-id=1184333837 \
  --output=./tech-docs/v1
```

Naplní `tech-docs/v1/` ze 3 stránek Confluence (root + 2 descendants).

### B.3 — Manuální revize importovaného obsahu

```bash
pnpm install
pnpm docs:dev   # vizuální kontrola na :5174
pnpm docs:validate
```

Edit `tech-docs/v1/index.md` po importu (ručně doplnit krátký úvod, protože root Confluence stránka je kostra se 13 prázdnými sekcemi).

### B.4 — Update `EnvVariablesDto`

**Soubor:** `src/common/dto/env-variables.dto.ts`

```ts
export class EnvVariablesDto {
  // ...existing

  @IsOptional()
  @IsString()
  TECH_DOCS_PASSWORD?: string;
}
```

`@IsOptional` — pokud chybí na prod, validace neprojde fail (žádná regrese), zároveň `setupTechDocs` mount skipne.

### B.5 — Update `main.ts` — setup volání

**Soubor:** `src/main.ts`

Přidat import a setup volání:

```ts
import { setupTechDocs } from '@techfides/tf-doc-vault/setup/nest';

// ...uvnitř bootstrap(), po setupSwagger:
if (process.env.NODE_ENV !== 'production' && process.env.TECH_DOCS_PASSWORD) {
  setupTechDocs('tech-docs', app, {
    auth: { password: process.env.TECH_DOCS_PASSWORD },
  });
}
```

> **Pozn:** tech-docs se mountuje přímo na `/tech-docs`, **ne** pod `${apiPrefix}/tech-docs`. Důvod: Swagger je na `/api-docs`, tech-docs je na `/tech-docs` — symetrie a oddělení od API endpoints.

### B.6 — Update `Dockerfile`

**Soubor:** `Dockerfile`

Přidat docs-build stage před production stage (viz A.9 fragment). Plus production stage rozšířit o copy:

```dockerfile
COPY --chown=node:node --from=docs-build /usr/src/app/tech-docs/.vitepress/dist ./tech-docs/.vitepress/dist
```

### B.7 — Update CI workflows

**Soubor:** `.github/workflows/cd-dev.yml`

V `cd` job přidat reference na `TECH_DOCS_PASSWORD`:

```yaml
cd:
  needs: [ci, build-docker-image]
  uses: ./.github/workflows/cd.yml
  secrets: inherit
  with:
    # ...existing
    TECH_DOCS_PASSWORD_SECRET: BAT_TECH_DOCS_PASSWORD # GCP Secret Manager key
```

**Soubor:** `.github/workflows/cd.yml`

V `gcloud run deploy` přidat:

```yaml
--set-secrets TECH_DOCS_PASSWORD=BAT_TECH_DOCS_PASSWORD:latest \
```

Stejně pro `cd-stage.yml`. Pro **production** deploy **nepřidávat** — na prodakci dokumentaci nechceme.

### B.8 — GCP Secret Manager — vytvořit secret

```bash
gcloud secrets create BAT_TECH_DOCS_PASSWORD --project=srvc-bat-dev
echo -n "<heslo z 1Password>" | gcloud secrets versions add BAT_TECH_DOCS_PASSWORD --data-file=- --project=srvc-bat-dev
```

Plus IAM role `roles/secretmanager.secretAccessor` pro `cloud-runner@srvc-bat-dev.iam.gserviceaccount.com`.

Stejně pro stage projekt.

### B.9 — `.env.example` update

Přidat:

```
TECH_DOCS_PASSWORD=local-dev-password
```

### B.10 — Update root `CLAUDE.md` v BAT

Přidat odkaz:

```markdown
## Tech docs

Service-level technická dokumentace je v `tech-docs/`. Detailní instrukce
pro úpravy jsou v `tech-docs/CLAUDE.md`.
```

## 6. Finální stav po všech krocích

### Balíček `@techfides/tf-doc-vault` v0.1.0

```
tf-doc-vault/                            # nový GitHub repo, fork z ana-docs
├── bin/
│   ├── tf-doc-vault.mjs                  # dispatcher (přejmenován z ana-docs.mjs)
│   ├── create-ana.mjs                    # zachováno (analytical docs scaffolder)
│   ├── init-tech-docs.mjs                # ← NEW (tech-docs init)
│   └── import-confluence.mjs             # ← NEW (Confluence migrátor, oba use cases)
├── src/
│   ├── config/
│   │   ├── makeConfig.ts                 # ← drobná úprava (skrýt nav dropdown při 1 verzi)
│   │   ├── strings.cs.json
│   │   └── index.ts
│   ├── setup/                            # ← NEW directory
│   │   ├── express.ts                    # ← NEW (createTechDocsHandler)
│   │   └── nest.ts                       # ← NEW (setupTechDocs)
│   ├── sidebar/                          # unchanged (umí podadresáře už dnes)
│   ├── theme/                            # unchanged
│   ├── scripts/                          # ← updated for --root flag
│   └── index.ts                          # ← re-exports setupTechDocs
├── template/
│   ├── docs/                             # zachováno - původní analytical scaffolder
│   ├── infra/                            # zachováno
│   ├── Dockerfile                        # zachováno
│   ├── CLAUDE.md                         # zachováno
│   ├── package.json                      # zachováno
│   └── tech-docs/                        # ← NEW (per-service tech docs template)
│       ├── .vitepress/config.ts
│       ├── v1/
│       │   └── index.md
│       └── CLAUDE.md
├── docker/
│   ├── nginx.conf                        # zachováno (analytical Cloud Run runtime)
│   ├── nginx-auth.conf                   # zachováno
│   ├── Dockerfile                        # zachováno (analytical standalone deploy)
│   └── docs-build-stage.md               # ← NEW (tech-docs Docker fragment doc)
├── infra/                                # zachováno (Terraform modul pro analytical)
├── .github/workflows/
│   └── publish.yml                       # ← NEW (npm publish on release tag, nahrazuje .gitlab-ci.yml)
├── LICENSE                               # ← NEW (MIT)
├── CONTRIBUTING.md                       # ← NEW
├── SECURITY.md                           # ← NEW
├── README.md                             # ← updated (oba use cases popsané)
└── package.json                          # ← name, version, exports, peerDeps, publishConfig
```

**Co se mění proti původnímu `@techfides/ana-docs`:**

- Repo se přesouvá z GitLabu na GitHub.
- Balíček se publikuje veřejně na npmjs.com pod novým jménem `@techfides/tf-doc-vault`.
- Přibývá tech-docs use case (`init-tech-docs`, `setupTechDocs`, `template/tech-docs/`, Docker fragment).
- Confluence importer (`import-confluence`) je dostupný pro oba use cases.
- Dispatcher se přejmenuje na `bin/tf-doc-vault.mjs`.
- Původní funkčnost (analytical scaffolder, Cloud Run runtime, Terraform modul, `template/` pro analytical repos) **zůstává beze změny** a je nadále podporovaná.

### Repo `srvc-bat` po pilotu

```
srvc-bat/
├── tech-docs/                          # ← NEW
│   ├── .vitepress/
│   │   ├── config.ts                   # makeConfig({ project: "srvc-bat", ... })
│   │   ├── dist/                       # gitignored, build artifact
│   │   └── cache/                      # gitignored
│   ├── public/
│   │   └── images/                     # Confluence přílohy
│   ├── v1/
│   │   ├── index.md                    # importováno + edited
│   │   ├── stav-projektu-po-zalozeni.md  # importováno z Confluence
│   │   └── autentizace-autorizace.md   # importováno z Confluence
│   └── CLAUDE.md                       # AI-first instrukce pro service
├── src/
│   ├── main.ts                         # ← updated: setupTechDocs(...)
│   └── common/dto/env-variables.dto.ts # ← updated: TECH_DOCS_PASSWORD
├── .github/workflows/
│   ├── cd.yml                          # ← updated: --set-secrets
│   ├── cd-dev.yml                      # ← updated: pass TECH_DOCS_PASSWORD_SECRET
│   └── cd-stage.yml                    # ← updated: same as dev
├── Dockerfile                          # ← updated: docs-build stage + COPY
├── .env.example                        # ← updated: TECH_DOCS_PASSWORD
├── .gitignore                          # ← updated: tech-docs/.vitepress/{dist,cache}
├── package.json                        # ← updated: docs:* scripts + devDeps
└── CLAUDE.md                           # ← updated: link to tech-docs/CLAUDE.md
```

### URL endpointy služby `srvc-bat` na dev/staging

| URL                                        | Co                        | Auth                               |
| ------------------------------------------ | ------------------------- | ---------------------------------- |
| `https://beta.bat.flexifin.cz/api/*`       | API endpointy             | per-endpoint guards                |
| `https://beta.bat.flexifin.cz/api-docs`    | Swagger UI                | (jak je dnes)                      |
| `https://beta.bat.flexifin.cz/tech-docs/*` | **Technická dokumentace** | **Basic auth (heslo z 1Password)** |

### Na produkci

`/tech-docs/*` vrací **404** (mount skipnut, protože `NODE_ENV === 'production'`).

## 7. Rizika a kde to může skřípat

1. **ADF → Markdown konverze.** Confluence makra (info panely, status lozenges, smart linky) v reálné `[BAT]` dokumentaci. **Mitigace:** pro pilot pokrýt jen základní bloky, ostatní nechat jako `<!-- TODO: konverze nepodporuje X -->` komentáře. Po pilotu dořešit case by case.
2. **Velikost Docker image.** Docs-build stage táhne `vitepress` + `vue` + `mermaid` + theme dependencies — řádově 200-300 MB extra v build stage (samotný production stage je ale jen `tech-docs/.vitepress/dist/`, což je <1 MB). **Mitigace:** Buildkit cache mezi runy, paralelní buildování stagů.
3. **VitePress build trvá.** Cca 5–15 sekund pro 10 stránek. Multiplikováno přes všechny services × CI runs by to mohlo přidat 1–2 minuty. **Mitigace:** paralelní stage v Buildkit, build cache. Pro pilot OK.
4. `**forbidNonWhitelisted` v BAT validaci.** Kdyby `TECH_DOCS_PASSWORD` chyběl v `EnvVariablesDto` a byl předán z env, service by spadla. **Mitigace:\*\* B.4 (přidat do DTO) je MUST před B.5.
5. `**@techfides/tf-doc-vault` jako peer dependency.** Pokud bude `tech-docs/` "embedded" struktura mít vlastní `package.json`, může nastat duplicita instalace. **Mitigace:\*\* **žádný separátní `package.json` v `tech-docs/`** — všechny deps v rootu service `package.json`. Vitepress build běží přes `pnpm exec vitepress build tech-docs` z rootu.
6. `**--set-secrets TECH_DOCS_PASSWORD` na production cd.yml.** Pokud někdo omylem přidá tenhle řádek do prod `cd.yml`, dokumentace se nasadí i na prod (s heslem). **Mitigace:\*\* explicit comment v `cd.yml` + `setupTechDocs` interně kontroluje `NODE_ENV !== 'production'` jako belt-and-suspenders.

## 8. Out of scope (mimo pilot)

- Centrální dokumentační portál agregující všechny `tech-docs/` napříč službami.
- SSO auth (Google Workspace, OIDC, IAP) místo Basic auth.
- Per-user credentials.
- Synchronizace zpět do Confluence (jednosměrná migrace, Confluence se po migraci read-only).
- Migrace společných projektových sekcí ze standardu (Infrastruktura, Monitoring, Audit, Integrace)
- Další FE/Mobile služby — pilot je čistě BE NestJS, FE/Mobile přijdou na řadu po vyhodnocení.
- .NET projekty — out of scope pro tuto fázi.
