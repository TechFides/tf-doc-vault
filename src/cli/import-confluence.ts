#!/usr/bin/env node
/**
 * import-confluence — download a Confluence page tree and convert it to
 * VitePress-compatible Markdown files in the output directory.
 *
 * Usage:
 *   import-confluence --site=<host> --root-page-id=<id> --output=<dir> [--space=<KEY>] [--verbose]
 *
 * Env vars:
 *   CONFLUENCE_USER_EMAIL   Atlassian account e-mail
 *   CONFLUENCE_API_TOKEN    Atlassian API token
 *
 * ADF → Markdown conversion lives in src/confluence/convert.ts; the REST client
 * (pagination, retry, concurrency, tree building) in src/confluence/client.ts;
 * image resolution in src/confluence/resolve-media.ts. This file is the thin CLI
 * orchestrator: arg parsing, attachment download, link rewriting, file output.
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "./utils.js";
import { logger } from "./logger.js";
import { convertAdf } from "../confluence/convert.js";
import {
  buildAttachmentIndex,
  resolveMediaInMarkdown,
} from "../confluence/resolve-media.js";
import {
  buildTree,
  downloadBinary,
  fetchAttachments,
} from "../confluence/client.js";
import {
  type AdfNode,
  type Attachment,
  type ImportError,
  type TreeNode,
  errorMessage,
} from "../confluence/types.js";

interface WriteContext {
  site: string;
  authHeader: string;
  publicDir: string;
  pagePathMap: Map<string, string>;
  docsRoot: string;
}

type WarnKind = "unsupported" | "download" | "unresolved" | "empty";

interface PageWarning {
  kind: WarnKind;
  page: string;
  detail: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

/** Quote a string for YAML only when needed; uses single quotes to avoid escaping. */
function yamlString(value: string): string {
  if (
    /[[\]{}:#*!|>"%@`,]/.test(value) ||
    /^[&]/.test(value) ||
    /^\s|\s$/.test(value)
  ) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

function preservedStatus(filePath: string): string {
  if (!fs.existsSync(filePath)) return "review";
  const match = fs.readFileSync(filePath, "utf-8").match(/^status:\s*(.+)$/m);
  return match?.[1]?.trim() === "published" ? "published" : "review";
}

function parseAdf(value: string): AdfNode | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as AdfNode;
  } catch {
    return null;
  }
}

function pageFilePath(
  node: TreeNode,
  parentPath: string,
  isRoot: boolean,
): string {
  if (isRoot) return path.join(parentPath, "index.md");
  return node.children.length > 0
    ? path.join(parentPath, node.slug, "index.md")
    : path.join(parentPath, `${node.slug}.md`);
}

function childBasePath(
  node: TreeNode,
  parentPath: string,
  isRoot: boolean,
): string {
  if (isRoot) return parentPath;
  return node.children.length > 0
    ? path.join(parentPath, node.slug)
    : parentPath;
}

/** Map every page id → on-disk path, mirroring the index.md / leaf.md layout. */
function buildPathMap(
  node: TreeNode,
  parentPath: string,
  isRoot: boolean,
  map: Map<string, string>,
): void {
  map.set(node.page.id, pageFilePath(node, parentPath, isRoot));
  const childBase = childBasePath(node, parentPath, isRoot);
  for (const child of node.children) buildPathMap(child, childBase, false, map);
}

/** Pre-order flatten so we can iterate pages with a progress counter. */
function flattenTree(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  acc.push(node);
  for (const child of node.children) flattenTree(child, acc);
  return acc;
}

/** Rewrite Confluence page links to relative VitePress paths (e.g. /v1/page). */
function rewriteConfluenceLinks(
  markdown: string,
  pagePathMap: Map<string, string>,
  docsRoot: string,
): string {
  return markdown.replace(
    /\[([^\]]+)\]\(https?:\/\/[^/]+\/wiki\/spaces\/[^/]+\/pages\/(\d+)[^)]*\)/g,
    (match: string, text: string, linkedId: string): string => {
      const absPath = pagePathMap.get(linkedId);
      if (!absPath) return match;
      const relativePath =
        "/" + path.relative(docsRoot, absPath).replace(/\.md$/, "");
      return `[${text}](${relativePath})`;
    },
  );
}

/**
 * Download all image attachments of a page into publicDir. Returns the
 * attachments that landed on disk plus any per-file download failures (so the
 * caller can fold them into the run summary instead of logging inline).
 */
