import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface SkillsInstall {
  attempted: boolean;
  ok: boolean;
  /** The exact command a person can run by hand to get what `setup` could not. */
  command: string;
  /** Whether the portal's rules file carries the library's rules. */
  rules: "replaced" | "kept";
  reason?: string;
}

export interface RunResult {
  status: number | null;
  stderr: string;
}

export type Runner = (command: string, args: string[]) => RunResult;

/** npx resolves @latest and fetches every blob: a one-off worth waiting for, never forever. */
export const INSTALL_TIMEOUT_MS = 120_000;

/** A bundle name as `bundles.json` spells it; nothing else reaches a shell. */
export const BUNDLE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

const defaultRunner: Runner = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    stdio: ["ignore", "inherit", "pipe"],
    timeout: INSTALL_TIMEOUT_MS,
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

const BACKUP_PREFIX = ".swap-backup-";

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

const attempt = (step: () => void): void => {
  try {
    step();
  } catch {}
};

function staleBackup(claude: string): string | undefined {
  try {
    return fs
      .readdirSync(claude)
      .find((name) => name.startsWith(BACKUP_PREFIX));
  } catch {
    return undefined;
  }
}

/**
 * Installs into the final path, not a temp dir: tf-skills keys its state.json
 * by target. The bundled set is moved aside first, so no name collision and no
 * --force. The bundled commands go with the bundled skills: they load those
 * skills by name, and the library set has no slash commands. Never throws:
 * whatever fails, the backup is restored step by step and `ok` is false.
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
  const backup = path.join(claude, `${BACKUP_PREFIX}${String(process.pid)}`);
  const kept = (reason: string): SkillsInstall => ({
    attempted: true,
    ok: false,
    command,
    rules: "kept",
    reason,
  });

  // An interrupted run leaves its backup behind, possibly as the only copy of
  // an edited set; deleting it unattended is not this function's call.
  const stale = staleBackup(claude);
  if (stale) {
    return kept(
      `an earlier install was interrupted and left .claude/${stale}; restore or delete it first`,
    );
  }

  const hadSkills = fs.existsSync(target);
  const rulesFiles = RULES_FILES.filter((name) =>
    fs.existsSync(path.join(projectDir, name)),
  );
  // Only once the original set is in the backup may restore() clear the target.
  let moved = false;

  const restore = (): void => {
    if (moved) {
      attempt(() => fs.rmSync(target, { recursive: true, force: true }));
      if (hadSkills) {
        attempt(() => fs.renameSync(path.join(backup, "skills"), target));
      }
    }
    for (const name of rulesFiles) {
      attempt(() =>
        fs.copyFileSync(path.join(backup, name), path.join(projectDir, name)),
      );
    }
    attempt(() => fs.rmSync(backup, { recursive: true, force: true }));
  };

  try {
    fs.mkdirSync(backup, { recursive: true });
    for (const name of rulesFiles) {
      fs.copyFileSync(path.join(projectDir, name), path.join(backup, name));
    }
    if (hadSkills) fs.renameSync(target, path.join(backup, "skills"));
    moved = true;
    fs.mkdirSync(target, { recursive: true });

    const result = run("npx", argv(bundle, target));
    if (result.status !== 0) {
      restore();
      return kept(
        result.stderr.trim() ||
          `tf-skills exited with ${String(result.status)}`,
      );
    }
    if (fs.readdirSync(target).length === 0) {
      restore();
      return kept("tf-skills exited 0 but installed nothing");
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
    // The library set is in place; a failed cleanup must not undo it.
    attempt(() => fs.rmSync(commands, { recursive: true, force: true }));
    attempt(() => fs.rmSync(backup, { recursive: true, force: true }));
    return { attempted: true, ok: true, command, rules };
  } catch (error) {
    restore();
    return kept(error instanceof Error ? error.message : String(error));
  }
}
