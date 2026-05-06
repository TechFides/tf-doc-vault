# @techfides/tf-doc-vault

Sdílený VitePress tooling pro TFSA dokumentace — analytické `*_ana` repos i technická dokumentace přímo v service repu.

Cíl: nasadit nové analýzové repo do 5 minut. Vyřešit jednou — sdílet napříč všemi `*_ana` repos.

## Co balíček obsahuje

- **`config`** — factory `makeConfig()` postaví celou VitePress konfiguraci (locales, nav, sidebar, lokalizace, mermaid, volitelně analytics + editLink).
- **`theme`** — `createTheme()` vrací VitePress theme se sdílenými komponentami: DocMeta, ImageLightbox, PrintLayout, VersionSwitcher, volitelně WidthToggle.
- **`sidebar`** — generátor `nav` a `sidebar` z adresářové struktury `docs/<verze>/<sekce>/<skupina>/`.
- **`scripts`** — `build-print-page`, `export-pdf`, `validate-docs`, `normalize-docs`, `ensure-lf`, `fix`, `sync-template`. Spouštěné přes CLI `tf-doc-vault`.
- **`setup/express`** — `createTechDocsHandler()`: Express middleware pro servování `tech-docs/` s Basic auth.
- **`setup/nest`** — `setupTechDocs()`: NestJS wrapper pro mount tech-docs do běžící aplikace.
- **`bin/tf-doc-vault`** — CLI dispatcher: `create | init-tech-docs | import-confluence | print | export-pdf | pdf | validate | normalize | ensure-lf | fix | sync`.
- **`bin/create-ana`** — alias pro `tf-doc-vault create` (přímá invokace scaffolderu).
- **`configs`** — `eslint.config.js`, `prettier.json`, `tsconfig.base.json` k extends.
- **`infra/terraform`** — reusable modul pro Cloud Run + Artifact Registry + IAM.
- **`docker`** — multi-stage Dockerfile s `ARG SERVER_TYPE=nginx|nginx-auth` + nginx confs.
- **`template`** — kostra nového `*_ana` repa.

## Použití v aplikačním repu

`docs/.vitepress/config.ts`:

```ts
import { makeConfig } from "@techfides/tf-doc-vault/config";

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
import { createTheme } from "@techfides/tf-doc-vault/theme";
import "./custom.css"; // overrides nad base CSS

export default createTheme({ widthToggle: true });
```

`package.json`:

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:print": "tf-doc-vault print",
    "docs:export-pdf": "tf-doc-vault export-pdf",
    "docs:pdf": "tf-doc-vault pdf",
    "docs:validate": "tf-doc-vault validate",
    "docs:normalize": "tf-doc-vault normalize",
    "docs:lf": "tf-doc-vault ensure-lf",
    "sync": "tf-doc-vault sync",
    "sync:apply": "tf-doc-vault sync --apply",
    "fix": "tf-doc-vault fix"
  },
  "dependencies": {
    "@techfides/tf-doc-vault": "git+ssh://git@github.com/techfides/tf-doc-vault.git#v0.1.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["@techfides/tf-doc-vault"]
  }
}
```

`pnpm.onlyBuiltDependencies` je nutný — pnpm 10 jinak odmítne spustit `prepare` hook git závislosti a `dist/` se nepostaví.

## Analytická dokumentace — Založení nového repa

```bash
pnpm dlx @techfides/tf-doc-vault create moje_analyza \
  --gcp-project=tfsa-moje-analyza \
  --server=nginx
