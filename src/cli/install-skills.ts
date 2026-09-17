import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface SkillsInstall {
  attempted: boolean;
  ok: boolean;
  /** The exact command a person can run by hand to get what `setup` could not. */
  command: string;
  /** Whether the portal's rules file now carries the library's rules. */
  rules: "replaced" | "kept";
  reason?: string;
}

export interface RunResult {
  status: number | null;
  stderr: string;
}

export type Runner = (command: string, args: string[]) => RunResult;

const defaultRunner: Runner = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    stdio: ["ignore", "inherit", "pipe"],
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  return { status: result.status, stderr: result.stderr ?? "" };
};

/** Where the library's docs-base ships the portal-root rules file. */
const SHIPPED_RULES = path.join("docs-base", "references", "CLAUDE.md");

/**
 * The boilerplate keeps its rules in AGENTS.md and ships CLAUDE.md as an
 * `@AGENTS.md` pointer, so the library's rules go where the rules are; a
 * portal without AGENTS.md gets them as CLAUDE.md. Both are backed up.
 */
const RULES_FILES = ["AGENTS.md", "CLAUDE.md"] as const;

function argv(bundle: string, target: string): string[] {
  return [
    "--yes",
    "@techfides/tf-skills-manager@latest",
    "install",
    "--bundle",
    bundle,
    "--target",
    target,
  ];
}

export function skillsCommand(bundle: string, projectDir: string): string {
  return [
    "npx",
    ...argv(bundle, path.join(projectDir, ".claude", "skills")),
  ].join(" ");
}

/**
 * Backup → install into the real target → place the shipped rules → drop the
 * bundled commands; on any failure put everything back. Installing into the
 * final path (not a temp dir) keeps tf-skills' state.json keyed correctly,
 * and moving the bundled set aside first means no name collision and no
 * --force. The bundled commands go with the bundled skills: they load those
 * skills by name, and the library set has no slash commands.
 */
export function installSkills(
  bundle: string,
  projectDir: string,
  run: Runner = defaultRunner,
): SkillsInstall {
  const claude = path.join(projectDir, ".claude");
  const target = path.join(claude, "skills");
  const commands = path.join(claude, "commands");
  const command = skillsCommand(bundle, projectDir);
  const backup = path.join(claude, `.swap-backup-${process.pid}`);

  fs.mkdirSync(backup, { recursive: true });
  const hadSkills = fs.existsSync(target);
  const rulesFiles = RULES_FILES.filter((name) =>
    fs.existsSync(path.join(projectDir, name)),
  );
  if (hadSkills) fs.renameSync(target, path.join(backup, "skills"));
  for (const name of rulesFiles) {
    fs.copyFileSync(path.join(projectDir, name), path.join(backup, name));
  }
  fs.mkdirSync(target, { recursive: true });

  const restore = (reason: string): SkillsInstall => {
    fs.rmSync(target, { recursive: true, force: true });
    if (hadSkills) fs.renameSync(path.join(backup, "skills"), target);
    for (const name of rulesFiles) {
      fs.copyFileSync(path.join(backup, name), path.join(projectDir, name));
    }
    fs.rmSync(backup, { recursive: true, force: true });
    return { attempted: true, ok: false, command, rules: "kept", reason };
  };

  let result: RunResult;
  try {
    result = run("npx", argv(bundle, target));
  } catch (error) {
    return restore(error instanceof Error ? error.message : String(error));
  }
  if (result.status !== 0) {
    return restore(
      result.stderr.trim() || `tf-skills exited with ${String(result.status)}`,
    );
  }
  if (fs.readdirSync(target).length === 0) {
    return restore("tf-skills exited 0 but installed nothing");
  }

  const shipped = path.join(target, SHIPPED_RULES);
  let rules: SkillsInstall["rules"] = "kept";
  if (fs.existsSync(shipped)) {
    const rulesTarget = rulesFiles.includes("AGENTS.md")
      ? "AGENTS.md"
      : "CLAUDE.md";
    fs.copyFileSync(shipped, path.join(projectDir, rulesTarget));
    rules = "replaced";
  }
  fs.rmSync(commands, { recursive: true, force: true });
  fs.rmSync(backup, { recursive: true, force: true });
  return { attempted: true, ok: true, command, rules };
}
