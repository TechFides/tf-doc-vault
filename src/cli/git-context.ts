/**
 * Detects whether a scaffold target sits inside an already-existing git
 * repository (the "offers monorepo" use case: one `tf-doc-vault setup` per
 * folder, all inside a single host repo), as opposed to a bare directory that
 * is about to become its own repo.
 */

import path from "node:path";
import { spawnSync } from "node:child_process";

export interface HostRepo {
  /** Absolute path to the repository root (`git rev-parse --show-toplevel`). */
  root: string;
  /** `org/repo`, parsed from the `origin` remote; absent if there is none. */
  originRepo?: string;
  /** Posix-relative path from `root` to the detection cwd; "" at the root. */
  subdir: string;
}

/**
 * Reads `org/repo` out of a GitHub SSH (`git@github.com:org/repo.git`) or
 * HTTPS (`https://github.com/org/repo.git`) remote URL. Any other host or
 * shape is not this package's business to guess at, so it returns undefined.
 */
export function parseGitHubRepoPath(remoteUrl: string): string | undefined {
  const trimmed = remoteUrl.trim().replace(/\.git$/, "");
  const ssh = /^git@github\.com:(.+)$/.exec(trimmed);
  if (ssh?.[1]) return ssh[1];
  const https = /^https:\/\/github\.com\/(.+)$/.exec(trimmed);
  if (https?.[1]) return https[1];
  return undefined;
}

function runGit(args: string[], cwd: string): string | null {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

/**
 * `null` outside a git repository, so the caller falls back to today's
 * behavior (init a fresh repo, use the manifest's static `repo` default).
 */
export function detectHostRepo(cwd: string): HostRepo | null {
  const root = runGit(["rev-parse", "--show-toplevel"], cwd);
  if (!root) return null;

  const remote = runGit(["remote", "get-url", "origin"], root);
  const originRepo = remote ? parseGitHubRepoPath(remote) : undefined;
  const subdir = path.relative(root, cwd).split(path.sep).join("/");

  return { root, originRepo, subdir };
}
