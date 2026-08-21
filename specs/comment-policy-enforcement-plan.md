# Vynucení politiky komentářů: implementační plán

> **Pro agenty:** plán se vykonává přes `superpowers:subagent-driven-development`.
> Kroky jsou zaškrtávací (`- [ ]`). Zadání je `specs/comment-policy-enforcement.md`,
> tenhle dokument je jeho rozpad na commity.

**Cíl:** na konci každého turnu Claude Code, ve kterém se změnily soubory,
proběhne vynucený audit komentářů a prózy podle AGENTS.md; jednou na jednu
sadu změn, deterministicky, s fail-open chováním při chybě.

**Architektura:** Stop hook v Node (`.claude/hooks/comment-audit-gate.mjs`,
zapojený v commitnutém `.claude/settings.json`) blokuje ukončení turnu přes
exit 2 a odkáže agenta na skill `.claude/skills/comment-audit`, který nese
striktní checklist auditu. Stav "tahle sada změn už prošla" drží hash
v `.git/claude-comment-audit-state`.

**Stack:** Node >= 24 (bez bash logiky, bez jq/shasum), Vitest subprocess
testy, markdown skill + úpravy AGENTS.md a CONTRIBUTING.md.

## Globální omezení

- Žádná nová npm závislost.
- Nikdy needitovat `dist/`. `settings.local.json` zůstává nedotčený.
- Komentáře anglicky a jen kde čtenář nemůže věc vyčíst z kódu. Bez pomlčky
  `—` v próze (anglické i české).
- Commit messages: Conventional Commits, anglicky, bez `Refs:` footeru, bez
  jakékoli zmínky o Claude/Anthropic v commitech.
- Před prvním commitem v čerstvém worktree `pnpm install` (jinak lefthook
  neproběhne); nikdy `LEFTHOOK=0`.
- Brána každého celku: `pnpm lint && pnpm typecheck && pnpm test:unit`.
- Sdílený kontrakt (žádný celek ho nesmí přejmenovat):
  - skill: `comment-audit`, soubor `.claude/skills/comment-audit/SKILL.md`;
  - hook: `.claude/hooks/comment-audit-gate.mjs`;
  - stavový soubor: `.git/claude-comment-audit-state`;
  - stderr zpráva hooku, doslova: `Changed files detected. Invoke the
comment-audit skill (.claude/skills/comment-audit) on the changed files,
then finish.`;
  - filtr relevantních souborů: přípony `ts|vue|css|yml|yaml|sh|md`, mimo
    `dist/` a `node_modules/`.

## Vlny a modely

Celky na sobě nezávisí a nesdílí jediný soubor; kontrakt (názvy, cesty,
zpráva) je zafixovaný výše. Všechny tři jedou paralelně ve vlně 1, vlna 2 je
integrační kontrola.

| vlna | celek                   | soubory                                                                                                        | model     | proč ten model                                                                |
| ---- | ----------------------- | -------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| 1    | 1. Stop hook + testy    | `.claude/hooks/comment-audit-gate.mjs`, `.claude/settings.json`, `tests/unit/hooks/comment-audit-gate.test.ts` | Opus      | stavová logika hash/stop_hook_active, fail-open, subprocess testy v temp repu |
| 1    | 2. Skill comment-audit  | `.claude/skills/comment-audit/SKILL.md`                                                                        | Sonnet    | próza podle hotového zadání, ale nese striktnost celého řešení                |
| 1    | 3. Dokumentace pravidel | `AGENTS.md`, `CONTRIBUTING.md`                                                                                 | Sonnet    | próza v domácím stylu, nulová logika                                          |
| 2    | 4. Integrace            | žádné nové soubory                                                                                             | Haiku 4.5 | spustit brány a ruční smoke hooku, ověřit výstupy                             |

```text
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ 1. hook │  │ 2. skill│  │ 3. docs │   Opus / Sonnet / Sonnet
   └────┬────┘  └────┬────┘  └────┬────┘
        └────────────┼────────────┘
                ┌────┴─────┐
                │ 4. integr│   Haiku 4.5
                └──────────┘
```

---

## Celek 1: Stop hook + testy

**Model:** Opus. **Vlna:** 1.

**Soubory:**