async function downloadImages(
  pageId: string,
  ctx: WriteContext,
): Promise<{
  downloaded: Attachment[];
  failures: { file: string; error: string }[];
}> {
  const attachments = await fetchAttachments(ctx.site, pageId, ctx.authHeader);
  const downloaded: Attachment[] = [];
  const failures: { file: string; error: string }[] = [];
  for (const att of attachments) {
    if (!(att.metadata?.mediaType ?? "").startsWith("image/")) continue;
    if (!att.id) continue;
    const destPath = path.join(ctx.publicDir, att.title);
    // Download via the REST content path, NOT the attachment's legacy
    // `_links.download` (/wiki/download/attachments/...). The legacy path is
    // OAuth-gated and rejects API-token Basic auth (401 www-authenticate:OAuth);
    // the REST path is scope-covered and streams the binary (302 → media CDN).
    const downloadUrl = `https://${ctx.site}/wiki/rest/api/content/${pageId}/child/attachment/${att.id}/download`;
    try {
      if (!fs.existsSync(destPath)) {
        await downloadBinary(downloadUrl, destPath, ctx.authHeader);
      }
      downloaded.push(att);
    } catch (err) {
      failures.push({ file: att.title, error: errorMessage(err) });
    }
  }
  return { downloaded, failures };
}

// ─── Writer ───────────────────────────────────────────────────────────────────

