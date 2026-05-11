/**
 * export-pdf.ts
 *
 * Generates artifacts/docs-full.pdf from the /print page of the built VitePress site.
 *
 * Prerequisites: run `tf-doc-vault print` and `vitepress build docs` first,
 * or use `tf-doc-vault pdf` which chains all three steps.
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const PRINT_URL = `${BASE_URL}/print`;
const PROJECT_ROOT = process.cwd();
const ARTIFACTS_DIR = path.resolve(PROJECT_ROOT, "artifacts");
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, "docs-full.pdf");
const SERVER_TIMEOUT_MS = 20_000;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet — keep polling
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

function startPreviewServer(): ChildProcess {
  const vitepressBin = path.resolve(PROJECT_ROOT, "node_modules/vitepress/bin/vitepress.js");
  const server = spawn("node", [vitepressBin, "preview", "docs", "--port", String(PORT)], {
    stdio: "pipe",
    cwd: PROJECT_ROOT,
  });
  server.stderr?.on("data", (d: Buffer) => {
    const line = d.toString().trim();
    if (line) process.stderr.write(`  [preview] ${line}\n`);
  });
  return server;
}

const distDir = path.resolve(PROJECT_ROOT, "docs/.vitepress/dist");
if (!fs.existsSync(distDir)) {
  console.error("✗ docs/.vitepress/dist nenalezen. Spusť nejdříve: tf-doc-vault print && vitepress build docs");
  process.exit(1);
}

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

console.log("Spouštím preview server...");
const server = startPreviewServer();

try {
  await waitForServer(BASE_URL, SERVER_TIMEOUT_MS);
  console.log(`✓ Server běží na ${BASE_URL}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.emulateMedia({ media: "screen", colorScheme: "light" });

  console.log(`Načítám ${PRINT_URL}...`);
  await page.goto(PRINT_URL, { waitUntil: "networkidle" });

  await page.evaluate(() => document.fonts.ready);

  console.log("Generuji PDF...");
  await page.pdf({
    path: OUTPUT_FILE,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
  });

  await browser.close();

  const sizeKb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(`✓ PDF vygenerováno: artifacts/docs-full.pdf (${sizeKb} kB)`);
} finally {
  server.kill();
}
