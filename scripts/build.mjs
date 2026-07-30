#!/usr/bin/env node
/**
 * Build the package: tsc compiles src/ into dist/, then the non-TS assets
 * (.vue, .css, .json, ambient .d.ts) are copied across so the emitted .js can
 * resolve their relative imports.
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, "..");
const SRC = path.join(PKG, "src");
const DIST = path.join(PKG, "dist");

const STATIC_EXTENSIONS = new Set([
  ".vue",
  ".css",
  ".json",
  ".ico",
  ".png",
  ".svg",
  ".jpg",
  ".webp",
  ".cjs",
]);
const WATCH = process.argv.includes("--watch");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function isAmbientDts(name) {
  return name.endsWith(".d.ts");
}

function copyStaticFiles(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyStaticFiles(s, d);
      continue;
    }
    const isStatic = STATIC_EXTENSIONS.has(path.extname(entry.name));
    const isAmbient =
      isAmbientDts(entry.name) &&
      // tsc owns the .d.ts of any compiled .ts source; only standalone
      // ambient declarations get copied.
      !fs.existsSync(path.join(srcDir, entry.name.replace(/\.d\.ts$/, ".ts")));
    if (isStatic || isAmbient) {
      fs.copyFileSync(s, d);
    }
  }
}

console.log("→ wiping dist/");
rmrf(DIST);

if (WATCH) {
  console.log("→ tsc --watch + static asset watcher");
  const tsc = spawn(
    "tsc",
    [
      "--project",
      path.join(PKG, "tsconfig.json"),
      "--watch",
      "--preserveWatchOutput",
    ],
    {
      stdio: "inherit",
      cwd: PKG,
      shell: process.platform === "win32",
    },
  );

  copyStaticFiles(SRC, DIST);
  // Same rule as copyStaticFiles: tsc owns the .d.ts of any compiled .ts source,
  // so only standalone ambient declarations get copied.
  const isStaticOrAmbient = (name) =>
    STATIC_EXTENSIONS.has(path.extname(name)) ||
    (isAmbientDts(name) &&
      !fs.existsSync(path.join(SRC, name.replace(/\.d\.ts$/, ".ts"))));

  fs.watch(SRC, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const srcFile = path.join(SRC, filename);
    const destFile = path.join(DIST, filename);
    const base = path.basename(filename);
    if (!isStaticOrAmbient(base)) return;
    try {
      if (fs.existsSync(srcFile)) {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
        console.log(`  ↻ copied ${filename}`);
      } else {
        fs.rmSync(destFile, { force: true });
      }
    } catch (e) {
      console.warn(`  ! ${filename}: ${e.message}`);
    }
  });

  const shutdown = () => {
    tsc.kill();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} else {
  console.log("→ tsc");
  const tsc = spawnSync("tsc", ["--project", path.join(PKG, "tsconfig.json")], {
    stdio: "inherit",
    cwd: PKG,
    shell: process.platform === "win32",
  });
  if (tsc.status !== 0) {
    console.error("✗ tsc failed");
    process.exit(tsc.status ?? 1);
  }

  console.log("→ copying .vue/.css/.json from src/ → dist/");
  copyStaticFiles(SRC, DIST);

  console.log("✓ build complete: dist/");
}
