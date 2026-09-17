import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(
  new URL("../../../.claude/hooks/comment-audit-gate.mjs", import.meta.url),
);
const BASELINE_HOOK = fileURLToPath(
  new URL("../../../.claude/hooks/comment-audit-baseline.mjs", import.meta.url),
);

const SESSION = "test-session";

const STOP_IDLE = JSON.stringify({
  hook_event_name: "Stop",
  stop_hook_active: false,
  session_id: SESSION,
});
const STOP_ACTIVE = JSON.stringify({
  hook_event_name: "Stop",
  stop_hook_active: true,
  session_id: SESSION,
});
const SESSION_START = JSON.stringify({
  hook_event_name: "SessionStart",
  session_id: SESSION,
});

function runHook(cwd: string, input: string) {
  return spawnSync("node", [HOOK], { cwd, input, encoding: "utf8" });
}

function runBaseline(cwd: string, input = SESSION_START) {
  return spawnSync("node", [BASELINE_HOOK], { cwd, input, encoding: "utf8" });
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

  test("a linked worktree stores its state in its own gitdir", () => {
    const parent = fs.mkdtempSync(
      path.join(os.tmpdir(), "comment-audit-gate-wt-"),
    );
    const worktree = path.join(parent, "wt");
    try {
      git("worktree", "add", worktree, "-b", "wt-branch");
      fs.appendFileSync(path.join(worktree, "a.ts"), "export const b = 2;\n");

      expect(runHook(worktree, STOP_ACTIVE).status).toBe(0);
      expect(
        fs.existsSync(
          path.join(
            repo,
            ".git",
            "worktrees",
            "wt",
            "claude-comment-audit-state",
          ),
        ),
      ).toBe(true);
      expect(runHook(worktree, STOP_IDLE).status).toBe(0);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  describe("a worktree the session is not sitting in", () => {
    let parent: string;
    let worktree: string;

    beforeEach(() => {
      parent = fs.mkdtempSync(path.join(os.tmpdir(), "comment-audit-other-"));
      worktree = path.join(parent, "wt");
      git("worktree", "add", worktree, "-b", "other");
    });

    afterEach(() => {
      fs.rmSync(parent, { recursive: true, force: true });
    });

    test("blocks and names it when the session dirtied it", () => {
      runBaseline(repo);
      fs.appendFileSync(path.join(worktree, "a.ts"), "export const b = 2;\n");

      const r = runHook(repo, STOP_IDLE);
      expect(r.status).toBe(2);
      expect(r.stderr).toContain(fs.realpathSync(worktree));
    });

    test("does not block when it was already dirty at session start", () => {
      fs.appendFileSync(path.join(worktree, "a.ts"), "export const b = 2;\n");
      runBaseline(repo);

      expect(runHook(repo, STOP_IDLE).status).toBe(0);
    });

    test("blocks when it did not exist at session start", () => {
      const late = path.join(parent, "late");
      runBaseline(repo);
      git("worktree", "add", late, "-b", "late");
      fs.appendFileSync(path.join(late, "a.ts"), "export const b = 2;\n");

      expect(runHook(repo, STOP_IDLE).status).toBe(2);
    });

    test("does not block without a baseline, so a stale hook config cannot nag", () => {
      fs.appendFileSync(path.join(worktree, "a.ts"), "export const b = 2;\n");

      expect(runHook(repo, STOP_IDLE).status).toBe(0);
    });

    test("the audit clears it, a further edit blocks again", () => {
      runBaseline(repo);
      fs.appendFileSync(path.join(worktree, "a.ts"), "export const b = 2;\n");

      expect(runHook(repo, STOP_ACTIVE).status).toBe(0);
      expect(runHook(repo, STOP_IDLE).status).toBe(0);

      fs.writeFileSync(path.join(worktree, "c.md"), "# more\n");
      expect(runHook(repo, STOP_IDLE).status).toBe(2);
    });

    test("the session's own tree still blocks on dirt older than the session", () => {
      fs.appendFileSync(path.join(repo, "a.ts"), "export const b = 2;\n");
      runBaseline(repo);

      expect(runHook(repo, STOP_IDLE).status).toBe(2);
    });
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
