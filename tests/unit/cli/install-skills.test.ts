import { describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  installSkills,
  skillsCommand,
  type Runner,
} from "../../../src/cli/install-skills.js";

/** A scaffolded portal as the boilerplate leaves it: bundled skills, commands, v1 CLAUDE.md. */
function project(): string {
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
  fs.writeFileSync(path.join(dir, "CLAUDE.md"), "v1 rules");
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
  test("success: library set in, v2 CLAUDE.md at root, bundled skills and commands gone", () => {
    const dir = project();
    const result = installSkills(
      "docs",
      dir,
      fakeInstall({
        "docs-base/SKILL.md": "lib",
        "docs-base/references/CLAUDE.md": "# Documentation portal rules — v2",
      }),
    );
    expect(result).toMatchObject({
      attempted: true,
      ok: true,
      claudeMd: "replaced",
    });
    expect(fs.readdirSync(path.join(dir, ".claude", "skills"))).toEqual([
      "docs-base",
    ]);
    expect(fs.existsSync(path.join(dir, ".claude", "commands"))).toBe(false);
    expect(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toBe(
      "# Documentation portal rules — v2",
    );
    expect(backups(dir)).toEqual([]);
  });

  test("success without a shipped CLAUDE.md keeps the v1 file and says so", () => {
    const dir = project();
    const result = installSkills(
      "docs",
      dir,
      fakeInstall({ "docs-base/SKILL.md": "lib" }),
    );
    expect(result).toMatchObject({ ok: true, claudeMd: "kept" });
    expect(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toBe(
      "v1 rules",
    );
  });

  test("failure: skills, commands and CLAUDE.md restored byte for byte", () => {
    const dir = project();
    const result = installSkills("docs", dir, () => ({
      status: 1,
      stderr: "no GitHub token",
    }));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("no GitHub token");
    expect(
      fs.readFileSync(
        path.join(dir, ".claude", "skills", "docs-from-code", "SKILL.md"),
        "utf8",
      ),
    ).toBe("old");
    expect(
      fs.existsSync(path.join(dir, ".claude", "commands", "docs-technical.md")),
    ).toBe(true);
    expect(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toBe(
      "v1 rules",
    );
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
});
