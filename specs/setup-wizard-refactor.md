# Implementační plán: interaktivní setup wizard

Refaktor scaffoldingu dokumentace v `@techfides/tf-doc-vault`:

1. Jeden interaktivní příkaz `tf-doc-vault setup` (wizard přes `@clack/prompts`) nahradí `tf-doc-vault create`, `init-tech-docs` i bin `create-ana`. Každý prompt má ekvivalentní flag; bez TTY nebo s kompletními flagy běží neinteraktivně.
2. `template/` a `template-tech-docs/` se sloučí do **jedné ploché `boilerplate/`** (VitePress projekt bez docs md obsahu) a `templates/<name>/` (výhradně md soubory). Volba šablony při setupu určuje, která md sada se nakopíruje a jak se boilerplate upraví.
3. `src/setup/` (express i nest mount, `setupTechDocs`, `createTechDocsHandler`) se odstraní včetně unbuild pipeline, exportů a peer dependencies.

Složka `specs/` je interní. `package.json` má whitelist `files`, takže se do balíčku nedostane; U3 to zajistí testem, aby to nebyl nehájený předpoklad.

## Klíčová rozhodnutí

- **CLI a kód jsou generické.** Nikde v `src/**` se neobjeví `ana`, `tech`, `ana-docs` ani `tech-docs`: žádný `--type=ana|tech`, žádné `EXCLUDE_TECH`, žádný registry variant. Wizard nabízí to, co najde v `templates/`, a chování si přečte z manifestu šablony. Přidání další šablony je přidání složky, ne zásah do wizardu.
- **Manifest šablony je `templates/<name>/_template.md`**: YAML frontmatter nese konfiguraci, tělo je krátký popis pro člověka. Soubor se při scaffoldu vynechává. Tím zůstává pravidlo „`templates/` obsahuje jen md" doslova splněné a veškerá znalost varianty žije v šabloně.
- **Boilerplate je jen jeden a identický pro všechny šablony.** Žádné podsložky podle varianty. Manifest z něj vyjmenuje, co se pro danou šablonu vynechá.
- **Wizard drží katalog polí, manifest je zapíná.** Katalog (klíč, typ, text promptu, validace, placeholder, default) je v kódu jednou a generický; manifest v `fields:` vybere, na co se ptát, a v `defaults:` může přepsat default. Nová šablona s novým polem si vyžádá doplnění katalogu, což je vědomý kompromis proti plně data-driven variantě.
- **Dokumentace uvnitř service repa nemá v tomto balíčku deploy story.** Build a publikaci vlastní konzument. Šablona pro podsložku proto vyjímá deploy soubory z boilerplate (`Dockerfile`, `docker/`, `.gitlab-ci.yml`, `infra/`): `Dockerfile` kopíruje `package.json`, `pnpm-workspace.yaml` a `tsconfig.json` a spouští `pnpm run docs:build`, ale šablona přesně tyto soubory vynechává a dostává jen `{private, type:module}` package.json, takže by se takový image nikdy nesestavil; `.gitlab-ci.yml` v podsložce navíc GitLab nikdy nečte. Co v šabloně zůstává: merge `docs:*` scriptů do `package.json` hostitelského repa, merge pnpm nastavení do jeho `pnpm-workspace.yaml` a append build outputů do jeho `.gitignore`.
- **Rozdíly řeší placeholdery**, ne varianty souborů: `__DOCS_BASE__`, `__SECTION_NAV__` v `docs/.vitepress/config.ts`, dál `__PROJECT__`, `__SERVICE_ID__` a spol.
- Prompty a veškerý CLI text jsou **anglicky** (AGENTS.md § Prose; všechny stávající CLI stringy jsou anglicky). České formulace v tomto plánu jsou popis pro člověka; závazné znění je v tabulce U3.

## Schéma manifestu (zmrazené, U2 ho píše, U3 ho čte)

```yaml
---
name: tech-docs # musí odpovídat názvu složky
label: Technical documentation inside an existing service repo # text ve wizard selectu
target:
  mode: subfolder # new-folder | subfolder
  path: tech-docs # jen pro subfolder
base: /tech-docs/ # default pole `base`, které plní __DOCS_BASE__
sectionNav: false # default pole `section-nav`, které plní __SECTION_NAV__
fields: [service-id, project, section-nav, base, repo] # klíče z katalogu polí
defaults:
  repo: techfides/__PROJECT_DASHED__ # smí interpolovat placeholder dříve zodpovězeného pole
exclude: # cesty z boilerplate/, které tato šablona nechce
  - README.md
  - eslint.config.js
  - tsconfig.json
  - .prettierrc
  - .prettierignore
  - _gitignore
  - _pnpm-workspace.yaml
  - package.json
  - .claude
  - Dockerfile # deploy soubory: dokumentaci v service repu nasazuje konzument sám
  - docker
  - .gitlab-ci.yml
  - infra
renames:
  docs/.vitepress/config.ts: docs/.vitepress/config.mts
host: # integrace do nadřazeného repa
  packageJsonScripts: true # merge docs:* scriptů do package.json v cwd
  devDependencies: true # doplnit chybějící peerDependencies balíčku do devDependencies v cwd
  gitignore: true # append build outputs do .gitignore v cwd
  minimalPackageJson: true # zapsat {private, type:module} do cílové složky
  pnpmWorkspace: true # merge pnpm nastavení do pnpm-workspace.yaml v cwd
git:
  init: false
lockfile: false # pre-generovat pnpm-lock.yaml
workspaceWarning: false # hlásit nadřazený pnpm workspace
---
```

Šablona `ana-docs` má `target.mode: new-folder`, `base: /`, `sectionNav: true`, `fields: [name, gcp-project, server, source, section-nav, base, repo, git]`, `defaults.repo: techfides/tf-analysis/__PROJECT__`, prázdný `exclude`, `git.init: true`, `lockfile: true`, `workspaceWarning: true`, `host.*: false`, žádné `renames`.

