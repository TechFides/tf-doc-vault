import fs from "node:fs";
import path from "node:path";
import type { SkillsInstall } from "../cli/install-skills.js";
import {
  adviceFor,
  classify,
  isPristine,
  matchesTemplate,
} from "./skills-state.js";

/*
 * Nothing a person edited by hand is replaced without --force, and `update`
 * never touches the bundled set: switching to the library is `install`'s job.
 */

export interface SkillsDeps {
  projectDir: string;
  boilerplateDir: string;
  hasToken: () => boolean;
  /** `tf-skills <sub> --json --target <target>`, parsed; null on any failure. */
  tfSkillsJson: (sub: string[], target: string) => unknown;
  /** `tf-skills update --all --target <target>`; true on exit 0. */
  update: (target: string) => boolean;
  install: (bundle: string, projectDir: string) => SkillsInstall;
}

export type UpdateOutcome =
  | {
      kind:
        | "no-token"
        | "bundled"
        | "unreadable"
        | "unmanaged"
        | "current"
        | "updated";
    }
  | { kind: "behind"; advice: string };

export type InstallOutcome =
  | { kind: "no-token" | "already-library" | "edited" }
  | { kind: "failed"; reason: string; command: string }
  | { kind: "installed"; rules: SkillsInstall["rules"] };

export interface Rendered {
  exit: number;
  out?: string;
  err?: string;
}

interface Check {
  behind?: number;
  needForce?: boolean;
  skills?: Record<string, { state?: string }>;
}

function dirNames(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/** Every regular file under `dir`, keyed by POSIX-relative path; a missing dir is empty. */
function readTree(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (d: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.isFile()) {
        out.set(
          path.relative(dir, abs).split(path.sep).join("/"),
          fs.readFileSync(abs),
        );
      }
    }
  };
  walk(dir);
  return out;
}

function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

const skillsDir = (root: string): string =>
  path.join(root, ".claude", "skills");

/** The bundled skills, commands and rules files exactly as scaffolded, project name aside. */
function pristine(deps: SkillsDeps): boolean {
  const { projectDir, boilerplateDir } = deps;
  const rulesPristine = ["AGENTS.md", "CLAUDE.md"].every((name) => {
    const template = readText(path.join(boilerplateDir, name));
    if (template === null) return true;
    const actual = readText(path.join(projectDir, name));
    return actual !== null && matchesTemplate(actual, template);
  });
  return (
    rulesPristine &&
    isPristine(
      readTree(skillsDir(projectDir)),
      readTree(skillsDir(boilerplateDir)),
    ) &&
    isPristine(
      readTree(path.join(projectDir, ".claude", "commands")),
      readTree(path.join(boilerplateDir, ".claude", "commands")),
    )
  );
}

export function updateSkills(deps: SkillsDeps): UpdateOutcome {
  if (!deps.hasToken()) return { kind: "no-token" };
  const target = path.resolve(skillsDir(deps.projectDir));
  const installed = dirNames(target);
  if (
    classify(installed, dirNames(skillsDir(deps.boilerplateDir))) === "fallback"
  ) {
    return { kind: "bundled" };
  }
  deps.tfSkillsJson(["adopt", "--all"], target);
  const check = deps.tfSkillsJson(["check"], target) as Check | null;
  if (!check || typeof check.behind !== "number") return { kind: "unreadable" };
  const states = Object.values(check.skills ?? {}).map((s) => s.state);
  if (
    installed.length > 0 &&
    states.length > 0 &&
    states.every((s) => s === "unmanaged")
  ) {
    return { kind: "unmanaged" };
  }
  if (check.behind === 0) return { kind: "current" };
  if (deps.update(target)) return { kind: "updated" };
  return {
    kind: "behind",
    advice:
      adviceFor(
        { behind: check.behind, needForce: check.needForce === true },
        target,
      ) ?? "",
  };
}

export function installFromLibrary(
  bundle: string,
  force: boolean,
  deps: SkillsDeps,
): InstallOutcome {
  if (!deps.hasToken()) return { kind: "no-token" };
  const installed = dirNames(skillsDir(deps.projectDir));
  if (!force && installed.length > 0) {
    if (
      classify(installed, dirNames(skillsDir(deps.boilerplateDir))) ===
      "library"
    ) {
      return { kind: "already-library" };
    }
    if (!pristine(deps)) return { kind: "edited" };
  }
  const result = deps.install(bundle, deps.projectDir);
  if (!result.ok) {
    return {
      kind: "failed",
      reason: result.reason ?? "unknown",
      command: result.command,
    };
  }
  return { kind: "installed", rules: result.rules };
}

const INSTALL_HINT = "`tf-doc-vault skills install --bundle <name>`";

/** Off a TTY (a hook) only a change or something to act on is worth a line. */
export function renderUpdate(outcome: UpdateOutcome, tty: boolean): Rendered {
  switch (outcome.kind) {
    case "updated":
      return {
        exit: 0,
        out: "Documentation skills updated from the library: review with git status and commit.",
      };
    case "behind":
      return { exit: 0, out: outcome.advice };
    default:
      break;
  }
  if (!tty) return { exit: 0 };
  const quiet: Record<
    Exclude<UpdateOutcome["kind"], "updated" | "behind">,
    string
  > = {
    "no-token":
      "No GitHub token with access to the skills library (gh auth login, or GITHUB_TOKEN); nothing checked.",
    bundled: `The bundled documentation skills are installed; ${INSTALL_HINT} switches to the library set.`,
    unreadable:
      "Could not read the skills library (tf-skills check failed); nothing changed.",
    unmanaged: `These documentation skills are not managed by tf-skills; ${INSTALL_HINT} with --force replaces them with the library set.`,
    current: "Documentation skills are current.",
  };
  return { exit: 0, out: quiet[outcome.kind] };
}

export function renderInstall(outcome: InstallOutcome): Rendered {
  switch (outcome.kind) {
    case "no-token":
      return {
        exit: 1,
        err: "No GitHub token with access to the skills library: run gh auth login, or set GITHUB_TOKEN.",
      };
    case "already-library":
      return {
        exit: 0,
        out: "The library skills are already installed; `tf-doc-vault skills update` brings them forward, --force reinstalls.",
      };
    case "edited":
      return {
        exit: 1,
        err: "The bundled skills, commands or rules files were edited by hand; rerun with --force to replace them with the library set (git keeps the edits).",
      };
    case "failed":
      return {
        exit: 1,
        err: `Could not install (${outcome.reason}); nothing changed. The command it ran: ${outcome.command}`,
      };
    case "installed":
      return {
        exit: 0,
        out:
          outcome.rules === "replaced"
            ? "Documentation skills and rules installed from the library: review with git status and commit."
            : "Documentation skills installed from the library (rules kept, the bundle ships none): review with git status and commit.",
      };
  }
}
