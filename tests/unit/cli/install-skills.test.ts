import { describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  installSkills,
  skillsCommand,
  type Runner,
} from "../../../src/cli/install-skills.js";

const V2 = "# Documentation portal rules — v2";

/** A scaffolded portal as the boilerplate leaves it: bundled skills, commands, AGENTS.md rules, CLAUDE.md pointer. */
function project(opts: { pointerLayout?: boolean } = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inst-"));
  fs.mkdirSync(path.join(dir, ".claude", "skills", "docs-from-code"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(dir, ".claude", "skills", "docs-from-code", "SKILL.md"),
    "old",
  );
  fs.mkdirSync(path.join(dir, ".claude", "commands"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude", "commands", "docs-technical.md"),
    "old",
  );
  if (opts.pointerLayout ?? true) {
    fs.writeFileSync(path.join(dir, "AGENTS.md"), "v1 rules");
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "@AGENTS.md\n");
  } else {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "v1 rules");
  }
  return dir;
}

/** A runner that "installs" the given files under --target and exits 0. */
function fakeInstall(files: Record<string, string>): Runner {
  return (_cmd, args) => {
    const target = args[args.indexOf("--target") + 1];
    for (const [rel, body] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(target, rel)), { recursive: true });
      fs.writeFileSync(path.join(target, rel), body);
    }
    return { status: 0, stderr: "" };
  };
}

const read = (dir: string, rel: string): string =>
  fs.readFileSync(path.join(dir, rel), "utf8");

function backups(dir: string): string[] {
  return fs
    .readdirSync(path.join(dir, ".claude"))
    .filter((n) => n.startsWith(".swap-backup"));
}

describe("skillsCommand", () => {
  test("builds the recovery command with an absolute target", () => {
    expect(skillsCommand("docs", "/p")).toBe(
      "npx --yes @techfides/tf-skills-manager@latest install --bundle docs --target /p/.claude/skills",
    );
  });
});

describe("installSkills", () => {
  test("success: library set in, rules into AGENTS.md, pointer and commands handled", () => {
    const dir = project();
    const result = installSkills(
      "docs",
      dir,
      fakeInstall({
        "docs-base/SKILL.md": "lib",
        "docs-base/references/CLAUDE.md": V2,
      }),
    );
    expect(result).toMatchObject({
      attempted: true,
      ok: true,
      rules: "replaced",
    });
    expect(fs.readdirSync(path.join(dir, ".claude", "skills"))).toEqual([
      "docs-base",
    ]);
    expect(fs.existsSync(path.join(dir, ".claude", "commands"))).toBe(false);
    expect(read(dir, "AGENTS.md")).toBe(V2);
    expect(read(dir, "CLAUDE.md")).toBe("@AGENTS.md\n");
    expect(backups(dir)).toEqual([]);
  });

  test("a portal without AGENTS.md gets the rules as CLAUDE.md", () => {
    const dir = project({ pointerLayout: false });
    const result = installSkills(
      "docs",
      dir,
      fakeInstall({
        "docs-base/SKILL.md": "lib",
        "docs-base/references/CLAUDE.md": V2,
      }),
    );
    expect(result.rules).toBe("replaced");
    expect(read(dir, "CLAUDE.md")).toBe(V2);
    expect(fs.existsSync(path.join(dir, "AGENTS.md"))).toBe(false);
  });

  test("success without shipped rules keeps the bundled ones and says so", () => {
    const dir = project();
    const result = installSkills(
      "docs",
      dir,
      fakeInstall({ "docs-base/SKILL.md": "lib" }),
    );
    expect(result).toMatchObject({ ok: true, rules: "kept" });
    expect(read(dir, "AGENTS.md")).toBe("v1 rules");
    expect(read(dir, "CLAUDE.md")).toBe("@AGENTS.md\n");
  });

  test("failure: skills, commands, AGENTS.md and CLAUDE.md restored byte for byte", () => {
    const dir = project();
    const result = installSkills("docs", dir, () => ({
      status: 1,
      stderr: "no GitHub token",
    }));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("no GitHub token");
    expect(read(dir, ".claude/skills/docs-from-code/SKILL.md")).toBe("old");
    expect(
      fs.existsSync(path.join(dir, ".claude", "commands", "docs-technical.md")),
    ).toBe(true);
    expect(read(dir, "AGENTS.md")).toBe("v1 rules");
    expect(read(dir, "CLAUDE.md")).toBe("@AGENTS.md\n");
    expect(backups(dir)).toEqual([]);
  });

  test("a spawn error is a failure, not a throw", () => {
    const dir = project();
    const result = installSkills("docs", dir, () => {
      throw new Error("ENOENT npx");
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("ENOENT");
    expect(
      fs.existsSync(path.join(dir, ".claude", "skills", "docs-from-code")),
    ).toBe(true);
  });

  test("exit 0 with nothing installed is a failure", () => {
    const dir = project();
    const result = installSkills("docs", dir, () => ({
      status: 0,
      stderr: "",
    }));
    expect(result.ok).toBe(false);
    expect(
      fs.existsSync(path.join(dir, ".claude", "skills", "docs-from-code")),
    ).toBe(true);
  });

  test("an interrupted earlier run blocks the install and is named", () => {
    const dir = project();
    fs.mkdirSync(path.join(dir, ".claude", ".swap-backup-123"));
    let ran = false;
    const result = installSkills("docs", dir, () => {
      ran = true;
      return { status: 0, stderr: "" };
    });
    expect(ran).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(".swap-backup-123");
    expect(read(dir, ".claude/skills/docs-from-code/SKILL.md")).toBe("old");
    expect(backups(dir)).toEqual([".swap-backup-123"]);
  });

  test("a throw before the swap leaves the original set where it was", () => {
    const dir = project();
    // A directory named AGENTS.md cannot be copied into the backup.
    fs.rmSync(path.join(dir, "AGENTS.md"));
    fs.mkdirSync(path.join(dir, "AGENTS.md"));
    let ran = false;
    const result = installSkills("docs", dir, () => {
      ran = true;
      return { status: 0, stderr: "" };
    });
    expect(ran).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(read(dir, ".claude/skills/docs-from-code/SKILL.md")).toBe("old");
    expect(backups(dir)).toEqual([]);
  });

  test("a throw after the install restores skills, commands and rules", () => {
    const dir = project();
    const result = installSkills("docs", dir, (_cmd, args) => {
      const target = args[args.indexOf("--target") + 1]!;
      // A directory where the rules file should be: copying it throws.
      fs.mkdirSync(path.join(target, "docs-base", "references", "CLAUDE.md"), {
        recursive: true,
      });
      return { status: 0, stderr: "" };
    });
    expect(result.ok).toBe(false);
    expect(read(dir, ".claude/skills/docs-from-code/SKILL.md")).toBe("old");
    expect(
      fs.existsSync(path.join(dir, ".claude", "skills", "docs-base")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(dir, ".claude", "commands", "docs-technical.md")),
    ).toBe(true);
    expect(read(dir, "AGENTS.md")).toBe("v1 rules");
    expect(backups(dir)).toEqual([]);
  });
});