`host.pnpmWorkspace` existuje proto, že `tech-docs` vyjímá `_pnpm-workspace.yaml` z boilerplate (workspace soubor vlastní hostitelské repo), ale bez `publicHoistPattern` pro CJS tranzitivní závislosti mermaidu se dokumentace v dev serveru vyrenderuje jako prázdná stránka s `dayjs.min.js does not provide an export named 'default'`. Hodnoty se čtou z `boilerplate/_pnpm-workspace.yaml` až za běhu, takže existuje jediný zdroj pravdy, stejně jako u `peerDependencies`. Merge je čistě aditivní: co hostitel už deklaruje, si drží pozici i hodnotu, a druhý běh nemá co přidat.

`_template.md` se nikdy nekopíruje do výstupu. Neznámý klíč v manifestu je chyba, ne varování: wizard při načtení manifest validuje a při nesouladu (neznámé pole ve `fields`, klíč ve `defaults` mimo `fields`, hodnota ve `defaults`, která neprojde validací svého pole, neexistující cesta v `exclude`, chybějící `target.path` u `subfolder`) skončí `exit 1`. Chyba jedné složky v `templates/` shodí jen tu složku: ohlásí se jako nedostupná šablona a zbytek včetně `--help` funguje dál.

## Práce subagentů

- Každý celek zpracuje jeden subagent ve vlastním git worktree z branche `feat/setup-wizard` a zakončí ho právě jedním commitem. Conventional Commits, anglicky, **bez** `Refs:` footeru, bez Claude/Anthropic atribuce.
- Commity U1, U2 a U3 musí mít `BREAKING CHANGE:` footer s konkrétními migračními kroky. changelogen bere do `CHANGELOG.md` jen subjecty a breaking sekci; bez footeru by release 0.3.0 neobsahoval žádné migrační pokyny.
- **V každém worktree agent nejdřív spustí `pnpm install`.** `.husky/_` je gitignorovaný a generuje ho `prepare`, takže ve svěžím worktree commitlint neexistuje a git hook mlčky přeskočí. Nepoužívat `HUSKY=0`; před commitem ověřit `npx commitlint --edit`.
- Do `package.json` zapisovat jen jmenované klíče, ručně. Žádné `pnpm pkg set`, žádný formatter přes celý soubor: přeuspořádání klíčů je jediná věc, která by rozbila jinak čistý auto-merge (ověřeno simulací).
- Vlny: **vlna 1** = U1 a U2 paralelně; **vlna 2** (po začlenění vlny 1) = U3 a U4 paralelně; **vlna 3** = orchestrátor začlení, dořeší a pustí kompletní gate.
- Agent nesmí sahat mimo své soubory. Hraniční nálezy zapíše do závěrečné zprávy.

### Přehled celků

| Celek | Obsah                                                              | Model  | Vlna | Commit subject                                                                  |
| ----- | ------------------------------------------------------------------ | ------ | ---- | ------------------------------------------------------------------------------- |
| U1    | Odstranění setupTechDocs (kód, build, testy, deps, lockfile)       | sonnet | 1    | `feat!: drop the setupTechDocs express/nest integration`                        |
| U2    | Sloučení do boilerplate/ + templates/ s manifesty, copy-plan modul | opus   | 1    | `refactor!: merge the scaffolds into one boilerplate and md-only templates`     |
| U3    | Wizard `tf-doc-vault setup`, smazání starých CLI, testy            | opus   | 2    | `feat!: replace create-ana and init-tech-docs with an interactive setup wizard` |
| U4    | Dokumentace v repu + migrační poznámky                             | sonnet | 2    | `docs: document the setup wizard and consumer migration`                        |

Modely: U1 je mechanické odstraňování s přesným zadáním. U2 a U3 jsou strukturní jádro a nový uživatelský povrch, kde chyba znamená rozbitý scaffold. U4 je prozaická práce podle zmrazeného CLI kontraktu. Orchestraci a finální review dělá hlavní agent.

---

## U1: Odstranění setupTechDocs

**Cíl:** Z balíčku zmizí express/nest mount včetně build pipeline a závislostí. Netýká se šablon ani prose dokumentace.

**Smazat:** `src/setup/` (celá), `build.config.ts`, `tests/smoke/setup-express.spec.ts`, `tests/smoke/setup-nest.spec.ts`.

**Upravit:**

- `scripts/build.mjs`: odstranit unbuild krok (řádky 128 až 137, jen v non-watch větvi, `pnpm dev` je nedotčený).
- `package.json`, jen tyto klíče:
  - `description`: vypustit „Express/NestJS tech-docs mount" (je to text na npmjs.com)
  - `exports`: smazat `./setup/express`, `./setup/nest`
  - `typesVersions`: smazat `setup/express`, `setup/nest`
  - `peerDependencies` + `peerDependenciesMeta`: smazat `@nestjs/common` a `express`
  - `devDependencies`: smazat `@nestjs/common`, `@types/express`, `unbuild`. `express` v devDependencies **není**, je to jen peer; smoke probes si ho instalovaly ad hoc.
  - `scripts.lint`: odstranit mrtvý `--ignore-pattern 'src/setup/**'`
