import { test, expect } from "./fixtures";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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

// With the sync switched off nothing about skills is printed and control goes
// straight to vitepress. A fake `vitepress` first on PATH keeps this hermetic:
// the real one would serve until killed (a "no token" run cannot be simulated
// either, gh keeps tokens in the keyring). The dispatcher is called directly
// because `pnpm exec` would put the sandbox's real .bin ahead of the fake.
test("dev with the skills sync off hands over to vitepress silently", ({
  sandboxes,
}) => {
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "fake-vitepress-"));
  fs.writeFileSync(
    path.join(fakeBin, "vitepress"),
    '#!/bin/sh\necho "fake vitepress $*"\n',
    { mode: 0o755 },
  );
  const r = spawnSync(
    process.execPath,
    [
      path.join(REPO_ROOT, "dist/cli/tf-doc-vault.js"),
      "dev",
      "--root=docs",
      "--skills-bundle=docs",
      "--port",
      "5199",
    ],
    {
      cwd: sandboxes.anaDir,
      encoding: "utf-8",
      timeout: 60_000,
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
        TF_DOC_VAULT_SKILLS: "off",
      },
    },
  );
  fs.rmSync(fakeBin, { recursive: true, force: true });
  const out = `${r.stdout}${r.stderr}`;
  expect(r.status, out).toBe(0);
  expect(out).toContain("fake vitepress dev docs --port 5199");
  expect(out).not.toMatch(/skill/i);
});
