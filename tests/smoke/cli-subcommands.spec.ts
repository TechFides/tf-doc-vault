import { test, expect } from "./fixtures";
import { spawnSync } from "node:child_process";

const SUBCOMMANDS: { args: string[]; label: string }[] = [
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