- **`pnpm-lock.yaml`**: odstranění dělat přes `pnpm remove` (nebo po ruční editaci spustit `pnpm install`) a lockfile commitnout. CI běží `pnpm install --frozen-lockfile`; bez toho spadne na `ERR_PNPM_OUTDATED_LOCKFILE` a akceptační gate celku to nezachytí.
- `tsconfig.json`: z `exclude` odstranit `"src/setup/**"` (řádek 26). Pozor: U2 mění `"template"` ve stejném poli; ověřeno, že to auto-merguje.
- `vitest.config.ts`: z coverage excludes odstranit `"src/setup/**"` (řádek 18).
- `knip.json`: z `ignoreDependencies` odstranit `@nestjs/common` a `express`. `build.config.ts` musí zmizet ve stejném commitu jako `unbuild`, knip plugin se váže na ten soubor.
- `tests/smoke/global-setup.ts`: odstranit express/nest probe bloky, fake Nest app, start těch serverů a porty `3001` až `3004` (řádek 51). Nesahat na ana/tech fixture, ty přepisuje U3.
- `tests/smoke/fixtures.ts`: odstranit `probeRoot` (řádek 15), `readyAuth` (řádky 34 a 75) a auth větev v `probe()` (řádky 47 až 58). Žádné porty tu nejsou.
- `src/index.ts`: odstranit komentář o `setupTechDocs`/unbuild (řádky 11 až 13).

**Nesahat na:** `src/cli/**` (snippet `setupTechDocs` v next-steps textu `init-tech-docs.ts:152` patří U2), `template/`, `template-tech-docs/`, `.github/**`, README, `docs/**`, AGENTS.md, `CONTRIBUTING.md`, `.claude/skills/**`.

**Akceptace:**

- `pnpm install` (lockfile aktuální), `pnpm lint && pnpm typecheck && pnpm test:unit`, `pnpm build`, `pnpm knip` zelené.
- `grep -rn "setupTechDocs\|createTechDocsHandler\|src/setup\|setup/express\|setup/nest\|unbuild" src/index.ts src/setup tests scripts package.json knip.json tsconfig.json vitest.config.ts` vrací nic. (Záměrně bez `src/cli`, ten vlastní U2, a bez `CHANGELOG.md`.)

---

## U2: Sloučení do boilerplate/ + templates/

**Cíl:** Jedna plochá `boilerplate/`, md šablony s manifesty v `templates/<name>/`, a generický copy-plan modul. Staré CLI (`create-ana`, `init-tech-docs`) na nový modul přepojit, ať je commit zelený; U3 je pak nahradí wizardem.

### Cílová struktura

```
boilerplate/
  .claude/                     # commands + skills, BEZ settings.local.json
  .gitlab-ci.yml
  .prettierrc
  .prettierignore
  CLAUDE.md                    # sloučený (viz níže)
  Dockerfile
  README.md
  _gitignore
  _pnpm-workspace.yaml
  docker/
  eslint.config.js
  import-confluence.md         # z template-tech-docs/, platí pro obě šablony
  infra/
  package.json
  tsconfig.json
  docs/.vitepress/config.ts    # sloučený, s placeholdery
  docs/.vitepress/theme/       # custom.css, index.ts, shims.d.ts (byte-identické v obou dnešních šablonách)
templates/
  ana-docs/_template.md        # manifest, nekopíruje se
  ana-docs/docs/index.md
  ana-docs/docs/v1/index.md
  ana-docs/docs/v1/{byznys,funkcni,technicka}-specifikace/index.md
  tech-docs/_template.md       # manifest, nekopíruje se
  tech-docs/docs/index.md
  tech-docs/docs/v1/index.md
```

**Pravidlo inventáře, nadřazené výčtu výše:** do `boilerplate/` jde **vše z `template/`** kromě `docs/**/*.md` (ty jdou do `templates/ana-docs/`) a kromě `.claude/settings.local.json` (lokální nastavení, nemá se propagovat do konzumentů), plus z `template-tech-docs/` jen `import-confluence.md` a obsah sloučený do `CLAUDE.md` a `config.ts`. Výčet výše je ilustrace; závazné je toto pravidlo a akceptační kontrola počtu souborů. Dnešní `template/` obsahuje i `.gitlab-ci.yml`, `.prettierrc` a `.prettierignore`, které jsou snadné přehlédnout a přitom jsou v `TRACKED_FILES` v `src/scripts/sync-template.ts:19-34`.

Přesuny dělat přes `git mv`. `templates/` obsahuje výhradně `.md`.

**Smazat:** `template-tech-docs/docs-build-stage.md` (souvisel s odstraněným mountem), `template-tech-docs/package.json` (minimální `{private, type:module}`, generuje ho `host.minimalPackageJson`), `template-tech-docs/docs/.vitepress/theme/**` a `template-tech-docs/docs/**/*.md` po sloučení, `template/.claude/settings.local.json`.

**Napsat:** `templates/ana-docs/_template.md` a `templates/tech-docs/_template.md` podle schématu výše. Hodnoty `exclude`, `renames`, `host.*`, `git.init`, `lockfile`, `workspaceWarning` odvodit z dnešního chování `create-ana.ts` a `init-tech-docs.ts`, ať se scaffold nezmění.

### Sloučení dvou souborů

**`boilerplate/docs/.vitepress/config.ts`:** vyjít z `template/docs/.vitepress/config.ts` a zavést placeholdery:

- `override: { base: "__DOCS_BASE__" }` (dnes `"/"` u ana, `"/tech-docs/"` u tech)
- `sectionNav: __SECTION_NAV__` (dnes implicitně zapnuté u ana, `false` u tech)
- edit-link blok nechat zakomentovaný, ale v jednom bloku pokrýt oba hosty: `repo: "__REPO__"` a komentář o `host: "https://github.com"` pro GitHub (GitLab je default). Návodné komentáře z obou variant zachovat, ne zahodit.