```

Co se stane:

1. `pnpm dlx` stáhne tooling z GitHubu, postaví `dist/` (díky `prepare` hooku), spustí `tf-doc-vault create`.
2. Scaffolder zkopíruje `template/` do `./moje_analyza/`, nahradí placeholdery (`__PROJECT__`, `__GCP_PROJECT__`, `__SERVER_TYPE__`, `__VITEPRESS_COMMON_DEP__`).
3. `git init` + první commit (vypneš přes `--no-git`).

Pak:

```bash
cd moje_analyza
pnpm install            # natáhne peer deps + tf-doc-vault z gitu (prepare hook postaví dist/)
pnpm docs:dev           # http://localhost:5173
```

Deployment přes `terraform apply` v `infra/` + push do GitLabu (CI postaví image a nasadí na Cloud Run).

### Push do GitLabu

Repozitář na GitLabu **není potřeba předem vytvářet** — využíváme [push-to-create](https://docs.gitlab.com/topics/git/project/#create-a-project-using-git-push). Stačí přidat remote a pushnout; GitLab projekt automaticky založí v cílové skupině (`techfides/tf-analysis`):

```bash
cd moje_analyza
git remote add origin git@gitlab.com:techfides/tf-analysis/moje_analyza.git
git push -u origin master
```

Předpoklad: musíš mít v `techfides/tf-analysis` práva `Developer` nebo vyšší (push-to-create vyžaduje permission na vytváření projektů ve skupině). Po prvním pushi nezapomeň ve vytvořeném projektu nastavit CI/CD variables (`GCP_SA_KEY`, `GCP_PROJECT`, `GCP_REGION`, `SERVICE_NAME`) — bez nich `🐳 build:docs` neprojde.

### Volby scaffolderu

`tf-doc-vault create <project-name> [options]`:

| Volba | Default | Popis |
|---|---|---|
| `--gcp-project=<id>` | `tfsa-<project>` | GCP project ID (jde do `terraform.tfvars`). |
| `--server=<type>` | `nginx` | Runtime image: `nginx` (statika bez auth) nebo `nginx-auth` (Nginx + Basic auth z `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`). |
| `--source=<src>` | `git` | `git` → `git+ssh://…/tf-doc-vault.git#<ref>` (produkce, pinováno na tag). `file` → `file:<path>` (lokální vývoj balíčku vedle consumer repa). |
| `--ref=<git-ref>` | `v<package version>` | Tag/branch/SHA pro `--source=git`. |
| `--git-url=<url>` | `git+ssh://git@github.com/techfides/tf-doc-vault.git` | Override git URL pro `--source=git`. |
| `--file-path=<path>` | relativní cesta k balíčku | Override `file:` cesty pro `--source=file`. |

## Auth pro `nginx-auth`

Runtime `nginx-auth` chrání aplikaci HTTP Basic auth. Login a heslo se nastavují **na buildu** přes Docker build-args `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` — `Dockerfile` z nich vygeneruje `/etc/nginx/.htpasswd`. Pokud jsou prázdné, build padne fail-fast.

Hodnoty se drží přímo v repu, v top-level `variables:` bloku `.gitlab-ci.yml`:

```yaml
variables:
  PNPM_STORE: "$CI_PROJECT_DIR/.pnpm-store"
  BASIC_AUTH_USER: "anadocs"
  BASIC_AUTH_PASS: "anadocsTF"
```

Není to tajný údaj — kdo má přístup do repa, má přístup i do aplikace. Job `🐳 build:docs` je conditional propustí do `docker build` jen když nejsou prázdné, takže projekty bez auth (runtime `nginx`) je jen nechají nevyplněné.

Lokální build:

```bash
docker build --build-arg SERVER_TYPE=nginx-auth \
             --build-arg BASIC_AUTH_USER=anadocs \
             --build-arg BASIC_AUTH_PASS=anadocsTF \
             -t docs-web .
```

Rotace hesla = úprava `variables:` + commit + redeploy (htpasswd hash je zapečen do image vrstvy).

### Přepnutí existujícího projektu z `nginx` na `nginx-auth`

`__SERVER_TYPE__` se zapéká do dvou míst při scaffoldování — pro switch je potřeba upravit obojí:

1. **`.gitlab-ci.yml`** — v `BUILD_ARGS` (job `🐳 build:docs`) změň `SERVER_TYPE=nginx` na `SERVER_TYPE=nginx-auth`.
2. **`Dockerfile`** — `ARG SERVER_TYPE=nginx` → `ARG SERVER_TYPE=nginx-auth` (default pro lokální buildy bez build-argu; CI ho vždy přepíše).
3. **`.gitlab-ci.yml`** `variables:` — vyplň `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` (jinak build padne na fail-fast checku v `Dockerfile`).
4. Commit + push → CI postaví nový image, Cloud Run rolne novou revizi.

Zpátky na `nginx` = stejné kroky obráceně + vyprázdnit oba `BASIC_AUTH_*`.

## Technická dokumentace v service repu (tech-docs)

Vedle analytických `*_ana` repos podporuje balíček i **tech-docs** use case: VitePress dokumentace žijí přímo v service repu a NestJS aplikace jí vystavuje na `/tech-docs` s Basic auth.

### Inicializace

```bash
# V kořeni service repa
pnpm exec tf-doc-vault init-tech-docs \
  --service-id=BAT \
  --project=flexifin \
  --repo=myorg/myrepo       # volitelné — GitHub repo pro edit links
```

