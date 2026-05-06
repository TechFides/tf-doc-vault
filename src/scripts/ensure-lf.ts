/**
 * ensure-lf.ts
 *
 * Converts CRLF line endings to LF across the project's text files.
 * Run from the project root.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="))?.split("=")[1];
const ROOT = path.resolve(process.cwd(), rootArg ?? ".");
const EXTENSIONS = new Set([
  ".md",
  ".ts",
  ".js",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".yml",
  ".yaml",
  ".sh",
]);
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".vitepress/cache",
  "dist",
  ".npm",
  "artifacts",
]);

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        results.push(...getAllFiles(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function convertToLF(filePath: string): boolean {
  const content = fs.readFileSync(filePath, "utf-8");
  if (content.includes("\r\n")) {
    fs.writeFileSync(filePath, content.replace(/\r\n/g, "\n"), "utf-8");
    return true;
  }
  return false;
}

console.log("🔍 Prohledávám soubory pro konverzi na LF...");
const files = getAllFiles(ROOT);
let convertedCount = 0;

for (const file of files) {
  if (convertToLF(file)) {
    console.log(`  ✅ Konvertováno na LF: ${path.relative(ROOT, file)}`);
    convertedCount++;
  }
}

if (convertedCount > 0) {
  console.log(`\n🎉 Celkem konvertováno ${convertedCount} souborů na LF.`);
} else {
  console.log("\n✨ Všechny soubory již mají LF konce řádků.");
}