**`boilerplate/CLAUDE.md`:** základ je `template/CLAUDE.md` (206 řádků, generická pravidla generování dokumentace, platí pro obě šablony). Z `template-tech-docs/CLAUDE.md` (62 řádků) do něj přenést sekce `Structure`, `Editing conventions`, `Rules for AI agents`, `Local preview`, `Validation` jen v částech, které v ana verzi nejsou (ana sekce 4 a 5 většinu už pokrývají); sekci `Serving from the running service` (řádky 58 až 62) nepřenášet, zaniká s mountem. Duplicity nevytvářet. Text musí zůstat generický, bez odkazů na konkrétní šablonu.

### Nový modul `src/cli/scaffold.ts`

Generické, čisté funkce; FS operace delegovat na `utils.ts`:

- `listTemplates()` → načte `templates/*/_template.md`, zparsuje frontmatter, zvaliduje a vrátí manifesty. Zdroj pravdy o dostupných šablonách; nikde žádný hardcoded seznam.
- `resolveCopyPlan(manifest, answers)` → `{ sources, exclude, renames, placeholders, target }`. `sources` je `[boilerplate, templates/<name>]` v tomto pořadí. `exclude` = `manifest.exclude` plus vždy `_template.md`.
- Rename pravidla: přenést `consumerName` z `create-ana.ts:132-137` **nezměněné, všechny tři případy** včetně `_npmrc` → `.npmrc` (v `template/` dnes žádný `_npmrc` není, takže je větev mrtvá, ale zrcadlí ji `sync-template.ts:176-180` a `.npmrc` je v `TRACKED_FILES`; nerozpojovat to jednostranně). Rename pravidla specifická pro šablonu bere z `manifest.renames` (důvod `config.ts` → `config.mts` z komentáře v `init-tech-docs.ts:116-118` přenést do manifestu jako komentář v těle `_template.md`).
- Přesunout z `create-ana.ts`: `resolveSource`, `resolveDependencyValue`, `originUrl` včetně JSDoc a komentářů.

**Semantika vrstvení a idempotence** (jinak si protiřečí s `copyDir`): `copyDir` s `idempotent: true` (`utils.ts:81`) přeskočí každý existující cíl, takže kopírování zdrojů po sobě by dalo vyhrát **prvnímu**, ne poslednímu, a `skipped` počítadlo by mísilo kolize zdrojů s existujícími soubory konzumenta. Implementace: složit zdroje do temp složky s `idempotent: false` (pozdější přepisuje), pak jedním `copyDir(..., { idempotent: true })` do cíle a `copied`/`skipped` reportovat jen z tohoto posledního kroku.

### Další úpravy

- `src/cli/create-ana.ts` a `src/cli/init-tech-docs.ts`: přepojit na `listTemplates` + `resolveCopyPlan` (natvrdo si vyžádají manifest `ana-docs`, resp. `tech-docs`, protože je U3 stejně smaže); výstupy a placeholder mapy jinak neměnit. Z next-steps výpisu `init-tech-docs.ts:132-169` odstranit kroky odkazující na `setupTechDocs`, `TECH_DOCS_PASSWORD` a docs-build stage (dnešní 4, 5, 6, 8) a přečíslovat.
- `src/scripts/sync-template.ts`: `TEMPLATE_DIR` → `boilerplate/` (plochá, žádné vrstvy). Navíc: `inspect()` na řádku 186 vrací `status: "ok"`, když protějšek v šabloně chybí, takže ztracený soubor by `sync` mlčky odhlásil jako v pořádku. Změnit na explicitní chybový status, ať je tato třída regrese hlasitá.
- `package.json`: ve `files` nahradit `template`, `template-tech-docs` za `boilerplate`, `templates`. V `exports` nahradit `"./template"` a `"./template-tech-docs"` za **wildcard** `"./boilerplate/*": "./boilerplate/*"` a `"./templates/*": "./templates/*"`. Ověřeno na Node v24: bare directory export nic neresolvuje (dnešní `"./template"` je mrtvý), wildcard resolvuje vnořený soubor.
- `.prettierignore`: `template/` a `template-tech-docs/` → `boilerplate/` a `templates/`. **Obě musí zůstat ignorované.** `boilerplate/.prettierrc` odkazuje na `@techfides/tf-doc-vault/prettier`, což z tohoto repa nejde resolvovat (prettier na `boilerplate/**` skončí hard errorem), a 3 ze 7 md šablon nejsou pod defaultní konfigurací repa prettier-clean (ověřeno). `.gitignore` žádný `template` záznam nemá, tam není co dělat.
- **`.github/workflows/ci.yml:61`**: hadolint `dockerfile: template/Dockerfile` → `boilerplate/Dockerfile`. Bez toho spadne verify job na každém pushi.
- `tsconfig.json` `exclude`: `"template"` → `"boilerplate"`, `"templates"`.
- `scripts/e2e-happy-path.sh`: aktualizovat komentáře na řádcích 10, 35 a 48 zmiňující `template`/`create-ana`. Samotné volání CLI mění U3.
- `tests/smoke/exports.spec.ts`: do `SUBPATHS` přidat `@techfides/tf-doc-vault/templates/ana-docs/docs/index.md` (funguje díky wildcardu).

**Nesahat na:** `src/setup/**`, `tests/smoke/global-setup.ts` (U1 z něj odebírá probes, U3 přepisuje fixtures; stálou cestu k šablonám tam nechat a zmínit ve zprávě), ostatní smoke specs kromě `exports.spec.ts`, README, `docs/**`, AGENTS.md, `CONTRIBUTING.md`.

**Testy:** nový `tests/unit/cli/scaffold.test.ts` (parsování a validace manifestů, copy plan pro obě šablony, pořadí zdrojů, `exclude` včetně `_template.md`, rename pravidla, idempotence semantika, chyba na neznámém klíči a na neexistující cestě v `exclude`). `tests/unit/cli/create-ana.test.ts` upravit na nové importy. Přidat unit test na `sync-template` resolution (dnes žádný nemá a jeho jediné pokrytí je smoke, který U2 nepouští).