Idempotentně vytvoří `tech-docs/`, doplní `package.json` scripts a `.gitignore`.

### NestJS wiring (`main.ts`)

```ts
import { setupTechDocs } from "@techfides/tf-doc-vault/setup/nest";

await setupTechDocs(app, {
  auth: { username: "docs", password: process.env.TECH_DOCS_PASSWORD ?? "" },
});
```

Pokud je `auth.password` prázdné nebo `dist/` neexistuje, `setupTechDocs` nic neprovede.

### Dockerfile

Přidej `docs-build` stage — viz [`template-tech-docs/docs-build-stage.md`](docker/docs-build-stage.md).

### Migrace z Confluence

```bash
export CONFLUENCE_USER_EMAIL=vas@email.cz
export CONFLUENCE_API_TOKEN=<token>

pnpm exec tf-doc-vault import-confluence \
  --site=myorg.atlassian.net \
  --root-page-id=<id> \
  --output=./tech-docs/v1
```

Podrobný návod: [`template-tech-docs/import-confluence.md`](template-tech-docs/import-confluence.md).

## Lokální vývoj balíčku

Pro iteraci na samotném `tf-doc-vault`:

```bash
# 1. v balíčku — jednorázově po cloningu
cd tf-doc-vault
pnpm install                  # deps + "prepare" hook postaví dist/
pnpm dev                      # tsc --watch + auto-copy statických assetů (.vue/.css/.json/.ico)

# 2. ve vedlejším aplikačním repu, scaffoldnutém s --dev
cd ../<něco>_ana
pnpm install                  # natáhne peer deps a slinkuje file:../tf-doc-vault
pnpm docs:dev                 # vidí změny z dist/ přes Vite HMR
```

Aplikační repo s `--dev` deklaruje závislost přes `file:`:

```json
"dependencies": { "@techfides/tf-doc-vault": "file:../tf-doc-vault" }
```

Předpoklad pro `file:` install: oba adresáře leží vedle sebe (relativní cesta `../tf-doc-vault`). Když je jinde, `--file-path=/abs/path` při scaffoldování přepíše.

## Sync šablony do existujícího repa

Když balíček přidá / opraví něco v `template/` (Dockerfile, CI, configs, Terraform), aplikační repos to nedostanou automaticky — patří jim. Pro kontrolu / přepsání:

```bash
pnpm sync           # ukáže unified diff všech driftnutých souborů
pnpm sync:apply     # přepíše drifted soubory šablonou (placeholdery se renderují z aktuálního repa)
```

User content (`docs/`, `package.json`, README, CLAUDE, custom.css, terraform.tfvars) je vyloučen z přepisování.

---

## Changelog

### v0.1.0 (tf-doc-vault)

- **Přejmenování:** `@techfides/tf-doc-vault` → `@techfides/tf-doc-vault`, CLI `tf-doc-vault` → `tf-doc-vault`. Publikováno veřejně na npmjs.com (GitHub Actions workflow na tag `v*`).
- **Tech-docs use case:** `init-tech-docs` subcommand, `setupTechDocs()` Express/NestJS middleware, šablona `template/tech-docs/`, Docker fragment [`docker/docs-build-stage.md`](docker/docs-build-stage.md).
- **`import-confluence`:** import stromů stránek z Confluence (ADF → Markdown, přílohy, inter-page linky).
- **`--root=<dir>` flag:** `validate`, `normalize` a `fix` podporují volitelný kořenový adresář (default: `docs`).
- **Version dropdown:** skrytý při jediné verzi dokumentace.

### v0.1.8

- **Sync zachová `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`.** Šablonové `.gitlab-ci.yml` mělo doteď statické `BASIC_AUTH_USER: ""` / `BASIC_AUTH_PASS: ""` — `pnpm sync:apply` tím přepisoval konzument-side credentials na prázdné. Přepnuto na placeholdery `__BASIC_AUTH_USER__` / `__BASIC_AUTH_PASS__`; `detectPlaceholders()` je čte z konzument-side `.gitlab-ci.yml`, takže sync zachová cokoli, co tam uživatel vyplnil. Nový scaffold dostane prázdné stringy (stejné chování jako dřív).

### v0.1.7

