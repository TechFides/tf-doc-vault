import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RELEVANT = /\.(ts|vue|css|ya?ml|sh|md)$/;
const EXCLUDED = /^(dist|node_modules)\//;

const MESSAGE =
  "Changed files detected. Invoke the comment-audit skill " +
  "(.claude/skills/comment-audit) on the changed files, then finish.";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function relevantUntracked() {
  return git("ls-files", "--others", "--exclude-standard")
    .split("\n")
    .filter((f) => f && RELEVANT.test(f) && !EXCLUDED.test(f));
}

function changedFiles() {
  const tracked = git("diff", "--name-only", "HEAD")
    .split("\n")
    .filter((f) => f && RELEVANT.test(f) && !EXCLUDED.test(f));
  return [...tracked, ...relevantUntracked()];
}

function stateHash(root) {
  const hash = createHash("sha256");
  hash.update(git("diff", "HEAD"));
  for (const file of relevantUntracked()) {
    hash.update(file);
    try {
      hash.update(readFileSync(join(root, file)));
    } catch {
      // Deleted between listing and reading; the name alone is enough.
    }
  }
  return hash.digest("hex");
}

// Any unexpected failure lets the stop through: a broken hook must never block work.
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const root = git("rev-parse", "--show-toplevel").trim();
  // In a linked worktree `.git` is a file, so the state has to go to the
  // per-worktree gitdir this resolves to.
  const gitDir = git("rev-parse", "--absolute-git-dir").trim();
  const stateFile = join(gitDir, "claude-comment-audit-state");

  if (input.stop_hook_active === true) {
    writeFileSync(stateFile, stateHash(root));
    process.exit(0);
  }

  if (changedFiles().length === 0) process.exit(0);

  let audited = "";
  try {
    audited = readFileSync(stateFile, "utf8");
  } catch {
    // No state yet: first audit for this clone.
  }

  if (stateHash(root) === audited) process.exit(0);

  process.stderr.write(MESSAGE);
  process.exit(2);
} catch {
  process.exit(0);
}
