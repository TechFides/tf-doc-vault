import { describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SkillsInstall } from "../../../src/cli/install-skills.js";
import {
  installFromLibrary,
  renderInstall,
  renderUpdate,
  updateSkills,
  type SkillsDeps,
} from "../../../src/scripts/skills-sync.js";

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skills-"));
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
}

interface Options {
  check?: unknown;
  installOk?: boolean;
  updateOk?: boolean;
  token?: boolean;
}

function makeDeps(
  fx: Fixture,
  opts: Options = {},
): { deps: SkillsDeps; calls: Calls } {
  const calls: Calls = { json: [], update: [], install: [] };
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
  const deps: SkillsDeps = {
    projectDir: fx.project,
    boilerplateDir: fx.boilerplate,
    hasToken: () => opts.token ?? true,
    tfSkillsJson: (sub) => {
      calls.json.push(sub);
      if (sub[0] !== "check") return null;
      return "check" in opts ? opts.check : { behind: 0, skills: {} };
    },
    update: (t) => {
      calls.update.push(t);
      return opts.updateOk ?? true;
    },
    install,
  };
  return { deps, calls };
}

const NOTHING: Calls = { json: [], update: [], install: [] };

describe("updateSkills", () => {
  test("without a token it does nothing", () => {
    const fx = fixture();
    const { deps, calls } = makeDeps(fx, { token: false });
    expect(updateSkills(deps)).toEqual({ kind: "no-token" });
    expect(calls).toEqual(NOTHING);
  });

  test("the bundled set is left alone and never costs a network call, edited or not", () => {
    const fx = fixture();
    expect(updateSkills(makeDeps(fx).deps)).toEqual({ kind: "bundled" });
    fs.appendFileSync(
      path.join(fx.project, ".claude/skills/docs-from-code/SKILL.md"),
      "edit",
    );
    const { deps, calls } = makeDeps(fx);
    expect(updateSkills(deps)).toEqual({ kind: "bundled" });
    expect(calls).toEqual(NOTHING);
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
    expect(updateSkills(deps)).toEqual({ kind: "updated" });
    expect(calls.json).toEqual([["adopt", "--all"], ["check"]]);
    expect(calls.update).toEqual([target(fx)]);
    expect(calls.install).toEqual([]);
  });

  test("a current library set is current", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps, calls } = makeDeps(fx, {
      check: { behind: 0, skills: { "docs-base": { state: "current" } } },
    });
    expect(updateSkills(deps)).toEqual({ kind: "current" });
    expect(calls.update).toEqual([]);
  });

  test("a wholly unmanaged set is reported, not touched", () => {
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
    expect(updateSkills(deps)).toEqual({ kind: "unmanaged" });
    expect(calls.update).toEqual([]);
  });

  test("an unreadable check changes nothing", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps, calls } = makeDeps(fx, { check: null });
    expect(updateSkills(deps)).toEqual({ kind: "unreadable" });
    expect(calls.update).toEqual([]);
  });

  test("a failed update becomes advice", () => {
    const fx = fixture();
    librarySet(fx);
    const { deps } = makeDeps(fx, {
      check: {
        behind: 1,
        needForce: true,
        skills: { "docs-base": { state: "modified" } },
      },
      updateOk: false,
    });
    const outcome = updateSkills(deps);
    expect(outcome.kind).toBe("behind");
    if (outcome.kind === "behind") {
      expect(outcome.advice).toContain("1 documentation skill(s) behind");
      expect(outcome.advice).toContain("update --force replaces them");
    }
  });
});

