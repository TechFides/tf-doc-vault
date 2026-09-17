import { describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SkillsInstall } from "../../../src/cli/install-skills.js";
import { syncSkills, type SyncDeps } from "../../../src/scripts/skills-sync.js";

function write(root: string, files: Record<string, string>): void {
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
}

const BUNDLED = {
  ".claude/skills/docs-from-code/SKILL.md": "bundled skill",
  ".claude/skills/docs-learn-from-session/SKILL.md": "shared skill",
  ".claude/commands/docs-technical.md": "bundled command",
  "CLAUDE.md": "@AGENTS.md\n",
};

interface Fixture {
  boilerplate: string;
  project: string;
}

/** A boilerplate and a portal scaffolded from it, project name filled in. */
function fixture(): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  const boilerplate = path.join(root, "boilerplate");
  const project = path.join(root, "project");
  write(boilerplate, { ...BUNDLED, "AGENTS.md": "# __PROJECT__ rules\n" });
  write(project, { ...BUNDLED, "AGENTS.md": "# acme rules\n" });
  return { boilerplate, project };
}

/** What a clone of a portal already on the library set looks like. */
function librarySet(fx: Fixture): void {
  fs.rmSync(path.join(fx.project, ".claude", "skills"), { recursive: true });
  write(fx.project, {
    ".claude/skills/docs-base/SKILL.md": "lib",
    ".claude/skills/docs-learn-from-session/SKILL.md": "lib",
  });
}

const target = (fx: Fixture): string =>
  path.resolve(fx.project, ".claude", "skills");

interface Calls {
  json: string[][];
  update: string[];
  install: string[];
  log: string[];
}

interface Options {
  check?: unknown;
  installOk?: boolean;
  updateOk?: boolean;
  env?: NodeJS.ProcessEnv;
  token?: boolean;
}

function makeDeps(
  fx: Fixture,
  opts: Options = {},
): { deps: SyncDeps; calls: Calls } {
  const calls: Calls = { json: [], update: [], install: [], log: [] };
  const install = (bundle: string): SkillsInstall => {
    calls.install.push(bundle);
    const ok = opts.installOk ?? true;
    return {
      attempted: true,
      ok,
      command: "npx ...",
      rules: "replaced",
      ...(ok ? {} : { reason: "no token" }),
    };
  };
  const deps: SyncDeps = {
    projectDir: fx.project,
    boilerplateDir: fx.boilerplate,
    env: opts.env ?? {},
    hasToken: () => opts.token ?? true,
    tfSkillsJson: (sub) => {
      calls.json.push(sub);
      return sub[0] === "check" ? (opts.check ?? null) : null;
    },
    update: (t) => {
      calls.update.push(t);
      return opts.updateOk ?? true;
    },
    install,
    log: (m) => calls.log.push(m),
  };
  return { deps, calls };
}

const NOTHING: Calls = { json: [], update: [], install: [], log: [] };

describe("syncSkills", () => {
  test("does nothing without a bundle, with the kill switch, or without a token", () => {
    const fx = fixture();
    const cases: [string | undefined, Options][] = [
      [undefined, {}],
      ["docs", { env: { TF_DOC_VAULT_SKILLS: "off" } }],
      ["docs", { token: false }],
    ];
    for (const [bundle, opts] of cases) {
      const { deps, calls } = makeDeps(fx, opts);
      syncSkills(bundle, deps);
      expect(calls).toEqual(NOTHING);
    }
  });

  test("a pristine bundled set is swapped for the library set", () => {
    const fx = fixture();
    const { deps, calls } = makeDeps(fx);
    syncSkills("docs", deps);
    expect(calls.install).toEqual(["docs"]);
    expect(calls.json).toEqual([]);
    const out = calls.log.join("");
    expect(out).toContain("Switching the bundled documentation skills");
    expect(out).toContain("skills and rules installed from the library");
  });

  test("an edited rules file keeps the bundled set and prints the command", () => {
    const fx = fixture();
    fs.appendFileSync(path.join(fx.project, "AGENTS.md"), "my rule\n");
    const { deps, calls } = makeDeps(fx);
    syncSkills("docs", deps);
    expect(calls.install).toEqual([]);
    expect(calls.log.join("")).toContain(
      `install --bundle docs --target ${target(fx)} --force`,
    );
  });

  test("an extra command file keeps the bundled set", () => {
    const fx = fixture();
    write(fx.project, { ".claude/commands/mine.md": "extra" });
    const { deps, calls } = makeDeps(fx);
    syncSkills("docs", deps);
    expect(calls.install).toEqual([]);
    expect(calls.log.join("")).toContain("--force");
  });

  test("a failed swap keeps the bundled set and prints the reason and the command", () => {
    const fx = fixture();
    const { deps, calls } = makeDeps(fx, { installOk: false });
    syncSkills("docs", deps);
    const out = calls.log.join("");
    expect(out).toContain("Could not install (no token)");
    expect(out).toContain("--force");
  });

  test("a library set behind the library is adopted, checked and updated", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps, calls } = makeDeps(fx, {
      check: {
        behind: 2,
        needForce: false,
        skills: { "docs-base": { state: "outdated" } },
      },
    });
    syncSkills("docs", deps);
    expect(calls.json).toEqual([["adopt", "--all"], ["check"]]);
    expect(calls.update).toEqual([target(fx)]);
    expect(calls.install).toEqual([]);
    expect(calls.log.join("")).toContain("updated from the library");
  });

  test("a current library set is left alone in silence", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps, calls } = makeDeps(fx, {
      check: { behind: 0, skills: { "docs-base": { state: "current" } } },
    });
    syncSkills("docs", deps);
    expect(calls.update).toEqual([]);
    expect(calls.log).toEqual([]);
  });

  test("a wholly unmanaged set only gets the command", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps, calls } = makeDeps(fx, {
      check: {
        behind: 0,
        skills: {
          "docs-base": { state: "unmanaged" },
          "docs-learn-from-session": { state: "unmanaged" },
        },
      },
    });
    syncSkills("docs", deps);
    expect(calls.update).toEqual([]);
    expect(calls.log.join("")).toContain("not managed by tf-skills");
  });

  test("an unreadable check result changes nothing and says nothing", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps, calls } = makeDeps(fx, { check: null });
    syncSkills("docs", deps);
    expect(calls.update).toEqual([]);
    expect(calls.log).toEqual([]);
  });

  test("a failed update falls back to advice", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps, calls } = makeDeps(fx, {
      check: {
        behind: 1,
        needForce: true,
        skills: { "docs-base": { state: "modified" } },
      },
      updateOk: false,
    });
    syncSkills("docs", deps);
    const out = calls.log.join("");
    expect(out).toContain("1 documentation skill(s) behind the library");
    expect(out).toContain("update --force replaces them");
  });
});