**Akceptace:**

- `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm format:check` zelené. `format:check` je tu proto, že přejmenování ignorovaných složek je přesně to, co ho rozbije.
- **Diff scaffoldu proti stavu před refaktorem** (jediná kontrola, která odhalí ztracený soubor nebo špatné pořadí; typecheck a lint pokrývají jen `src/**`, smoke U2 nepouští): `pnpm build`, pak scaffoldovat obě šablony starými CLI do temp složek a `find | sort` porovnat s týmž výpisem z commitu před refaktorem. Jediný povolený rozdíl je zmizelý `docs-build-stage.md` a `settings.local.json`.
- Každý záznam v `TRACKED_FILES` v `sync-template.ts` se dá vyresolvovat na existující soubor v `boilerplate/`.
- `git show --stat -M <commit>` ukazuje přesuny jako renames, ne delete+add. `git log --follow -- boilerplate/Dockerfile` (nemodifikovaná cesta) vrací historii.
- `grep -rn "template-tech-docs\|template/" src tests scripts .github package.json tsconfig.json .prettierignore` vrací nic.
- `grep -rniE "\bana\b|\btech-docs\b|\bana-docs\b" src/cli/scaffold.ts src/scripts/sync-template.ts` vrací nic. (V přepojených `create-ana.ts`/`init-tech-docs.ts` názvy zbývají, protože ty soubory U3 maže.)

---

## U3: Wizard `tf-doc-vault setup`

**Cíl:** Jediný generický setup příkaz s interaktivním dialogem i plně neinteraktivním režimem. Startuje po začlenění vlny 1.

### CLI kontrakt (zmrazený, U4 z něj píše dokumentaci)

`tf-doc-vault setup [name] [flags]`, sibling skript `dist/cli/setup.js`.

Katalog polí. Wizard zná tuto tabulku; manifest šablony přes `fields:` určuje, na co se ptá, a přes `defaults:` může přepsat default.

Pořadí polí v tabulce je pořadí katalogu, tedy i pořadí promptů. Každé promptované pole nese jednořádkový `hint`, který wizard vypíše pod prompt; u selectu ho nesou jednotlivé volby.

| Flag / pole                                          | Default                             | Plní                                               | Prompt (anglicky, závazné znění)                                                                                                                                     |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--template=<name>`                                  | —                                   | volba šablony                                      | select `Which template do you want to use?`, volby se generují z `label` nalezených manifestů                                                                        |
| `[name]` pozičně (pole `name`)                       | —                                   | `__PROJECT__`, `__PROJECT_DASHED__`, cílová složka | text `Project name`, hint `Names the folder created here; lowercase letters, digits, - and _.`, validace `^[a-z][a-z0-9_-]*$`                                        |
| `--gcp-project` (`gcp-project`)                      | `tfsa-<name s pomlčkami>`           | `__GCP_PROJECT__`                                  | text `GCP project ID`, hint `Written to infra/terraform.tfvars; you can edit it there later.`                                                                        |
| `--server=nginx\|nginx-auth` (`server`)              | `nginx`                             | `__SERVER_TYPE__`                                  | select `Server flavour`; volba `nginx (recommended)` s hintem o obyčejném statickém hostingu, `nginx-auth` s hintem o Basic auth a o tom, kdo si dokumentaci přečte  |
| `--source=npm\|git\|file` (`source`)                 | `npm`                               | `__VITEPRESS_COMMON_DEP__`                         | **bez promptu** (`flagOnly`): konzument chce vždy publikovanou verzi, volba zdroje je věc údržby balíčku                                                             |
| `--dev`, `--file-path`, `--ref`, `--git-url`         | dnešní defaulty                     | `__VITEPRESS_COMMON_DEP__`                         | bez promptu, companion flagy pole `source`; validace a warningy převzít z `create-ana`                                                                               |
| `--service-id` (`service-id`)                        | —                                   | `__SERVICE_ID__`                                   | text `Service ID (for example BAT)`, hint `Short identifier of the service, shown in the documentation titles.`                                                      |
| `--project` (`project`)                              | basename cwd                        | `__PROJECT__`, `__PROJECT_DASHED__`                | text `Project name`, hint `Shown in the documentation titles; defaults to this folder's name.`                                                                       |
| `--section-nav` / `--no-section-nav` (`section-nav`) | z `manifest.sectionNav`             | `__SECTION_NAV__`                                  | confirm `Show a top navigation link per documentation section?`, hint `Off gives one flat sidebar over all sections and no section links.`                           |
| `--base=<path>` (`base`)                             | z `manifest.base`                   | `__DOCS_BASE__`                                    | text `Base path the site is served from`, hint `Has to match the URL path the site is published under, slash at each end.`, validace: musí začínat a končit lomítkem |
| `--repo` (`repo`)                                    | prázdné, nebo z `manifest.defaults` | `__REPO__`                                         | bez promptu (flag-only): hodnota jen předplní zakomentovaný `editLink` blok, takže dotaz v dialogu nemá viditelný efekt                                              |
| `--git` / `--no-git` (`git`)                         | z `manifest.git.init`               | post-krok                                          | confirm `Initialize a git repository?`, hint `Runs git init in the new folder and commits the scaffold.`                                                             |
| `--help`, `-h`                                       | —                                   | —                                                  | bez promptu; vypíše usage a `exit 0`. Flagy s `flagOnly` jsou v usage pod vlastním nadpisem `Maintainer and local-development options, never prompted for:`          |

Pevná pravidla, ať se U3 a U4 nerozejdou:

