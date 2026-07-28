/**
 * Full project polish: LF conversion, frontmatter normalize, format, lint --fix,
 * then typecheck, validate and a format/lint check to confirm the result passes.
 */

import { spawnSync } from "node:child_process";

interface Task {
  name: string;
  command: string;
  args: string[];
}

const rootFlag = process.argv.slice(2).find((a) => a.startsWith("--root="));
const rootArgs = rootFlag ? [rootFlag] : [];

const tasks: Task[] = [
  {
    name: "LF Conversion",
    command: "tf-doc-vault",
    args: ["ensure-lf", ...rootArgs],
  },
  {
    name: "Normalize",
    command: "tf-doc-vault",
    args: ["normalize", ...rootArgs],
  },
  { name: "Prettier Fix", command: "prettier", args: ["--write", "."] },
  { name: "Lint Fix", command: "eslint", args: [".", "--fix"] },
  { name: "Typecheck", command: "tsc", args: [] },
  {
    name: "Validate",
    command: "tf-doc-vault",
    args: ["validate", ...rootArgs],
  },
  { name: "Prettier Check", command: "prettier", args: ["--check", "."] },
  { name: "Lint Check", command: "eslint", args: ["."] },
];

interface Result {
  name: string;
  status: "OK" | "FAIL";
  duration: string;
}

function printTable(results: Result[]): void {
  const nameWidth = 20;
  const statusWidth = 10;
  const durationWidth = 10;

  const line = `+${"-".repeat(nameWidth + 2)}+${"-".repeat(statusWidth + 2)}+${"-".repeat(durationWidth + 2)}+`;
  const header = `| ${"Task".padEnd(nameWidth)} | ${"Status".padEnd(statusWidth)} | ${"Time".padStart(durationWidth)} |`;

  console.log("\n" + line);
  console.log(header);
  console.log(line);

  for (const res of results) {
    const status = res.status === "OK" ? "✅ OK" : "❌ FAIL";
    console.log(
      `| ${res.name.padEnd(nameWidth)} | ${status.padEnd(statusWidth)} | ${res.duration.padStart(durationWidth)} |`,
    );
  }

  console.log(line);
}

function runTasks(): void {
  const results: Result[] = [];
  let allSuccess = true;

  console.log("\n🚀 Running fix script...\n");

  for (const task of tasks) {
    const start = Date.now();
    process.stdout.write(`⏳ ${task.name}... `);

    const result = spawnSync(task.command, task.args, {
      stdio: "pipe",
      shell: true,
      encoding: "utf-8",
    });
    const duration = ((Date.now() - start) / 1000).toFixed(2) + "s";

    if (result.status === 0) {
      console.log("✅");
      results.push({ name: task.name, status: "OK", duration });
    } else {
      console.log("❌\n");
      const output = [result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n")
        .trim();
      if (output) {
        console.error(output.replace(/^/gm, "  "));
        console.log();
      }
      results.push({ name: task.name, status: "FAIL", duration });
      allSuccess = false;
      break;
    }
  }

  printTable(results);

  if (allSuccess) {
    console.log("\n🟢 All tasks completed successfully!\n");
  } else {
    console.error("\n🔴 Some tasks failed. Fix the errors and try again.\n");
    process.exit(1);
  }
}

runTasks();
