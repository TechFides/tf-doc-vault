import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

const RELEVANT = /\.(ts|vue|css|ya?ml|sh|md)$/;
const EXCLUDED = /^(dist|node_modules)\//;

export const BASELINE_PREFIX = "claude-comment-audit-baseline-";

// `ls-files --others` reports paths relative to cwd, so every call has to run
// from a worktree root or both EXCLUDED and the state hash stop matching between
// invocations. The stdio triple silences git's stderr, which is inherited.
export function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
}

function relevantUntracked(root) {
  return git(root, "ls-files", "--others", "--exclude-standard")
    .split("\n")
    .filter((f) => f && RELEVANT.test(f) && !EXCLUDED.test(f));
}

export function changedFiles(root) {
  const tracked = git(root, "diff", "--name-only", "HEAD")
    .split("\n")
    .filter((f) => f && RELEVANT.test(f) && !EXCLUDED.test(f));
  return [...tracked, ...relevantUntracked(root)];
}

/**
 * The session-start baseline and the Stop gate compare these across processes,
 * so the two must read the same bytes for the same tree.
 */
export function stateHash(root) {
  const hash = createHash("sha256");
  hash.update(git(root, "diff", "HEAD"));
  for (const file of relevantUntracked(root)) {
    hash.update(file);
    try {
      hash.update(readFileSync(join(root, file)));
    } catch {
      // Deleted between listing and reading; the name alone is enough.
    }
  }
  return hash.digest("hex");
}

/**
 * Every worktree of the repo, resolved through realpath so a path from `git` and
 * one built from `process.cwd()` compare equal.
 */
export function worktrees(cwd) {
  const paths = [];
  let current = null;
  let bare = false;
  const flush = () => {
    if (current && !bare) paths.push(current);
    current = null;
    bare = false;
  };

  for (const line of git(cwd, "worktree", "list", "--porcelain").split("\n")) {
    if (line.startsWith("worktree ")) {
      flush();
      current = line.slice("worktree ".length);
    } else if (line === "bare") bare = true;
    else if (line === "") flush();
  }
  flush();

  const resolved = [];
  for (const path of paths) {
    try {
      git(path, "rev-parse", "--git-dir");
      resolved.push(realpathSync(path));
    } catch {
      // Worktree directory is gone; `git worktree prune` has not run yet.
    }
  }
  return resolved;
}

/** Per worktree, so parallel worktrees do not overwrite each other's audit. */
export function auditedFile(root) {
  const gitDir = git(root, "rev-parse", "--absolute-git-dir").trim();
  return join(gitDir, "claude-comment-audit-state");
}

/** The common gitdir, not the per-worktree one: one baseline covers them all. */
export function baselineDir(cwd) {
  const root = git(cwd, "rev-parse", "--show-toplevel").trim();
  return resolve(root, git(root, "rev-parse", "--git-common-dir").trim());
}

export function baselineFile(cwd, sessionId) {
  const safe = String(sessionId ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!safe) return null;
  return join(baselineDir(cwd), `${BASELINE_PREFIX}${safe}`);
}