- **Jediná forma jména projektu je poziční argument.** Žádný `--name`.
- **Neinteraktivní režim:** když `process.stdin.isTTY` nebo `process.stdout.isTTY` je nepravdivé, nikdy nepromptovat. Chybí-li povinná hodnota (`--template`, nebo pole z `fields:` bez defaultu), vypsat na stderr chybu se seznamem chybějících flagů a `exit 1`. Žádný `--yes`, žádná detekce `CI`: ne-TTY je jediný přepínač. (`scripts/e2e-happy-path.sh` přesměrovává stdout, takže tam to platí.)
- Neznámá hodnota `--template`: chyba na stderr se seznamem dostupných šablon, `exit 1`.
- Flag, který není v `fields:` zvolené šablony: warning na stderr, hodnota se ignoruje, běh pokračuje. Stejná logika jako dnešní warning u `--ref` mimo `--source=git`. Flag mimo celou známou množinu (typo v názvu) dostane warning taky, jinak by neinteraktivní běh mlčky použil default.
- Confirm flag nebere hodnotu: `--git=false` je chyba se zmínkou obou platných forem, ne mlčky zahozená hodnota. Value flag bez hodnoty (`--base`, `--service-id`) je chyba také.
- **Prázdný `--repo`** (a prázdná odpověď v promptu): `__REPO__` se nahradí prázdným stringem. Dnešní `init-tech-docs.ts:126` substituuje jen při zadaném flagu, takže by v `config.ts` zůstal literál `__REPO__`; na defaultní cestě se na to dosud nešlo.
- Zrušení promptu (Ctrl+C, `isCancel`): `exit 1` bez vedlejších efektů.
- Průběh: `intro` → select šablony → prompty podle `fields:` → shrnutí voleb → copy plan z `scaffold.ts` → `replacePlaceholders` → post-kroky podle manifestu → `outro` s next steps.
- Post-kroky jsou řízené manifestem, ne názvem šablony: `target.mode` (nová složka z `name`, nebo podsložka `target.path`), `host.packageJsonScripts` (merge `docs:*` scriptů do `package.json` v cwd, cesty derivovat z `target.path`), `host.gitignore` (append build outputs, cesty derivovat z `target.path`), `host.minimalPackageJson`, `host.devDependencies`, `host.pnpmWorkspace`, `git.init`, `lockfile`, `workspaceWarning`. Chování jednotlivých kroků převzít z dnešních CLI beze změny.
- **`host.pnpmWorkspace`** zapíše `publicHoistPattern` a `allowBuilds` do `pnpm-workspace.yaml` v cwd; soubor založí, když neexistuje. Hodnoty čte z `boilerplate/_pnpm-workspace.yaml`. Merge nikdy nic nemaže ani nepřeuspořádává, respektuje odsazení, které hostitelův soubor používá, a porovnává hodnoty bez uvozovek (`"*mermaid*"` a `*mermaid*` je totéž). Když hostitel píše některý z těch dvou klíčů inline (`publicHoistPattern: [...]`), merge se nedotkne souboru a vypíše blok k ručnímu doplnění, protože přidání položek seznamu pod flow zápis by dalo nevalidní YAML.
- **`--base` a `--section-nav` jsou promptovaná pole**, jejichž default je `manifest.base`, resp. `manifest.sectionNav`. `resolveCopyPlan` proto žádné placeholdery nevrací: `resolvePlaceholders` má hodnoty z manifestu jako spodní vrstvu a odpověď je přebíjí, takže o `__DOCS_BASE__` a `__SECTION_NAV__` rozhoduje jedno místo.
- Soubor musí mít shebang a `invokedAsScript` realpath guard jako `create-ana.ts:348-360`, aby unit test mohl importovat čisté funkce bez spuštění `main()`.

### Změny

- Přidat `@clack/prompts` do `dependencies` (`pnpm add`, commitnout lockfile). Schváleno; bundlují ho create-vite, nuxi i create-t3-app.
- Nový `src/cli/setup.ts`. Logiku „flagy plus odpovědi → konfigurace scaffoldu" napsat jako čisté funkce s injektovatelnou prompt vrstvou (`resolveAnswers(manifest, flags, promptFn)`), ať jde dialog testovat bez TTY.
- Smazat `src/cli/create-ana.ts` a `src/cli/init-tech-docs.ts`.
- `src/cli/tf-doc-vault.ts`: subcommand `setup` místo `create` a `init-tech-docs`; aktualizovat usage text **i JSDoc hlavičku souboru** (řádky 2 až 6, ta také jmenuje mazané příkazy). Usage nesmí jmenovat konkrétní šablony, jen `--template=<name>` s odkazem, že seznam vypíše `setup --help`.
- `package.json`: odstranit bin `create-ana`.
- `tests/unit/cli/create-ana.test.ts` → `setup.test.ts`: zachovat testy helperů, doplnit neinteraktivní validaci (chybějící `--template`, chybějící povinné pole, ne-TTY chování, neznámá šablona, cizí flag warning, prázdný `--repo`) a průchod fake prompt vrstvou. Testy nesmí předpokládat konkrétní šablony jinak než jako fixture manifest.
- `tests/smoke/global-setup.ts`: ana fixture přes `node dist/cli/setup.js ana_test --template=ana-docs --source=file --file-path=<tgz> --gcp-project=... --no-git`, tech fixture přes `setup --template=tech-docs --service-id=...`. Zachovat dnešní placeholder hodnoty.
- **`tests/smoke/tech-docs-preview.spec.ts`**: dnes běží `vitepress preview docs` s `cwd: sandboxes.techDocsDir`, protože fixture kopíruje šablonu tak, že `docs/` leží přímo tam. Wizard zapisuje do `<cwd>/<target.path>/`, takže `docs/` klesne o úroveň. Buď `techDocsDir` ve fixture nasměrovat na `<sandbox>/tech-docs`, nebo upravit spec. Tvrzení „navazující specs projdou beze změny" neplatí.
- `tests/smoke/cli-subcommands.spec.ts`: **přidat** case `setup --help` do `SUBCOMMANDS`. Soubor dnes žádný `create` ani `init-tech-docs` neobsahuje, není co odebírat.
- `tests/smoke/exports.spec.ts` nebo nový unit test: assertovat, že packed tarball (`pnpm pack --dry-run`, global-setup ho už staví) neobsahuje žádnou cestu začínající `specs/`.
- `scripts/e2e-happy-path.sh:55`: `dist/cli/create-ana.js demo_ana ...` → `dist/cli/setup.js demo_ana --template=ana-docs ...`, **včetně zachování dnešního `--gcp-project`** a ostatních flagů.

