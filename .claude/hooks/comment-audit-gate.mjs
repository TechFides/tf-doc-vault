import { readFileSync, realpathSync, writeFileSync, writeSync } from "node:fs";
import {
  auditedFile,
  baselineFile,
  changedFiles,
  git,
  stateHash,
  worktrees,
} from "./comment-audit-state.mjs";

const MESSAGE =
  "Changed files detected. Invoke the comment-audit skill " +
  "(.claude/skills/comment-audit) on the changed files, then finish.";

function readOr(file, fallback) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return fallback;
  }
}

/** Null, not `{}`: without a baseline a foreign worktree cannot be attributed. */
function readBaseline(cwd, sessionId) {
  const file = baselineFile(cwd, sessionId);
  if (file === null) return null;
  const raw = readOr(file, null);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function message(outside) {
  if (outside.length === 0) return MESSAGE;
  return `${MESSAGE} These worktrees changed during this session, so collect the changed files in each of them too: ${outside.join(", ")}.`;
}

// Any unexpected failure lets the stop through: a broken hook must never block work.
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const cwd = process.cwd();
  const own = realpathSync(git(cwd, "rev-parse", "--show-toplevel").trim());
  const trees = worktrees(cwd);

  if (input.stop_hook_active === true) {
    for (const tree of trees) {
      try {
        if (changedFiles(tree).length > 0) {
          writeFileSync(auditedFile(tree), stateHash(tree));
        }
      } catch {
        // Worktree went away mid-audit.
      }
    }
    process.exit(0);
  }

  const baseline = readBaseline(cwd, input.session_id);
  const pending = [];

  for (const tree of trees) {
    let hash;
    try {
      if (changedFiles(tree).length === 0) continue;
      hash = stateHash(tree);
    } catch {
      continue;
    }
    if (hash === readOr(auditedFile(tree), "")) continue;
    // A worktree the session is not sitting in counts only once this session is
    // what changed it. No entry means it did not exist at session start.
    if (tree !== own && (baseline === null || baseline[tree] === hash))
      continue;
    pending.push(tree);
  }

  if (pending.length === 0) process.exit(0);

  writeSync(2, message(pending.filter((tree) => tree !== own)));
  process.exit(2);
} catch {
  process.exit(0);
}
