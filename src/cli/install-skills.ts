import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface SkillsInstall {
  attempted: boolean;
  ok: boolean;
  /** The exact command a person can run by hand to get what `setup` could not. */
  command: string;
  /** Whether the portal-root CLAUDE.md now carries the library's rules. */
  claudeMd: "replaced" | "kept";
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
const SHIPPED_CLAUDE_MD = path.join("docs-base", "references", "CLAUDE.md");

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
 * Backup → install into the real target → place the shipped CLAUDE.md → drop
 * the bundled commands; on any failure put everything back. Installing into
 * the final path (not a temp dir) keeps tf-skills' state.json keyed correctly,
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
  const rootClaudeMd = path.join(projectDir, "CLAUDE.md");
  const command = skillsCommand(bundle, projectDir);
  const backup = path.join(claude, `.swap-backup-${process.pid}`);

  fs.mkdirSync(backup, { recursive: true });
  const hadSkills = fs.existsSync(target);
  const hadClaudeMd = fs.existsSync(rootClaudeMd);
  if (hadSkills) fs.renameSync(target, path.join(backup, "skills"));
  if (hadClaudeMd)
    fs.copyFileSync(rootClaudeMd, path.join(backup, "CLAUDE.md"));
  fs.mkdirSync(target, { recursive: true });

  const restore = (reason: string): SkillsInstall => {
    fs.rmSync(target, { recursive: true, force: true });
    if (hadSkills) fs.renameSync(path.join(backup, "skills"), target);
    if (hadClaudeMd)
      fs.copyFileSync(path.join(backup, "CLAUDE.md"), rootClaudeMd);
    fs.rmSync(backup, { recursive: true, force: true });
    return { attempted: true, ok: false, command, claudeMd: "kept", reason };
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

  const shipped = path.join(target, SHIPPED_CLAUDE_MD);
  let claudeMd: SkillsInstall["claudeMd"] = "kept";
  if (fs.existsSync(shipped)) {
    fs.copyFileSync(shipped, rootClaudeMd);
    claudeMd = "replaced";
  }
  fs.rmSync(commands, { recursive: true, force: true });
  fs.rmSync(backup, { recursive: true, force: true });
  return { attempted: true, ok: true, command, claudeMd };
}