- Vytvořit: `.claude/hooks/comment-audit-gate.mjs`
- Vytvořit: `.claude/settings.json`
- Vytvořit: `tests/unit/hooks/comment-audit-gate.test.ts`

**Rozhraní:**

- Konzumuje: nic.
- Produkuje: hook podle sdíleného kontraktu (cesty, stderr zpráva, stavový
  soubor). Celky 2 a 3 na tyhle názvy odkazují z prózy.

**Chování hooku (stdin = JSON od harness, cwd = kořen projektu):**

1. `stop_hook_active === true`: zapsat aktuální hash stavu do stavového
   souboru a exit 0 (audit právě doběhl).
2. Žádné změněné relevantní soubory: exit 0.
3. Hash stavu == obsah stavového souboru: exit 0 (tahle sada změn už audit
   prošla).
4. Jinak stderr zpráva ze sdíleného kontraktu a exit 2.
5. Jakákoli neočekávaná chyba (rozbitý JSON, repo bez HEAD, chybějící git):
   exit 0. Rozbitý hook nesmí nikdy blokovat práci.

Hash = SHA-256 nad výstupem `git diff HEAD` + jmény a obsahem untracked
relevantních souborů.

- [ ] **Krok 1: napsat padající testy**

`tests/unit/hooks/comment-audit-gate.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(
  new URL("../../../.claude/hooks/comment-audit-gate.mjs", import.meta.url),
);

const STOP_IDLE = JSON.stringify({
  hook_event_name: "Stop",
  stop_hook_active: false,
});
const STOP_ACTIVE = JSON.stringify({
  hook_event_name: "Stop",
  stop_hook_active: true,
});

function runHook(cwd: string, input: string) {
  return spawnSync("node", [HOOK], { cwd, input, encoding: "utf8" });
}

describe("comment-audit-gate", () => {
  let repo: string;
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo });
  const stateFile = () => path.join(repo, ".git", "claude-comment-audit-state");

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "comment-audit-gate-"));
    git("init");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    fs.writeFileSync(path.join(repo, "a.ts"), "export const a = 1;\n");
    git("add", ".");
    git("commit", "-m", "init");
  });

  afterEach(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  test("clean tree lets the stop through", () => {
    const r = runHook(repo, STOP_IDLE);
    expect(r.status).toBe(0);
  });

  test("changed relevant file blocks with the audit instruction", () => {
    fs.appendFileSync(path.join(repo, "a.ts"), "export const b = 2;\n");
    const r = runHook(repo, STOP_IDLE);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("comment-audit");
  });

  test("irrelevant extension does not block", () => {
    fs.writeFileSync(path.join(repo, "notes.txt"), "scratch\n");
    const r = runHook(repo, STOP_IDLE);
    expect(r.status).toBe(0);
  });

  test("stop_hook_active writes the state hash and lets the stop through", () => {
    fs.appendFileSync(path.join(repo, "a.ts"), "export const b = 2;\n");
    const r = runHook(repo, STOP_ACTIVE);
    expect(r.status).toBe(0);
    expect(fs.existsSync(stateFile())).toBe(true);
  });

  test("an already-audited diff does not block again, a new edit does", () => {
    fs.appendFileSync(path.join(repo, "a.ts"), "export const b = 2;\n");
    runHook(repo, STOP_ACTIVE);
    expect(runHook(repo, STOP_IDLE).status).toBe(0);
    fs.writeFileSync(path.join(repo, "b.md"), "# new\n");
    expect(runHook(repo, STOP_IDLE).status).toBe(2);
  });

  test("broken JSON on stdin fails open", () => {
    fs.appendFileSync(path.join(repo, "a.ts"), "export const b = 2;\n");
    const r = runHook(repo, "not json");
    expect(r.status).toBe(0);
  });

  test("a directory that is not a git repo fails open", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "no-repo-"));
    const r = runHook(dir, STOP_IDLE);
    expect(r.status).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Krok 2: spustit a ověřit, že padají**

Spustit: `pnpm test:unit -- tests/unit/hooks/comment-audit-gate.test.ts`
Očekávat: FAIL (hook neexistuje, `spawnSync` vrací nenulový status u všech
testů očekávajících 0).

- [ ] **Krok 3: implementovat hook**

`.claude/hooks/comment-audit-gate.mjs`:

```js
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RELEVANT = /\.(ts|vue|css|ya?ml|sh|md)$/;
const EXCLUDED = /^(dist|node_modules)\//;

