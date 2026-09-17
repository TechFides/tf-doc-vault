import { test, expect } from "./fixtures";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const SUBCOMMANDS: { args: string[]; label: string }[] = [
  { args: ["setup", "--help"], label: "setup --help" },
  { args: ["import-confluence", "--help"], label: "import-confluence --help" },
  { args: ["print"], label: "print" },
  { args: ["ensure-lf"], label: "ensure-lf" },
  { args: ["normalize"], label: "normalize" },
];

for (const cmd of SUBCOMMANDS) {
  test(`tf-doc-vault ${cmd.label} loads and exits 0`, ({ sandboxes }) => {
    const r = spawnSync("pnpm", ["exec", "tf-doc-vault", ...cmd.args], {
      cwd: sandboxes.anaDir,
      encoding: "utf-8",
    });
    expect(
      r.status,
      `tf-doc-vault ${cmd.label} failed:\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
    ).toBe(0);
  });
}

// The wizard has no template list of its own; adding a folder is enough.
test("setup --help lists the templates discovered in templates/", ({
  sandboxes,
}) => {
  const r = spawnSync("pnpm", ["exec", "tf-doc-vault", "setup", "--help"], {
    cwd: sandboxes.anaDir,
    encoding: "utf-8",
  });
  expect(r.status, r.stderr).toBe(0);

  const names = fs
    .readdirSync(path.join(REPO_ROOT, "templates"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    expect(r.stdout, `setup --help omits template "${name}"`).toContain(name);
  }
});

// Without a TTY the wizard never prompts, so a missing --template has to fail.
test("setup without a TTY and without --template exits 1", ({ sandboxes }) => {
  const r = spawnSync("pnpm", ["exec", "tf-doc-vault", "setup"], {
    cwd: sandboxes.anaDir,
    encoding: "utf-8",
  });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("--template=<name>");
});

test("tf-doc-vault --help lists dev", ({ sandboxes }) => {
  const r = spawnSync("pnpm", ["exec", "tf-doc-vault", "--help"], {
    cwd: sandboxes.anaDir,
    encoding: "utf-8",
  });
  expect(r.status, r.stderr).toBe(0);
  expect(r.stdout).toMatch(/^ {2}dev {2,}/m);
});

// The skills step must never stand between a person and the dev server: with
// no token it says nothing and hands over to vitepress.
test("dev without a GitHub token is silent about skills and reaches vitepress", ({
  sandboxes,
}) => {
  const r = spawnSync(
    "pnpm",
    [
      "exec",
      "tf-doc-vault",
      "dev",
      "--root=/nonexistent",
      "--skills-bundle=docs",
    ],
    {
      cwd: sandboxes.anaDir,
      encoding: "utf-8",
      timeout: 30_000,
      env: {
        ...process.env,
        GITHUB_TOKEN: "",
        GH_TOKEN: "",
        GH_CONFIG_DIR: "/nonexistent",
        TF_DOC_VAULT_SKILLS: "",
      },
    },
  );
  const out = `${r.stdout}${r.stderr}`;
  expect(out).not.toMatch(/skill/i);
  expect(r.status !== 0 || /vitepress|localhost/i.test(out)).toBe(true);
});
