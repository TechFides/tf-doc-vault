# @techfides/ana-docs

Sdílený VitePress tooling pro TFSA analýzové dokumentace.

Cíl: nasadit nové analýzové repo do 5 minut. Vyřešit jednou — sdílet napříč všemi `*_ana` repos.

## Co balíček obsahuje

- **`config`** — factory `makeConfig()` postaví celou VitePress konfiguraci (locales, nav, sidebar, lokalizace, mermaid, volitelně analytics + editLink).
- **`theme`** — `createTheme()` vrací VitePress theme se sdílenými komponentami: DocMeta, ImageLightbox, PrintLayout, VersionSwitcher, volitelně WidthToggle.
- **`sidebar`** — generátor `nav` a `sidebar` z adresářové struktury `docs/<verze>/<sekce>/<skupina>/`.
- **`scripts`** — `build-print-page`, `export-pdf`, `validate-docs`, `normalize-docs`, `ensure-lf`, `fix`, `sync-template`. Spouštěné přes CLI `ana-docs`.
- **`bin/ana-docs`** — CLI dispatcher: `create | print | export-pdf | pdf | validate | normalize | ensure-lf | fix | sync`.
- **`bin/create-ana`** — alias pro `ana-docs create` (přímá invokace scaffolderu).
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
    "sync": "ana-docs sync",
    "sync:apply": "ana-docs sync --apply",
    "fix": "ana-docs fix"
  },
  "dependencies": {
    "@techfides/ana-docs": "git+ssh://git@gitlab.com/techfides/tf-analysis/ana-docs.git#v0.1.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["@techfides/ana-docs"]
  }
}
```

`pnpm.onlyBuiltDependencies` je nutný — pnpm 10 jinak odmítne spustit `prepare` hook git balíčku a `dist/` se nepostaví.

## Založení nového repa

Předpoklad: SSH klíč na GitLabu (`gitlab.com:techfides/tf-analysis/...`).

```bash
pnpm dlx --allow-build=@techfides/ana-docs \
  "git+ssh://git@gitlab.com/techfides/tf-analysis/ana-docs.git#v0.1.0" \
  create moje_analyza \
  --source=git --ref=v0.1.0 \
  --gcp-project=tfsa-moje-analyza \
  --server=nginx
```

Co se stane:

1. `pnpm dlx` stáhne tooling z GitLabu, postaví `dist/` (díky `--allow-build`), spustí `ana-docs create`.
2. Scaffolder zkopíruje `template/` do `./moje_analyza/`, nahradí placeholdery (`__PROJECT__`, `__GCP_PROJECT__`, `__SERVER_TYPE__`, `__VITEPRESS_COMMON_DEP__`).
3. `git init` + první commit (vypneš přes `--no-git`).

Pak:

```bash
cd moje_analyza
pnpm install            # natáhne peer deps + ana-docs z gitu (prepare hook postaví dist/)
pnpm docs:dev           # http://localhost:5173
```

Deployment přes `terraform apply` v `infra/` + push do GitLabu (CI postaví image a nasadí na Cloud Run).

### Volby `--source`

| Volba | Hodnota v `package.json` | Kdy |
|---|---|---|
| `--source=git` (doporučeno) | `git+ssh://…/ana-docs.git#<ref>` | Produkce — pinováno na tag |
| `--source=npm` (default) | `^<verze>` | Až bude balíček publikován v npm registry |
| `--source=file` / `--dev` | `file:../ana-docs` | Lokální vývoj balíčku vedle consumer repa |
| `--source=workspace` | `workspace:*` | Pokud máš pnpm workspace |

## Lokální vývoj balíčku

Pro iteraci na samotném `ana-docs`:

```bash
# 1. v balíčku — jednorázově po cloningu
cd ana-docs
pnpm install                  # deps + "prepare" hook postaví dist/
pnpm dev                      # tsc --watch + auto-copy statických assetů (.vue/.css/.json/.ico)

# 2. ve vedlejším aplikačním repu, scaffoldnutém s --dev
cd ../<něco>_ana
pnpm install                  # natáhne peer deps a slinkuje file:../ana-docs
pnpm docs:dev                 # vidí změny z dist/ přes Vite HMR
```

Aplikační repo s `--dev` deklaruje závislost přes `file:`:

```json
"dependencies": { "@techfides/ana-docs": "file:../ana-docs" }
```

Předpoklad pro `file:` install: oba adresáře leží vedle sebe (relativní cesta `../ana-docs`). Když je jinde, `--file-path=/abs/path` při scaffoldování přepíše.

## Sync šablony do existujícího repa

Když balíček přidá / opraví něco v `template/` (Dockerfile, CI, configs, Terraform), aplikační repos to nedostanou automaticky — patří jim. Pro kontrolu / přepsání:

```bash
pnpm sync           # ukáže unified diff všech driftnutých souborů
pnpm sync:apply     # přepíše drifted soubory šablonou (placeholdery se renderují z aktuálního repa)
```

User content (`docs/`, `package.json`, README, CLAUDE, custom.css, terraform.tfvars) je vyloučen z přepisování.
