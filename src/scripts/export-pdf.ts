/**
 * Renders the /print page of a built VitePress site into `artifacts/`. Needs
 * `tf-doc-vault print` and `vitepress build docs` first, or use
 * `tf-doc-vault pdf`, which chains all three and runs the chain twice so the
 * table of contents can carry page numbers.
 *
 * Alongside the PDF it writes `artifacts/.pagemap.json`, the anchor to page
 * number map the second pass feeds back into the generator.
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { escapeHtml, readPdfBranding } from "./pdf-branding.js";
import { readDiagramState, waitForDiagrams } from "./wait-for-diagrams.js";
import { readText } from "../shared/text-file.js";

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const PROJECT_ROOT = process.cwd();
const ARTIFACTS_DIR = path.resolve(PROJECT_ROOT, "artifacts");
const SERVER_TIMEOUT_MS = 20_000;

const branding = readPdfBranding();
// basename, so a configured name cannot write outside artifacts/.
const OUTPUT_FILE = path.join(
  ARTIFACTS_DIR,
  path.basename(branding.fileName ?? "docs-full.pdf"),
);
const PAGE_MAP_FILE = path.join(ARTIFACTS_DIR, ".pagemap.json");

/**
 * Chromium lays header and footer templates out in their own document, with no
 * access to the page stylesheet and no clipping to the page margin: an unstyled
 * template collapses to nothing, and a template taller than the margin bleeds
 * into the text. Hence the inline styles, and the offsets measured against a
 * rendered sheet rather than derived from the margins.
 */
const FURNITURE_FONT = "'IBM Plex Sans',Helvetica,Arial,sans-serif";
const HEADER_TOP = "6mm";
const FOOTER_TOP = "5mm";
const MARGIN = { top: "19mm", bottom: "16mm", left: "16mm", right: "16mm" };

function headerTemplate(): string {
  if (!branding.mark) return "<div></div>";
  return `
<div style="width:100%;box-sizing:border-box;padding:${HEADER_TOP} 16mm 0;font-family:${FURNITURE_FONT};">
  <div style="width:100%;display:flex;justify-content:flex-end;border-bottom:0.5pt solid #dde3ea;padding-bottom:2mm;font-size:7pt;letter-spacing:0.08em;text-transform:uppercase;color:#9aa7b5;">
    <span>${escapeHtml(branding.mark)}</span>
  </div>
</div>`;
}

function footerTemplate(): string {
  const left = [branding.footerLabel, branding.cover?.confidentiality]
    .filter((part): part is string => !!part)
    .map(escapeHtml)
    .join(" &nbsp;·&nbsp; ");
  return `
<div style="width:100%;box-sizing:border-box;padding:${FOOTER_TOP} 16mm 0;font-family:${FURNITURE_FONT};">
  <div style="width:100%;display:flex;justify-content:space-between;font-size:7pt;color:#8a97a6;">
    <span>${left}</span>
    <span>strana <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>
</div>`;
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet, keep polling
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

function startPreviewServer(): ChildProcess {
  const vitepressBin = path.resolve(
    PROJECT_ROOT,
    "node_modules/vitepress/bin/vitepress.js",
  );
  const server = spawn(
    "node",
    [vitepressBin, "preview", "docs", "--port", String(PORT)],
    {
      stdio: "pipe",
      cwd: PROJECT_ROOT,
    },
  );
  server.stderr?.on("data", (d: Buffer) => {
    const line = d.toString().trim();
    if (line) process.stderr.write(`  [preview] ${line}\n`);
  });
  return server;
}

/**
 * Chromium turns every `id` on the page into a named destination, so the
 * finished PDF knows which sheet each documentation page starts on. The slugs
 * come from print.md rather than from the PDF's own index: pdfjs 6 returns
 * nothing from the bulk `getDestinations()`, while a lookup by name works, and
 * asking by name also leaves heading anchors out.
 */
async function readPageMap(file: string): Promise<Record<string, number>> {
  const printPage = path.resolve(PROJECT_ROOT, "docs/print.md");
  const slugs = [...readText(printPage).matchAll(/<a id="([^"]+)"><\/a>/g)].map(
    (m) => m[1]!,
  );

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(file)),
  }).promise;
  const map: Record<string, number> = {};

  for (const slug of slugs) {
    try {
      const dest = await doc.getDestination(slug);
      if (!dest) continue;
      map[slug] = (await doc.getPageIndex(dest[0] as never)) + 1;
    } catch {
      // A destination Chromium could not resolve simply gets no number.
    }
  }
  return map;
}

/**
 * `vitepress preview` serves the site under its configured `base` and 404s
 * everything outside it, so the origin alone is not a URL. Read off a built page
 * because this process never loads the config: every asset URL carries the base.
 */
function resolveBase(dir: string): string {
  const html = readText(path.join(dir, "print.html"));
  return /(?:href|src)="(\/[^"]*?)assets\//.exec(html)?.[1] ?? "/";
}

const distDir = path.resolve(PROJECT_ROOT, "docs/.vitepress/dist");
if (!fs.existsSync(distDir)) {
  console.error(
    "✗ docs/.vitepress/dist not found. Run first: tf-doc-vault print && vitepress build docs",
  );
  process.exit(1);
}

const baseUrl = `${ORIGIN}${resolveBase(distDir)}`;
const printUrl = `${baseUrl}print`;

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

console.log("Starting preview server...");
const server = startPreviewServer();
let unsettledDiagrams = false;

try {
  await waitForServer(baseUrl, SERVER_TIMEOUT_MS);
  console.log(`✓ Server running at ${baseUrl}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  // Print media, not screen: emulating screen switches off every `@media print`
  // rule the theme ships, which is what used to print the site navbar onto the
  // first sheet. It also makes this export and the browser's Ctrl+P agree.
  await page.emulateMedia({ media: "print", colorScheme: "light" });

  console.log(`Loading ${printUrl}...`);
  await page.goto(printUrl, { waitUntil: "networkidle" });

  await page.evaluate(() => document.fonts.ready);

  const diagrams = await waitForDiagrams(() => page.evaluate(readDiagramState));
  unsettledDiagrams = !diagrams.settled;
  if (!diagrams.settled) {
    console.error(
      `✗ Diagrams did not settle: ${diagrams.rendered}/${diagrams.total} rendered, ` +
        `${diagrams.failed} reporting a syntax error. The PDF below carries Mermaid's ` +
        `error graphic where those diagrams belong.`,
    );
  } else if (diagrams.total > 0) {
    console.log(`✓ ${diagrams.total} diagram(s) rendered`);
  }

  console.log("Generating PDF...");
  await page.pdf({
    path: OUTPUT_FILE,
    format: "A4",
    printBackground: true,
    margin: MARGIN,
    displayHeaderFooter: true,
    headerTemplate: headerTemplate(),
    footerTemplate: footerTemplate(),
    tagged: true,
    outline: true,
  });

  await browser.close();

  fs.writeFileSync(
    PAGE_MAP_FILE,
    JSON.stringify(await readPageMap(OUTPUT_FILE), null, 2),
    "utf-8",
  );

  const sizeKb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(
    `✓ PDF generated: artifacts/${path.basename(OUTPUT_FILE)} (${sizeKb} kB)`,
  );
} finally {
  server.kill();
}

// Non-zero stops the `pdf` chain before its second pass. The file stays on disk:
// looking at it is how the author finds the diagram to fix.
if (unsettledDiagrams) process.exit(1);