describe("installFromLibrary", () => {
  test("without a token nothing is attempted", () => {
    const fx = fixture();
    const { deps, calls } = makeDeps(fx, { token: false });
    expect(installFromLibrary("docs", false, deps)).toEqual({
      kind: "no-token",
    });
    expect(calls.install).toEqual([]);
  });

  test("a pristine bundled set is swapped for the library set", () => {
    const fx = fixture();
    const { deps, calls } = makeDeps(fx);
    expect(installFromLibrary("docs", false, deps)).toEqual({
      kind: "installed",
      rules: "replaced",
    });
    expect(calls.install).toEqual(["docs"]);
  });

  test("an edited rules file is refused without --force and replaced with it", () => {
    const fx = fixture();
    fs.appendFileSync(path.join(fx.project, "AGENTS.md"), "my rule\n");
    const refused = makeDeps(fx);
    expect(installFromLibrary("docs", false, refused.deps)).toEqual({
      kind: "edited",
    });
    expect(refused.calls.install).toEqual([]);
    const forced = makeDeps(fx);
    expect(installFromLibrary("docs", true, forced.deps).kind).toBe(
      "installed",
    );
    expect(forced.calls.install).toEqual(["docs"]);
  });

  test("an extra command file counts as an edit", () => {
    const fx = fixture();
    write(fx.project, { ".claude/commands/mine.md": "extra" });
    const { deps, calls } = makeDeps(fx);
    expect(installFromLibrary("docs", false, deps)).toEqual({
      kind: "edited",
    });
    expect(calls.install).toEqual([]);
  });

  test("a library set already in place is reported, and reinstalled only with --force", () => {
    const fx = fixture();
    librarySet(fx);
    const plain = makeDeps(fx);
    expect(installFromLibrary("docs", false, plain.deps)).toEqual({
      kind: "already-library",
    });
    expect(plain.calls.install).toEqual([]);
    const forced = makeDeps(fx);
    expect(installFromLibrary("docs", true, forced.deps).kind).toBe(
      "installed",
    );
    expect(forced.calls.install).toEqual(["docs"]);
  });

  test("a failed swap carries the reason and the raw command", () => {
    const fx = fixture();
    const { deps } = makeDeps(fx, { installOk: false });
    expect(installFromLibrary("docs", false, deps)).toEqual({
      kind: "failed",
      reason: "no token",
      command: "npx ...",
    });
  });
});

describe("rendering", () => {
  test("update is silent off a TTY unless it changed something or something is behind", () => {
    for (const kind of [
      "no-token",
      "bundled",
      "unreadable",
      "unmanaged",
      "current",
    ] as const) {
      expect(renderUpdate({ kind }, false)).toEqual({ exit: 0 });
      expect(renderUpdate({ kind }, true).out).toBeTruthy();
    }
    expect(renderUpdate({ kind: "updated" }, false).out).toContain(
      "git status",
    );
    expect(
      renderUpdate({ kind: "behind", advice: "2 behind: run x" }, false).out,
    ).toBe("2 behind: run x");
    expect(renderUpdate({ kind: "bundled" }, true).out).toContain(
      "skills install --bundle",
    );
  });

  test("update always exits 0, install exits 1 when it refuses or fails", () => {
    expect(renderUpdate({ kind: "behind", advice: "x" }, false).exit).toBe(0);
    expect(renderInstall({ kind: "no-token" })).toMatchObject({ exit: 1 });
    expect(renderInstall({ kind: "no-token" }).err).toContain("gh auth login");
    expect(renderInstall({ kind: "edited" })).toMatchObject({ exit: 1 });
    expect(renderInstall({ kind: "edited" }).err).toContain("--force");
    expect(
      renderInstall({ kind: "failed", reason: "boom", command: "npx x" }),
    ).toEqual({ exit: 1, err: expect.stringContaining("npx x") });
    expect(renderInstall({ kind: "already-library" })).toMatchObject({
      exit: 0,
    });
    expect(renderInstall({ kind: "already-library" }).out).toContain(
      "skills update",
    );
    expect(
      renderInstall({ kind: "installed", rules: "replaced" }).out,
    ).toContain("git status");
    expect(renderInstall({ kind: "installed", rules: "kept" }).out).toContain(
      "rules kept",
    );
  });
});
