/**
 * Records what every worktree looked like when the session opened. The Stop
 * gate needs it to tell a worktree this session dirtied from one that somebody
 * else had already left dirty.
 */

import {
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  BASELINE_PREFIX,
  baselineDir,
  baselineFile,
  stateHash,
  worktrees,
} from "./comment-audit-state.mjs";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

function prune(dir) {
  const cutoff = Date.now() - STALE_MS;
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(BASELINE_PREFIX)) continue;
    const file = join(dir, name);
    try {
      if (statSync(file).mtimeMs < cutoff) rmSync(file, { force: true });
    } catch {
      // Another session removed it first.
    }
  }
}

// Any unexpected failure lets the session start: a broken hook must never block work.
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const cwd = process.cwd();
  const file = baselineFile(cwd, input.session_id);
  if (file) {
    const hashes = {};
    for (const tree of worktrees(cwd)) {
      try {
        hashes[tree] = stateHash(tree);
      } catch {
        // A missing entry counts as this session's doing, the safe direction.
      }
    }
    writeFileSync(file, JSON.stringify(hashes));
    prune(baselineDir(cwd));
  }
} catch {
  process.exit(0);
}
