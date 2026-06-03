#!/usr/bin/env node
/**
 * import-confluence — download a Confluence page tree and convert it to
 * VitePress-compatible Markdown files in the output directory.
 *
 * Usage:
 *   import-confluence --site=<host> --root-page-id=<id> --output=<dir> [--space=<KEY>]
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function countNodes(node: TreeNode): number {
  return 1 + node.children.reduce((s, c) => s + countNodes(c), 0);
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
 * Download all image attachments of a page into publicDir and return the
 * attachments that landed on disk (used to resolve media placeholders).
 */
async function downloadImages(
  pageId: string,
  ctx: WriteContext,
): Promise<Attachment[]> {
  const attachments = await fetchAttachments(ctx.site, pageId, ctx.authHeader);
  const downloaded: Attachment[] = [];
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
      console.warn(
        `  ⚠ Nelze stáhnout přílohu "${att.title}": ${errorMessage(err)}`,
      );
    }
  }
  return downloaded;
}

// ─── Writer ───────────────────────────────────────────────────────────────────

async function writePage(
  node: TreeNode,
  parentPath: string,
  isRoot: boolean,
  ctx: WriteContext,
  errors: ImportError[],
): Promise<void> {
  try {
    const adfRoot = parseAdf(node.page.body?.atlas_doc_format?.value ?? "");
    let markdown = "";
    if (adfRoot) {
      const { markdown: md, unknownTypes } = convertAdf(adfRoot);
      markdown = md;
      if (unknownTypes.length > 0) {
        const unique = [...new Set(unknownTypes)].join(", ");
        console.warn(
          `  ⚠ "${node.page.title}": vynechány nepodporované ADF uzly: ${unique}`,
        );
      }
    } else {
      console.warn(
        `  ⚠ "${node.page.title}": prázdné nebo nevalidní ADF tělo.`,
      );
    }

    const downloaded = await downloadImages(node.page.id, ctx);
    const { markdown: resolvedMd, unresolved } = resolveMediaInMarkdown(
      markdown,
      buildAttachmentIndex(downloaded),
    );
    markdown = resolvedMd;
    if (unresolved.length > 0) {
      console.warn(
        `  ⚠ "${node.page.title}": ${unresolved.length} obrázek(ů) bez attachmentu.`,
      );
    }

    markdown = rewriteConfluenceLinks(markdown, ctx.pagePathMap, ctx.docsRoot);

    const filePath = pageFilePath(node, parentPath, isRoot);
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
  } catch (err) {
    errors.push({
      pageId: node.page.id,
      title: node.page.title,
      error: errorMessage(err),
    });
  }

  // Recurse outside the try/catch: a failed page must not skip its children.
  const childBase = childBasePath(node, parentPath, isRoot);
  for (const child of node.children) {
    await writePage(child, childBase, false, ctx, errors);
  }
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

const email = process.env["CONFLUENCE_USER_EMAIL"];
const token = process.env["CONFLUENCE_API_TOKEN"];

if (!site) {
  console.error("✗ --site je povinný argument.");
  process.exit(1);
}
if (!rootPageId) {
  console.error("✗ --root-page-id je povinný argument.");
  process.exit(1);
}
if (!outputDir) {
  console.error("✗ --output je povinný argument.");
  process.exit(1);
}
if (!email || !token) {
  console.error(
    "✗ CONFLUENCE_USER_EMAIL a CONFLUENCE_API_TOKEN musí být nastaveny.",
  );
  process.exit(1);
}

const docsRoot = path.resolve(outputDir, "..");
const publicDir = path.resolve(docsRoot, "public", "images");
const authHeader =
  "Basic " + Buffer.from(`${email}:${token}`).toString("base64");

console.log(`\nImportuji z Confluence`);
console.log(`  site         : ${site}`);
console.log(`  root-page-id : ${rootPageId}`);
console.log(`  output       : ${outputDir}`);
console.log();

const errors: ImportError[] = [];
const tree = await buildTree(site, rootPageId, authHeader, errors);

if (!tree) {
  console.error(
    `✗ Nepodařilo se načíst kořenovou stránku ${rootPageId}.${errors[0] ? ` (${errors[0].error})` : ""}`,
  );
  process.exit(1);
}

const pagePathMap = new Map<string, string>();
buildPathMap(tree, outputDir, true, pagePathMap);

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

await writePage(
  tree,
  outputDir,
  true,
  { site, authHeader, publicDir, pagePathMap, docsRoot },
  errors,
);

console.log(
  `\n✓ Hotovo. Importováno ${countNodes(tree)} stránek do ${outputDir}`,
);
if (errors.length > 0) {
  console.warn(`⚠ ${errors.length} stránek se nepodařilo zpracovat:`);
  for (const e of errors) {
    console.warn(`  - ${e.title ?? e.pageId}: ${e.error}`);
  }
}
console.log(`  Zkontroluj soubory a nastav status: published kde je vhodné.`);