async function writePage(
  node: TreeNode,
  filePath: string,
  ctx: WriteContext,
  warnings: PageWarning[],
  errors: ImportError[],
): Promise<{ written: boolean; images: number }> {
  try {
    const adfRoot = parseAdf(node.page.body?.atlas_doc_format?.value ?? "");
    let markdown = "";
    if (adfRoot) {
      const { markdown: md, unknownTypes } = convertAdf(adfRoot);
      markdown = md;
      if (unknownTypes.length > 0) {
        warnings.push({
          kind: "unsupported",
          page: node.cleanTitle,
          detail: [...new Set(unknownTypes)].join(", "),
        });
      }
    } else {
      warnings.push({ kind: "empty", page: node.cleanTitle, detail: "" });
    }

    const { downloaded, failures } = await downloadImages(node.page.id, ctx);
    for (const f of failures) {
      warnings.push({
        kind: "download",
        page: node.cleanTitle,
        detail: `${f.file} (${f.error})`,
      });
    }

    const { markdown: resolvedMd, unresolved } = resolveMediaInMarkdown(
      markdown,
      buildAttachmentIndex(downloaded),
    );
    markdown = resolvedMd;
    if (unresolved.length > 0) {
      warnings.push({
        kind: "unresolved",
        page: node.cleanTitle,
        detail: String(unresolved.length),
      });
    }

    markdown = rewriteConfluenceLinks(markdown, ctx.pagePathMap, ctx.docsRoot);

    const updatedAt =
      node.page.version?.createdAt?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10);
    const status = preservedStatus(filePath);
    const displayTitle = node.emoji
      ? `${node.emoji} ${node.cleanTitle}`
      : node.cleanTitle;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      `---
title: ${yamlString(displayTitle)}
status: ${status}
updated_at: ${updatedAt}
---

${markdown}
`,
      "utf-8",
    );
    return { written: true, images: downloaded.length };
  } catch (err) {
    errors.push({
      pageId: node.page.id,
      title: node.page.title,
      error: errorMessage(err),
    });
    return { written: false, images: 0 };
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

const MAX_LISTED = 10;

function listPages(pages: string[], verbose: boolean): void {
  if (verbose) {
    for (const p of pages) logger.detail(`    • ${p}`);
    return;
  }
  const shown = pages.slice(0, MAX_LISTED);
  const extra = pages.length - shown.length;
  logger.detail(
    `    ${shown.join(", ")}${extra > 0 ? `, +${extra} more` : ""}`,
  );
}

function reportWarnings(warnings: PageWarning[], verbose: boolean): void {
  if (warnings.length === 0) return;
  const of = (kind: WarnKind): PageWarning[] =>
    warnings.filter((w) => w.kind === kind);

  logger.blank();
  logger.warn(`${warnings.length} warning${plural(warnings.length)}:`);

  const unsupported = of("unsupported");
  if (unsupported.length > 0) {
    const types = [...new Set(unsupported.flatMap((w) => w.detail.split(", ")))]
      .sort()
      .join(", ");
    logger.detail(
      `${unsupported.length} page${plural(unsupported.length)} with unsupported nodes (${types})`,
    );
    listPages(
      unsupported.map((w) => w.page),
      verbose,
    );
  }

  const unresolved = of("unresolved");
  if (unresolved.length > 0) {
    logger.detail(
      `${unresolved.length} page${plural(unresolved.length)} with unresolved images`,
    );
    listPages(
      unresolved.map((w) => w.page),
      verbose,
    );
  }

  const empty = of("empty");
  if (empty.length > 0) {
    logger.detail(
      `${empty.length} page${plural(empty.length)} with an empty or invalid body`,
    );
    listPages(
      empty.map((w) => w.page),
      verbose,
    );
  }

  const download = of("download");
  if (download.length > 0) {
    logger.detail(
      `${download.length} attachment download failure${plural(download.length)}`,
    );
    if (verbose) {
      for (const w of download) logger.detail(`    • ${w.page} — ${w.detail}`);
    }
  }

  if (!verbose) logger.detail("Run with --verbose to list affected pages.");
}

function reportErrors(errors: ImportError[]): void {
  if (errors.length === 0) return;
  logger.blank();
  logger.error(
    `${errors.length} page${plural(errors.length)} failed to import:`,
  );
  for (const e of errors)
    logger.detail(`  • ${e.title ?? e.pageId}: ${e.error}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function usage(exitCode = 0): never {
  console.log(`
import-confluence [options]

Import Confluence page tree into a VitePress docs directory.

Options:
  --site=<host>           e.g. myorg.atlassian.net  (required)
  --root-page-id=<id>     Confluence root page ID   (required)
  --output=<dir>          output directory           (required)
  --space=<KEY>           Confluence space key       (informational only)
  --verbose               list every page affected by a warning

Env vars:
  CONFLUENCE_USER_EMAIL
  CONFLUENCE_API_TOKEN
`);
  process.exit(exitCode);
}

const { flags } = parseArgs(process.argv.slice(2));

if (flags.help || flags.h) usage(0);

const site = typeof flags.site === "string" ? flags.site : undefined;
const rootPageId =
  typeof flags["root-page-id"] === "string" ? flags["root-page-id"] : undefined;
const outputFlag = flags.output;
const outputDir =
  typeof outputFlag === "string"
    ? path.resolve(process.cwd(), outputFlag)
    : null;
const verbose = Boolean(flags.verbose);

const email = process.env["CONFLUENCE_USER_EMAIL"];
const token = process.env["CONFLUENCE_API_TOKEN"];

if (!site) {
  logger.error("--site is a required argument.");
  process.exit(1);
}
if (!rootPageId) {
  logger.error("--root-page-id is a required argument.");
  process.exit(1);
}
if (!outputDir) {
  logger.error("--output is a required argument.");
  process.exit(1);
}
if (!email || !token) {
  logger.error("CONFLUENCE_USER_EMAIL and CONFLUENCE_API_TOKEN must be set.");
  process.exit(1);
}

const docsRoot = path.resolve(outputDir, "..");
const publicDir = path.resolve(docsRoot, "public", "images");
const authHeader =
  "Basic " + Buffer.from(`${email}:${token}`).toString("base64");

logger.heading("Importing from Confluence");
logger.field("site", site);
logger.field("root", rootPageId);
logger.field("output", outputDir);

const errors: ImportError[] = [];
const warnings: PageWarning[] = [];

logger.blank();
logger.step("Fetching page tree…");
const tree = await buildTree(site, rootPageId, authHeader, errors);

if (!tree) {
  logger.error(
    `Failed to fetch the root page ${rootPageId}.${errors[0] ? ` (${errors[0].error})` : ""}`,
  );
  process.exit(1);
}

const pages = flattenTree(tree);
logger.success(`Fetched ${pages.length} page${plural(pages.length)}`);

const pagePathMap = new Map<string, string>();
buildPathMap(tree, outputDir, true, pagePathMap);
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

const ctx: WriteContext = {
  site,
  authHeader,
  publicDir,
  pagePathMap,
  docsRoot,
};

logger.blank();
logger.step("Converting and writing pages…");
let written = 0;
let images = 0;
for (const [index, node] of pages.entries()) {
  logger.progress(index + 1, pages.length, node.cleanTitle);
  const filePath = pagePathMap.get(node.page.id);
  if (!filePath) continue;
  const result = await writePage(node, filePath, ctx, warnings, errors);
  if (result.written) written++;
  images += result.images;
}
logger.endProgress();
logger.success(
  `Wrote ${written} page${plural(written)}, downloaded ${images} image${plural(images)}`,
);

reportWarnings(warnings, verbose);
reportErrors(errors);

logger.blank();
logger.success(`Done → ${outputDir}`);
logger.detail(
  "Review the pages and set `status: published` where appropriate.",
);