const MESSAGE =
  "Changed files detected. Invoke the comment-audit skill " +
  "(.claude/skills/comment-audit) on the changed files, then finish.";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function relevantUntracked() {
  return git("ls-files", "--others", "--exclude-standard")
    .split("\n")
    .filter((f) => f && RELEVANT.test(f) && !EXCLUDED.test(f));
}

function changedFiles() {
  const tracked = git("diff", "--name-only", "HEAD")
    .split("\n")
    .filter((f) => f && RELEVANT.test(f) && !EXCLUDED.test(f));
  return [...tracked, ...relevantUntracked()];
}

function stateHash(root) {
  const hash = createHash("sha256");
  hash.update(git("diff", "HEAD"));
  for (const file of relevantUntracked()) {
    hash.update(file);
    try {
      hash.update(readFileSync(join(root, file)));
    } catch {
      // Deleted between listing and reading; the name alone is enough.
    }
  }
  return hash.digest("hex");
}

// Any unexpected failure lets the stop through: a broken hook must never block work.
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const root = git("rev-parse", "--show-toplevel").trim();
  const stateFile = join(root, ".git", "claude-comment-audit-state");

  if (input.stop_hook_active === true) {
    writeFileSync(stateFile, stateHash(root));
    process.exit(0);
  }

  if (changedFiles().length === 0) process.exit(0);

  let audited = "";
  try {
    audited = readFileSync(stateFile, "utf8");
  } catch {
    // No state yet: first audit for this clone.
  }

  if (stateHash(root) === audited) process.exit(0);

  process.stderr.write(MESSAGE);
  process.exit(2);
} catch {
  process.exit(0);
}
```

- [ ] **Krok 4: zapojit hook do `.claude/settings.json`**

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/comment-audit-gate.mjs\""
          }
        ]
      }
    ]
  }
}
```

- [ ] **Krok 5: spustit testy a ověřit, že prochází**

Spustit: `pnpm test:unit -- tests/unit/hooks/comment-audit-gate.test.ts`
Očekávat: PASS všech 7 testů.

- [ ] **Krok 6: brána a commit**

```bash
pnpm lint && pnpm typecheck && pnpm test:unit
git add .claude/hooks/comment-audit-gate.mjs .claude/settings.json tests/unit/hooks/comment-audit-gate.test.ts
git commit -m "chore: force a comment audit via Stop hook when files changed"
```

---

## Celek 2: skill comment-audit

**Model:** Sonnet. **Vlna:** 1.

**Soubory:**

- Vytvořit: `.claude/skills/comment-audit/SKILL.md`

**Rozhraní:**

- Konzumuje: názvy ze sdíleného kontraktu (skill `comment-audit`, filtr
  souborů). Hook z celku 1 na tenhle skill odkazuje stderr zprávou.
- Produkuje: ručně spustitelný `/comment-audit`.

**Zadání obsahu:** anglicky, formát podle `.claude/skills/prerelease-check/SKILL.md`
(YAML frontmatter `name` + `description`, pak tělo). Tělo je závazný postup,
ne doporučení. Přesné znění si celek formuluje sám, ale musí obsahovat:

1. Frontmatter: `name: comment-audit`; description říká, že jde o striktní
   úklid komentářů a prózy nad změnami podle pravidel AGENTS.md, spouštěný
   Stop hookem na konci turnu a kdykoli ručně.
2. Sběr souborů: `git diff --name-only HEAD` plus
   `git ls-files --others --exclude-standard`, filtr ze sdíleného kontraktu
   (přípony `ts|vue|css|yml|yaml|sh|md`, mimo `dist/` a `node_modules/`).
3. Pro každý přidaný komentářový řádek v diffu oba testy z AGENTS.md
   (would a competent reader already know this from the code? if deleted,
   could someone plausibly break the code?). Výchozí rozhodnutí je smazat;
   ponechání vyžaduje, aby komentář prošel oběma testy. When in doubt, delete.
4. Markdown navíc: smazat výplň, přeříkávání kódu, marketingová adjektiva,
   konstrukci "not just X, but Y", vynucené trojice; nahradit em dash podle
   pravidel prózy. JSDoc na publikovaném API zůstává, jen krátký.
