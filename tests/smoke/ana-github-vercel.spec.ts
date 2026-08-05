import { test, expect } from "./fixtures";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("a fresh ana-docs scaffold ships the GitHub/Vercel deploy files and none of the removed GitLab/GCP ones", ({
  sandboxes,
}) => {
  for (const rel of [
    "vercel.json",
    "middleware.ts",
    ".github/workflows/ci.yml",
  ]) {
    expect(
      fs.existsSync(path.join(sandboxes.anaDir, rel)),
      `${rel} missing from a fresh ana-docs scaffold`,
    ).toBe(true);
  }

  for (const rel of [".gitlab-ci.yml", "Dockerfile", "docker", "infra"]) {
    expect(
      fs.existsSync(path.join(sandboxes.anaDir, rel)),
      `${rel} should not exist in a fresh ana-docs scaffold`,
    ).toBe(false);
  }
});

test("the CI workflow lands at the offers-monorepo root, not inside either offer", ({
  sandboxes,
}) => {
  expect(
    fs.existsSync(
      path.join(sandboxes.offersRepoDir, ".github/workflows/ci.yml"),
    ),
  ).toBe(true);
  expect(
    fs.existsSync(path.join(sandboxes.offersRepoDir, "offer_one/.github")),
  ).toBe(false);
  expect(fs.existsSync(path.join(sandboxes.secondOfferDir, ".github"))).toBe(
    false,
  );
});

// Scaffolding the second offer must not have run `git init` inside it (that
// would nest a repo inside the one it already lives in), and must not have
// touched the first offer's workflow file.
test("a second offer scaffolded into the same repo does not nest git or overwrite CI", ({
  sandboxes,
}) => {
  expect(fs.existsSync(path.join(sandboxes.secondOfferDir, ".git"))).toBe(
    false,
  );

  const topLevel = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: sandboxes.secondOfferDir,
    encoding: "utf-8",
  });
  expect(topLevel.status, topLevel.stderr).toBe(0);
  expect(fs.realpathSync(topLevel.stdout.trim())).toBe(
    fs.realpathSync(sandboxes.offersRepoDir),
  );
});

// repo/repo-subdir must come from the real origin remote and the offer's own
// path, not the manifest's static "TechFides/__PROJECT__" default.
test("the second offer's edit link is pre-filled from the detected repo and its own subfolder", ({
  sandboxes,
}) => {
  const config = fs.readFileSync(
    path.join(sandboxes.secondOfferDir, "docs/.vitepress/config.ts"),
    "utf-8",
  );
  expect(config).toContain('repo: "TechFides/tf-sales-private-offers"');
  expect(config).toContain('path: "offer_two"');
});
