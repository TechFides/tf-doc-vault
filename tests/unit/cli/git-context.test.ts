import { describe, test, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  detectHostRepo,
  parseGitHubRepoPath,
} from "../../../src/cli/git-context.js";

describe("parseGitHubRepoPath", () => {
  test("reads org/repo out of an SSH remote", () => {
    expect(
      parseGitHubRepoPath("git@github.com:TechFides/tf-doc-vault.git"),
    ).toBe("TechFides/tf-doc-vault");
  });

  test("reads org/repo out of an HTTPS remote", () => {
    expect(
      parseGitHubRepoPath("https://github.com/TechFides/tf-doc-vault.git"),
    ).toBe("TechFides/tf-doc-vault");
  });

  test("tolerates a remote with no .git suffix", () => {
    expect(parseGitHubRepoPath("git@github.com:TechFides/tf-doc-vault")).toBe(
      "TechFides/tf-doc-vault",
    );
  });

  test("a non-GitHub remote is not this package's business to guess at", () => {
    expect(
      parseGitHubRepoPath("git@gitlab.com:techfides/tf-analysis/x.git"),
    ).toBeUndefined();
  });
});

describe("detectHostRepo", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function tempRepo(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-context-"));
    dirs.push(dir);
    spawnSync("git", ["-c", "init.defaultBranch=main", "init", "-q"], {
      cwd: dir,
    });
    return dir;
  }

  test("null outside a git repository", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "not-a-repo-"));
    dirs.push(dir);
    expect(detectHostRepo(dir)).toBeNull();
  });

  test("the repo root and an empty subdir when detection runs at the root", () => {
    const dir = tempRepo();
    spawnSync(
      "git",
      [
        "remote",
        "add",
        "origin",
        "git@github.com:TechFides/tf-sales-private-offers.git",
      ],
      { cwd: dir },
    );
    expect(detectHostRepo(dir)).toEqual({
      root: fs.realpathSync(dir),
      originRepo: "TechFides/tf-sales-private-offers",
      subdir: "",
    });
  });

  test("the subdir path when detection runs inside a folder of the repo", () => {
    const dir = tempRepo();
    const offer = path.join(dir, "offer-a");
    fs.mkdirSync(offer);
    const detected = detectHostRepo(offer);
    expect(detected?.root).toBe(fs.realpathSync(dir));
    expect(detected?.subdir).toBe("offer-a");
  });

  test("no origin remote leaves originRepo undefined but still detects the repo", () => {
    const dir = tempRepo();
    const detected = detectHostRepo(dir);
    expect(detected?.root).toBe(fs.realpathSync(dir));
    expect(detected?.originRepo).toBeUndefined();
  });

  // `git rev-parse --show-toplevel` always resolves symlinks, so a `cwd`
  // reached through one (e.g. macOS's `os.tmpdir()`, itself a symlink) must
  // be realpathed too, or `path.relative` returns a bogus "../../..." chain
  // instead of the real subdir.
  test("resolves symlinks in cwd the same as it does in the detected root", () => {
    const dir = tempRepo();
    const offer = path.join(dir, "offer-a");
    fs.mkdirSync(offer);
    const linkParent = fs.mkdtempSync(
      path.join(os.tmpdir(), "git-context-link-"),
    );
    dirs.push(linkParent);
    const link = path.join(linkParent, "offer-a-link");
    fs.symlinkSync(offer, link);
    const detected = detectHostRepo(link);
    expect(detected?.root).toBe(fs.realpathSync(dir));
    expect(detected?.subdir).toBe("offer-a");
  });
});