**Nesahat na:** README, `docs/**`, AGENTS.md, `CONTRIBUTING.md`, `BRANDING.md`, `.claude/skills/**`, `boilerplate/**`, `templates/**`, `.github/**`, `playground/**`.

**Akceptace:**

- `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:smoke && pnpm format:check` zelené.
- `tf-doc-vault setup --help` vypíše dostupné šablony z `templates/`, ne pevný seznam.
- Neinteraktivní běh bez povinných flagů končí `exit 1` se srozumitelnou hláškou.
- `grep -rn "create-ana\|init-tech-docs" src tests scripts package.json` vrací nic.
- `grep -rniE "\bana\b|\bana-docs\b|\btech-docs\b" src/cli src/scripts` vrací nic. Jediné povolené výskyty názvů šablon v celém repu jsou `templates/*/`, jejich manifesty, smoke fixtures, e2e skript a prose dokumentace.

---

## U4: Dokumentace a migrační poznámky

**Cíl:** Repo dokumentace odpovídá novému stavu. Vychází z tohoto spec souboru (schéma manifestu, CLI kontrakt U3, Dopad na konzumenty), ne z kódu, proto může běžet paralelně s U3.

**Upravit (11 souborů, všechny ověřeně obsahují zastaralé odkazy):**

- `README.md`: scaffolding přepsat na `tf-doc-vault setup` (interaktivní ukázka i neinteraktivní příklady pro CI); vysvětlit vztah `boilerplate/` a `templates/` a že přidání šablony je přidání složky s `_template.md`; odstranit `setupTechDocs`, express/nest mount, `create-ana`; v tabulce exportů nahradit řádek `template` za `boilerplate`/`templates`; opravit `pnpm dlx @techfides/tf-doc-vault@latest create ...` (řádek 78) na `setup`; přidat sekci „Migration to 0.3" podle sekce níže.
- `CONTRIBUTING.md` (publikuje se v tarballu, takže mrtvý odkaz jde ke konzumentům): řádky 148 až 149 (propagace `template-tech-docs/`), 155 (`tsc + unbuild emits dist/setup/...`), 173 a 198 (odkaz na smazaný `docs-build-stage.md`, celá sekce „Pre-publish Dockerfile fragment" ztrácí předmět), 204 až 206 (pre-commit checklist tvrdí, že `pnpm pack --dry-run` obsahuje `template/` a `template-tech-docs/`; přepsat na `boilerplate/`, `templates/` a „žádné `specs/`"). Doplnit krátký popis, jak se přidává nová šablona.
- `docs/tech-docs.md`: odstranit express/nest mount, `TECH_DOCS_PASSWORD`, odkaz na `docs-build-stage.md`; popsat obě cesty servírování podle rozhodnutí výše.
- `docs/ana-docs.md`: `tf-doc-vault create` → `setup --template=ana-docs`, cesty `template/` → `boilerplate/`.
- `docs/README.md`: index guidů, řádky 7 až 8 (`init-tech-docs`, „scaffolded by `create`").
- `docs/confluence-import.md:44`: odkaz `../template-tech-docs/import-confluence.md` → `../boilerplate/import-confluence.md`.
- `docs/TESTING.md`: odstranit setup-express/setup-nest smoke testy, aktualizovat zmínku o `create-ana` (řádek 26) a `template/` cesty; popsat nové smoke pokrytí wizardu.
- `AGENTS.md`: project overview (bez „Express/NestJS tech-docs mount"), repo map (`src/setup` pryč; `template/` a `template-tech-docs/` → `boilerplate/` a `templates/` včetně role `_template.md`; přidat `specs/` s poznámkou, že je interní a nepublikuje se), Architecture, Domain glossary (doplnit, že `ana-docs` a `tech-docs` jsou názvy šablon, ne pojmy v kódu), Hard limits (vyhodit bullet o `src/setup/**` re-exportu a unbuild, přidat bullet, že `src/**` nesmí referencovat konkrétní šablonu), **a sekci Comments** (řádek 65 jmenuje `template/` i `template-tech-docs/` a `setupTechDocs` v JSDoc výčtu).
- `BRANDING.md`: řádky 45 (odkaz na `template/`) a 259 (popis `create-ana` scaffolderu).
- `playground/docs/index.md:54`: v repo-map tabulce `create-ana` → `setup`.
- `.claude/skills/prerelease-check/SKILL.md`: řádky 90, 92, 97 (bin je „`tf-doc-vault` + `create-ana`", „config/template/docker subpaths", „Dispatcher subcommands unchanged: `create`, `init-tech-docs`") a kontroly setup mountu.

**Pravidla prózy:** anglicky (repo konvence), žádná em dash, žádné „not just X, but Y", žádné marketingové přívlastky. Migrace věcně: co zmizelo, čím to nahradit.

**Akceptace:** `pnpm format:check` zelené; `grep -rnE "setupTechDocs|createTechDocsHandler|create-ana|init-tech-docs|template-tech-docs|template/|tf-doc-vault create|TECH_DOCS_PASSWORD|docs-build-stage|setup/(nest|express)" README.md CONTRIBUTING.md BRANDING.md docs playground/docs/index.md AGENTS.md .claude/skills` vrací jen záměrné zmínky v migračních sekcích (staré názvy příkazů se v migraci uvést musí).

**Nesahat na:** cokoli mimo vyjmenovaných 11 souborů. Zejména ne `package.json` (vlastní U1 a U3), `src/**`, `tests/**`, `boilerplate/**`, `templates/**`.

---

## Dopad na konzumenty (podklad pro U4)

Breaking change. Verze 0.2.10 → **0.3.0**: changelogen mapuje `!` na major a u `0.x` ho degraduje na minor (ověřeno v `bumpVersion`).

1. **Subpath exporty `@techfides/tf-doc-vault/setup/express` a `/setup/nest` neexistují.** Service repa (např. srvc-bat) musí z `main.ts` odstranit import a volání `setupTechDocs(...)`, přestat nastavovat `TECH_DOCS_PASSWORD` a z Dockerfile odstranit docs-build stage.
2. **Dokumentace uvnitř service repa nemá v tomto balíčku deploy story.** Není součástí běžící aplikace na `/tech-docs` a balíček k ní nedodává ani Dockerfile, ani CI, ani Terraform: build a publikaci vlastní konzument. Scaffold do podsložky dá `docs/`, VitePress config a `docs:*` scripty v `package.json` hostitelského repa; zbytek je na jeho vlastní pipeline. Base path je konfigurovatelný (`--base`), takže portál na jiné cestě než `/tech-docs/` nerozbije assety.
3. **Migrace není vynucená.** Scaffoldy pinují přesnou verzi (`resolveDependencyValue` vrací `ctx.version`) a konzumenti s dokumentací uvnitř service repa si závislost přidávají ručně, typicky caret rozsahem, který pod 0.x pravidly 0.3.0 nezahrne. Nikoho k upgradu nic nedotlačí a 0.2.x dál funguje. Přechod se musí komunikovat mimo balíček; teprve při ručním zvednutí verze selže build na nerezolvovatelném importu.
4. **CLI:** bin `create-ana` a subcommandy `tf-doc-vault create` a `init-tech-docs` neexistují. Náhrada:
   - `create-ana <name> --gcp-project=X --server=Y --source=Z [--no-git]` → `tf-doc-vault setup <name> --template=ana-docs --gcp-project=X --server=Y --source=Z [--no-git]`
   - `tf-doc-vault init-tech-docs --service-id=ID --project=P --repo=R` → `tf-doc-vault setup --template=tech-docs --service-id=ID --project=P --repo=R`
   - Dokumentovaný vstupní bod `pnpm dlx @techfides/tf-doc-vault@latest create ...` přestane fungovat ve chvíli publikace 0.3.0, protože `@latest`. Oprava dokumentace musí jít ve stejném releasu.
   - Bez TTY wizard nepromptuje a při chybějících povinných flazích selže; CI skripty se musí přepsat na flagy.
5. **Subpath exporty `./template` a `./template-tech-docs` nahradily `./boilerplate/*` a `./templates/*`.** Staré formy nic neresolvovaly (bare directory export), takže je reálně nikdo použít nemohl; nové wildcard formy fungují.
6. **`peerDependencies` už neobsahují `express` ani `@nestjs/common`.** Instalace je lehčí, warningy zmizí.
7. **Existující vygenerovaná repa fungují beze změny.** Scaffold je jednorázový, `.gitlab-ci.yml` v nich volá jen přežívající subcommandy (`docs:validate`, `docs:print`, `docs:build`) a `sync` je manuální script, ne CI job. `tf-doc-vault sync` po upgradu porovnává proti `boilerplate/` se stejnou množinou souborů; navíc už nehlásí chybějící protějšek jako „v pořádku".
8. **Nové scaffoldy nedostávají `.claude/settings.local.json`.** Dosud se lokální nastavení kopírovalo do každého vygenerovaného repa.
9. **Obsah npm balíčku:** místo `template/` a `template-tech-docs/` obsahuje `boilerplate/` a `templates/`. `specs/` se nepublikuje (hájeno testem).
10. **Nová šablona se přidá bez zásahu do kódu:** složka v `templates/` s `_template.md` a md obsahem. Wizard ji nabídne sám.

## Orchestrace (vlna 3, hlavní agent)

1. Po vlně 1 začlenit U1 a U2 **cherry-pickem** jednotlivých commitů na `feat/setup-wizard`, ať historie zůstane lineární a `rebase -i --autosquash` použitelný. Merge commity by to zkomplikovaly. Rename detekce tím netrpí, git ji dělá při diffu.
2. Očekávané dotyky ve stejných souborech: `package.json` (U1 exports/deps, U2 files/exports), `tsconfig.json` (oba `exclude`), `tests/smoke/global-setup.ts` (U1 probes, U3 fixtures). Simulace ukázala čistý auto-merge u všech tří, pokud agenti needitují nic mimo jmenované klíče a nepustí formatter přes `package.json`. Skutečný konfliktní kandidát je `pnpm-lock.yaml` (U1 a U3 oba mění závislosti, ale v různých vlnách).
3. Spustit vlnu 2 z aktualizované branche, poté začlenit U3 a U4.
4. Finální gate: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit i smoke), `pnpm build`, `pnpm knip`, `pnpm format:check`, `pnpm licence-check`, `pnpm pack --dry-run` (kontrola obsahu: `boilerplate/`, `templates/`, žádné `specs/`), ruční průchod `tf-doc-vault setup` pro obě šablony do scratch složky včetně `pnpm docs:build`, a kontrola, že `grep -rniE "\bana\b|\bana-docs\b|\btech-docs\b" src` vrací nic.
5. Opravy z finálního gate fixupovat do commitu vlastnícího celku.
6. PR otevírat až po explicitním souhlasu.
