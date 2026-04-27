# @techfides/ana-docs

Sdílený VitePress tooling pro TFSA analýzové dokumentace.

Cíl: nasadit nové analýzové repo do 5 minut. Vyřešit jednou — sdílet napříč všemi `*_ana` repos.

## Co balíček obsahuje

- **`config`** — factory `makeConfig()` postaví celou VitePress konfiguraci (locales, nav, sidebar, lokalizace, mermaid, volitelně analytics + editLink).
- **`theme`** — `createTheme()` vrací VitePress theme se sdílenými komponentami: DocMeta, ImageLightbox, PrintLayout, VersionSwitcher, volitelně WidthToggle.
- **`sidebar`** — generátor `nav` a `sidebar` z adresářové struktury `docs/<verze>/<sekce>/<skupina>/`.
- **`scripts`** — `build-print-page`, `export-pdf`, `validate-docs`, `normalize-docs`, `ensure-lf`, `fix`. Spouštěné přes CLI `ana-docs`.
- **`bin/ana-docs`** — CLI dispatcher pro projektové skripty.
- **`bin/create-ana`** — CLI pro založení nového `*_ana` repa z templatu.
- **`configs`** — `eslint.config.js`, `prettier.json`, `tsconfig.base.json` k extends.
- **`infra/terraform`** — reusable modul pro Cloud Run + Artifact Registry + IAM.
- **`docker`** — multi-stage Dockerfile s `ARG SERVER_TYPE=serve|nginx|nginx-auth` + nginx confs.
- **`template`** — kostra nového `*_ana` repa.

## Použití v aplikačním repu

`docs/.vitepress/config.ts`:

```ts
import { makeConfig } from "@techfides/ana-docs/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "lapa",
  // volitelné:
  analytics: { provider: "umami", websiteId: "...", domain: "..." },
  editLink: { repo: "techfides/tf-analysis/lapa_ana", branch: "master" },
});
```

`docs/.vitepress/theme/index.ts`:

```ts
import { createTheme } from "@techfides/ana-docs/theme";
import "./custom.css"; // overrides nad base CSS

export default createTheme({ widthToggle: true });
```

`package.json`:

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:print": "ana-docs print",
    "docs:export-pdf": "ana-docs export-pdf",
    "docs:pdf": "ana-docs pdf",
    "docs:validate": "ana-docs validate",
    "docs:normalize": "ana-docs normalize",
    "docs:lf": "ana-docs ensure-lf",
    "fix": "ana-docs fix"
  },
  "dependencies": {
    "@techfides/ana-docs": "^0.1.0"
  }
}
```

## Založení nového repa

```bash
npx @techfides/ana-docs create my-new-ana \
  --gcp-project=tfsa-my-new-ana \
  --server=nginx-auth
```

CLI:

1. Zkopíruje `template/` do `./my-new-ana/`.
2. Nahradí placeholdery (`__PROJECT__`, `__GCP_PROJECT__`, `__SERVER_TYPE__`).
3. Inicializuje git, vytvoří první commit.
4. Po `pnpm install && pnpm docs:dev` běží na `http://localhost:5173`.

Deployment přes `terraform apply` v `infra/` + push do GitLabu (CI postaví image a nasadí na Cloud Run).

## Lokální vývoj

Pro iteraci na balíčku vedle aplikačního repa stačí, aby oba repos ležely vedle sebe (např. `tf-analysis/ana-docs/` a `tf-analysis/<něco>_ana/`):

```bash
# 1. v balíčku — jednorázově po cloningu
cd ana-docs
pnpm install                  # nainstaluje deps; "prepare" hook postaví dist/
pnpm dev                      # tsc --watch + auto-copy statických assetů

# 2. v aplikačním repu
cd ../<něco>_ana
pnpm install                  # natáhne peer deps a slinkuje file:../ana-docs
pnpm docs:dev                 # http://localhost:5173 — vidí změny z dist/ přes Vite HMR
```

Aplikační repo deklaruje závislost přes `file:` (typicky vygenerované `create-ana --dev`):

```json
"dependencies": { "@techfides/ana-docs": "file:../ana-docs" }
```

Pro produkci se hodnota přepíše na `^0.1.0` (po publishi do registry) nebo `git+ssh://…/ana-docs.git#v0.1.0`.

## Sync šablony do existujícího repa

Když balíček přidá / opraví něco v `template/` (Dockerfile, CI, configs, Terraform), aplikační repos to nedostanou automaticky — patří jim. Pro kontrolu / přepsání:

```bash
pnpm sync           # ukáže unified diff všech driftnutých souborů
pnpm sync:apply     # přepíše drifted soubory šablonou (placeholdery se renderují z aktuálního repa)
```

User content (`docs/`, `package.json`, README, CLAUDE, custom.css, terraform.tfvars) je vyloučen z přepisování.
