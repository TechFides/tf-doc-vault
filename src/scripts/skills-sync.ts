import fs from "node:fs";
import path from "node:path";
import type { SkillsInstall } from "../cli/install-skills.js";
import {
  adviceFor,
  classify,
  isPristine,
  matchesTemplate,
  switchAdvice,
  unmanagedAdvice,
} from "./skills-state.js";

/*
 * Nothing here may stop the dev server from starting, and nothing a person
 * edited by hand is ever replaced: edits get the command printed, never --force.
 */

export interface SyncDeps {
  projectDir: string;
  boilerplateDir: string;
  env: NodeJS.ProcessEnv;
  hasToken: () => boolean;
  /** `tf-skills <sub> --json --target <target>`, parsed; null on any failure. */
  tfSkillsJson: (sub: string[], target: string) => unknown;
  /** `tf-skills update --all --target <target>`; true on exit 0. */
  update: (target: string) => boolean;
  install: (bundle: string, projectDir: string) => SkillsInstall;
  log: (message: string) => void;
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

function switchFromFallback(
  target: string,
  bundle: string,
  deps: SyncDeps,
): void {
  const { projectDir, boilerplateDir, log } = deps;
  // A token is not access: someone outside TechFides with `gh` logged in must
  // not watch an install fail on every start. `check` reads the library and
  // nothing else, so its failure is the cheapest "no access" there is.
  if (deps.tfSkillsJson(["check"], target) === null) return;
  const rulesPristine = ["AGENTS.md", "CLAUDE.md"].every((name) => {
    const template = readText(path.join(boilerplateDir, name));
    if (template === null) return true;
    const actual = readText(path.join(projectDir, name));
    return actual !== null && matchesTemplate(actual, template);
  });
  const pristine =
    isPristine(
      readTree(target),
      readTree(path.join(boilerplateDir, ".claude", "skills")),
    ) &&
    isPristine(
      readTree(path.join(projectDir, ".claude", "commands")),
      readTree(path.join(boilerplateDir, ".claude", "commands")),
    ) &&
    rulesPristine;
  if (!pristine) {
    log(`\n${switchAdvice(target, bundle)}\n`);
    return;
  }
  log(
    "\nSwitching the bundled documentation skills for the TechFides library set...",
  );
  const result = deps.install(bundle, projectDir);
  if (!result.ok) {
    log(
      `Could not install (${result.reason ?? "unknown"}); bundled skills kept.\n${switchAdvice(target, bundle)}\n`,
    );
    return;
  }
  log(
    result.rules === "replaced"
      ? "Documentation skills and rules installed from the library: review with git status and commit.\n"
      : "Documentation skills installed from the library (rules kept, the bundle ships none): review with git status and commit.\n",
  );
}

export function syncSkills(bundle: string | undefined, deps: SyncDeps): void {
  if (!bundle || deps.env.TF_DOC_VAULT_SKILLS === "off" || !deps.hasToken()) {
    return;
  }
  const target = path.resolve(deps.projectDir, ".claude", "skills");
  const installed = dirNames(target);
  if (
    classify(
      installed,
      dirNames(path.join(deps.boilerplateDir, ".claude", "skills")),
    ) === "fallback"
  ) {
    switchFromFallback(target, bundle, deps);
    return;
  }
  deps.tfSkillsJson(["adopt", "--all"], target);
  const check = deps.tfSkillsJson(["check"], target) as Check | null;
  if (!check || typeof check.behind !== "number") return;
  const states = Object.values(check.skills ?? {}).map((s) => s.state);
  if (
    installed.length > 0 &&
    states.length > 0 &&
    states.every((s) => s === "unmanaged")
  ) {
    deps.log(`\n${unmanagedAdvice(target, bundle)}\n`);
    return;
  }
  if (check.behind === 0) return;
  if (deps.update(target)) {
    deps.log(
      "\nDocumentation skills updated from the library: review with git status and commit.\n",
    );
    return;
  }
  const advice = adviceFor(
    { behind: check.behind, needForce: check.needForce === true },
    target,
  );
  if (advice) deps.log(`\n${advice}\n`);
}
