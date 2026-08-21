# Vynucení politiky komentářů a dokumentace

**Cíl:** agent pracující v tomto repu na konci každého turnu, ve kterém měnil
soubory, automaticky projde svoje změny a odstraní komentáře a prózu, které
porušují pravidla v AGENTS.md. Bez ručního připomínání. Pravidla samotná
zůstávají v AGENTS.md jako jediný zdroj pravdy; nové je jejich deterministické
vynucení.

**Proč hook a ne přísnější text:** pravidla v AGENTS.md jsou pro model jen
kontext a při delší session se ředí. Oficiální dokumentace Claude Code
doporučuje pro vynucení projektových pravidel hooky ("certain actions always
happen rather than relying on the LLM to choose to run them"). Stop hook
s exit 2 zabrání ukončení turnu a vrátí agentovi instrukci; model ho nemůže
obejít. Ochrana proti smyčce (`stop_hook_active`) i strop 8 bloků za sebou
jsou dokumentované vlastnosti harness.

## Komponenty

### 1. Skill `.claude/skills/comment-audit/SKILL.md`

Striktní úklidový průchod nad změněnými soubory. Spustitelný i ručně jako
`/comment-audit`; Stop hook ho vynucuje automaticky.

Postup, který skill předepisuje:

1. Sesbírat změněné soubory: `git diff --name-only HEAD` plus untracked
   (`git ls-files --others --exclude-standard`). Filtr:
   - kód: `.ts`, `.vue`, `.css`, `.yml`, `.yaml`, `.sh` kdekoli mimo `dist/`
     a `node_modules/` (včetně `boilerplate/` a `templates/`, pravidla tam platí);
   - markdown: `docs/**`, `specs/**`, root `*.md`, `templates/**/*.md`.
2. Na každý **přidaný** komentářový řádek v diffu aplikovat oba testy
   z AGENTS.md (věděl by to kompetentní čtenář z kódu? rozbije něco jeho
   smazání?). Při pochybnosti smazat, ne nechat.
3. Markdown měřit stejnými testy plus pravidly prózy: smazat výplň,
   přeříkávání kódu, marketingová adjektiva, konstrukci "not just X but Y",
   vynucené trojice; nahradit em dash. JSDoc na publikovaném API zůstává,
   jen krátký.
4. Výstup do konverzace: seznam smazaného a seznam ponechaného, u každé
   ponechané položky jednořádkové zdůvodnění, proč testy prošla. Prázdný
   audit ("nic přidáno, nic ke smazání") je platný výsledek.

Skill needituje nic mimo soubory z bodu 1 a nesahá na obsah, který nesouvisí
s komentáři/prózou (žádné drive-by refactory).

### 2. Stop hook `.claude/hooks/comment-audit-gate.mjs`

Zapojený v **commitnutém** `.claude/settings.json` (platí pro každého, kdo
v repu pustí Claude Code; `settings.local.json` zůstává nedotčený).

Celý skript v Node (>= 24 je v repu zaručený): JSON, SHA-256 i git subprocesy
bez závislosti na jq/shasum. Logika (stdin = JSON od harness):

1. `stop_hook_active == true` (agent právě dokončil vynucený audit):
   spočítat hash aktuálního stavu změn, uložit do stavového souboru,
   `exit 0`.
2. Sesbírat změněné relevantní soubory (stejný filtr jako skill). Žádné:
   `exit 0`.
3. Hash stavu změn == uložený hash (tahle sada změn už audit prošla):
   `exit 0`.
4. Jinak `exit 2` a na stderr instrukce: "Changed files detected. Invoke the
   comment-audit skill on the changed files before finishing."

Hash = SHA-256 nad `git diff HEAD` + obsahem untracked relevantních souborů.
Stavový soubor `claude-comment-audit-state` leží v git adresáři checkoutu
(`git rev-parse --absolute-git-dir`): per klon i per worktree, netrackovaný.
V linked worktree je `<root>/.git` soubor, přímý zápis do něj by selhal.

Ukládá se až **po** auditu (krok 1), ne při bloku: tím stav konverguje na
post-audit podobu diffu a další turn bez editací projde bez opakovaného
auditu. Selhání skriptu (chybějící git, rozbitý JSON) nesmí blokovat práci:
každá neočekávaná chyba končí `exit 0`.

### 3. Úpravy AGENTS.md

Do sekce Conventions/Prose doplnit:

- markdown v tomto repu (docs/, specs/, root) podléhá stejným dvěma testům
  jako komentáře; při pochybnosti smazat;
- zmínka, že úklid vynucuje Stop hook přes skill `comment-audit`, a že skill
  jde pustit i ručně.

### 4. Dokumentace

CONTRIBUTING.md: krátký odstavec o hooku a skillu (co dělá, jak ho ručně
spustit, jak funguje stavový soubor, že strop 8 bloků řeší harness).
Stejný commit jako implementace, podle pravidla "docs describe reality".

## Testy

Hook skript je čistá funkce (stdin JSON + stav repa → exit kód), testovatelná
jako subproces, což odpovídá zvyku repa testovat skripty přes `dist/*.js`
subprocesy. Vitest spec `tests/unit/hooks/comment-audit-gate.test.ts`
v dočasném git repu ověří:

- `stop_hook_active: true` → exit 0 a zapsaný stavový soubor;
- čistý strom → exit 0;
- změněný `.ts` soubor bez záznamu ve stavu → exit 2 a instrukce na stderr;
- stejný diff se shodným uloženým hashem → exit 0;
- rozbitý JSON na stdin → exit 0 (fail-open).

Skill samotný je próza, netestuje se automatem; jeho účinnost se vyhodnotí
používáním.

## Mimo rozsah (záměrně)

- Git pre-commit heuristika (lefthook): rozhodnuto vynucovat jen v Claude
  Code; případná pojistka pro ostatní agenty je samostatné budoucí téma.
- PostToolUse připomínky po každé editaci: hlučnější a slabší než jeden
  závěrečný průchod.
- Automatické mazání komentářů deterministickým skriptem: grep neumí
  posoudit, jestli komentář nese informaci; posouzení zůstává na agentovi,
  hook garantuje jen to, že průchod proběhne.