5. Zákaz sahat na cokoli mimo posbírané soubory a mimo komentáře/prózu
   (žádné drive-by refactory, žádné změny kódu).
6. Výstupní formát do konverzace: sekce Removed (soubor:řádek + co) a Kept
   (soubor:řádek + jednořádkové zdůvodnění, proč prošlo oběma testy).
   Prázdný audit je platný výsledek a vypíše se jako "nothing added,
   nothing to remove".

- [ ] **Krok 1: napsat `.claude/skills/comment-audit/SKILL.md`** podle zadání
      výše; před psaním si přečíst sekce Comments a Prose v AGENTS.md a
      převzít jejich formulace testů doslova.

- [ ] **Krok 2: ověřit** vůči checklistu bodů 1 až 6 (každý bod má v souboru
      viditelný protějšek) a `pnpm format:check` projde.

- [ ] **Krok 3: commit**

```bash
git add .claude/skills/comment-audit/SKILL.md
git commit -m "chore: add comment-audit skill with the strict cleanup checklist"
```

---

## Celek 3: dokumentace pravidel

**Model:** Sonnet. **Vlna:** 1.

**Soubory:**

- Upravit: `AGENTS.md` (sekce Conventions/Prose a Workflow for agents)
- Upravit: `CONTRIBUTING.md`

**Rozhraní:**

- Konzumuje: názvy ze sdíleného kontraktu. Nic víc; needituje soubory
  celků 1 a 2.
- Produkuje: prózu, na kterou skill z celku 2 odkazuje větou "per AGENTS.md".

- [ ] **Krok 1: AGENTS.md, sekce Prose** doplnit na konec sekce:

```markdown
Markdown in this repo (docs/, specs/, the root files) is held to the same two
tests as code comments: would a competent reader already know this, and does
deleting it break anything? When in doubt, delete.
```

- [ ] **Krok 2: AGENTS.md, sekce Workflow for agents** doplnit nový bod za
      bod 3 (číslování za ním se posune):

```markdown
4. A Stop hook enforces a comment-and-prose audit (the `comment-audit` skill)
   at the end of any turn that changed files. Run it manually anytime; do not
   disable the hook.
```

- [ ] **Krok 3: CONTRIBUTING.md** přidat krátkou podsekci do části o vývoji
      (přesné umístění najít přes `grep -n "^## " CONTRIBUTING.md`, patří
      vedle lint/test workflow):

```markdown
### Comment audit hook

`.claude/settings.json` wires a Stop hook (`.claude/hooks/comment-audit-gate.mjs`)
that blocks the end of any Claude Code turn with changed files until the
`comment-audit` skill has cleaned comments and prose per AGENTS.md. State lives
in `.git/claude-comment-audit-state` (per clone, never committed); one audit per
diff state. The hook fails open: any script error lets the turn end. The harness
caps a Stop hook at 8 consecutive blocks, so it cannot loop forever.
```

- [ ] **Krok 4: ověřit a commit**

Spustit: `pnpm format:check`; zkontrolovat, že relativní odkazy v upravených
sekcích vedou na existující soubory.

```bash
git add AGENTS.md CONTRIBUTING.md
git commit -m "docs: hold repo markdown to the comment tests, document the audit hook"
```

---

## Celek 4: integrace

**Model:** Haiku 4.5. **Vlna:** 2 (po celcích 1 až 3).

**Soubory:** žádné nové; jen ověření.

- [ ] **Krok 1: plná brána**

Spustit: `pnpm lint && pnpm typecheck && pnpm build && pnpm test:unit && pnpm format:check`
Očekávat: vše zelené.

- [ ] **Krok 2: ruční smoke hooku v tomhle repu**

```bash
echo '{"hook_event_name":"Stop","stop_hook_active":false}' | node .claude/hooks/comment-audit-gate.mjs; echo "exit: $?"
```

Očekávat: exit 2 a stderr zprávu (working tree obsahuje změny z celků 1 až 3,
pokud ještě nejsou commitnuté), nebo exit 0 na čistém stromě. Ověřit i větev
`stop_hook_active: true` a následné exit 0 se stejným diffem.

- [ ] **Krok 3: report** výsledků obou kroků do konverzace; nic necommitovat,
      pokud kroky 1 a 2 neprošly.