- **Runtime `serve` odstraněn.** Multi-stage Dockerfile měl tři runtime varianty (`serve` / `nginx` / `nginx-auth`); `serve` byl mrtvá nožka — lokální dev jede přes Vite (`pnpm docs:dev`, ne přes Docker), produkce stejně chce nginx kvůli auth cestě. Zůstává `nginx | nginx-auth`. Scaffolder `--server` přijímá jen tyhle dvě hodnoty (default `nginx`); existující projekty s `SERVER_TYPE=serve` musí přepnout na `nginx` v `Dockerfile` a `.gitlab-ci.yml`.

### v0.1.6

- **Sync — fix `.gitignore` / `.npmrc` mapping.** `template/_gitignore` a `template/_npmrc` se kvůli npm pack stripu jmenují s `_` prefixem; `sync` je hledal pod `.gitignore` / `.npmrc` a tiše je přeskakoval. Doplněn mapping (`templateNameFor`), drift v dotfiles teď sync vidí.

### v0.1.5

- **`terraform.tfvars` v gitu** — `_gitignore` šablony už `infra/terraform.tfvars` neignoruje. Soubor je projektově malý a stabilní (project_id, region, service_name), patří k repu. Existující projekty: `pnpm sync:apply` přepíše `.gitignore`, pak `git add infra/terraform.tfvars && git commit`.

### v0.1.4

- **Terraform tfstate v GCS** — `template/infra/main.tf` má `backend "gcs"` blok s bucketem `<gcp-project>-tfstate` a prefixem `docs-web`. Bootstrap bucketu je jednorázový krok přes `gcloud storage buckets create` před prvním `terraform init` (viz `template/README.md`). Pro existující projekty: bucket vytvořit, doplnit backend block, `terraform init -migrate-state` a smazat lokální `terraform.tfstate*` z gitu.

### v0.1.3

- **Scaffolder — `--source=git` jako default.** Volby `--source=npm` a `--source=workspace` odstraněny (npm publish není v plánu). Validní hodnoty: `git` | `file` (`--dev` shortcut zůstává).                                                                                                                   
- **Auth pro `nginx-auth`** — `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` se drží v top-level `variables:` bloku `.gitlab-ci.yml` (ne v GitLab CI/CD Variables). Šablona má prázdné placeholdery; CI je conditional propustí do `docker build` jen když nejsou prázdné.                                         
- **README** — sekce "Volby scaffolderu" sjednocena do jedné tabulky s popisem všech voleb (včetně runtime variant pro `--server`). Nové sekce: "Auth pro `nginx-auth`", "Push do GitLabu" (push-to-create flow), "Přepnutí existujícího projektu z `nginx` na `nginx-auth`".                                    

### v0.1.2

- **Nové CLI subcommandy** — `gen-diagrams`, `gen-wireframes`, `replace-wireframes` (porty z `lapa_ana/scripts`). Skripty zapisují do `<cwd>/docs/public/images/...` resp. čtou `<cwd>/docs/v1/index.md`.
- **Build podporuje `.cjs`** — `scripts/build.mjs` kopíruje `.cjs` soubory ze `src/` do `dist/`.
- **Šablona — `.prettierignore`** — nově obsahuje `pnpm-lock.yaml` a další generované soubory; `format:check` jinak řve na lockfile. Soubor je v `TRACKED_FILES` v `sync-template`, takže existující projekty si ho stáhnou přes `tf-doc-vault sync --apply`.

### v0.1.1

- **CI/Docker fixy v šabloně** — `pnpm install` v Docker builderu teď funguje s `git+ssh` závislostmi: token se předává přes `--build-arg GITLAB_CI_TOKEN`, uvnitř builderu se přepíše SSH URL na HTTPS s `gitlab-ci-token` a `/root/.gitconfig` se po install smaže (token nezůstane v image layerech). Builder image dostal `ca-certificates`, jinak HTTPS clone padá na `server certificate verification failed`.
- **CI shell** — `📦 install` job má `git config insteadOf` v `before_script`, takže pnpm git fetch funguje i mimo Dockerfile.
- **Prettier** — šablona ignoruje `.pnpm-store/`, jinak `format:check` řve na obsah pnpm cache v CI.
- **TypeScript** — šablona obsahuje `docs/.vitepress/theme/shims.d.ts` s `declare module "*.css";`, jinak `tsc` padá na `TS2882: Cannot find module ... ./custom.css` při `module: NodeNext`.
- **Předpoklad pro CI**: ve zdrojovém repu (`techfides/tf-analysis/tf-doc-vault`) musí být v Settings → CI/CD → Token Access povolený consumer projekt — `CI_JOB_TOKEN` jinak nemá oprávnění klonovat.

### v0.1.0

- Initial release.
