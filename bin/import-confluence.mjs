#!/usr/bin/env node
/**
 * import-confluence — download a Confluence page tree and convert it to
 * VitePress-compatible Markdown files in the output directory.
 *
 * Usage:
 *   import-confluence --site=<host> --root-page-id=<id> [--output=<dir>] [--space=<KEY>]
 *
 * Env vars:
 *   CONFLUENCE_USER_EMAIL   Atlassian account e-mail
 *   CONFLUENCE_API_TOKEN    Atlassian API token
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./utils.mjs";

// adf-to-md is CJS-only; load it via createRequire in ESM context
const require = createRequire(fileURLToPath(import.meta.url));
const adfToMd = require("adf-to-md");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/^\[.*?\]\s*/, "")       // strip [SERVICE_ID] prefix
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // remove diacritics
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function fetchJson(url, authHeader) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { Authorization: authHeader, Accept: "application/json" } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk.toString(); });
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}: ${body.slice(0, 300)}`));
          } else {
            try { resolve(JSON.parse(body)); } catch { reject(new Error(`Invalid JSON from ${url}`)); }
          }
        });
      },
    );
    req.on("error", reject);
  });
}

function downloadBinary(url, destPath, authHeader) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, { headers: { Authorization: authHeader } }, (res) => {
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("error", reject);
  });
}

function adfToMarkdown(adfValue) {
  try {
    return adfToMd.convert(JSON.parse(adfValue)).result;
  } catch {
    return "";
  }
}

function preservedStatus(filePath) {
  if (!fs.existsSync(filePath)) return "review";
  const match = fs.readFileSync(filePath, "utf-8").match(/^status:\s*(.+)$/m);
  return match?.[1]?.trim() === "published" ? "published" : "review";
}

// ─── Confluence API ───────────────────────────────────────────────────────────

async function fetchPage(site, pageId, authHeader) {
  const url = `https://${site}/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`;
  return fetchJson(url, authHeader);
}

async function fetchChildren(site, pageId, authHeader) {
  const pages = [];
  let cursor;
  do {
    const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const url = `https://${site}/wiki/api/v2/pages/${pageId}/children?body-format=atlas_doc_format&limit=250${cursorParam}`;
    const resp = await fetchJson(url, authHeader);
    pages.push(...resp.results);
    cursor = resp._links?.next
      ? new URLSearchParams(resp._links.next.split("?")[1]).get("cursor") ?? undefined
      : undefined;
  } while (cursor);
  return pages;
}

async function fetchAttachments(site, pageId, authHeader) {
  try {
    const url = `https://${site}/wiki/rest/api/content/${pageId}/child/attachment?limit=50`;
    const data = await fetchJson(url, authHeader);
    return data.results ?? [];
  } catch {
    return [];
  }
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

async function buildTree(site, pageId, authHeader) {
  const [page, childPages] = await Promise.all([
    fetchPage(site, pageId, authHeader),
    fetchChildren(site, pageId, authHeader),
  ]);
  const children = await Promise.all(
    childPages.map((c) => buildTree(site, c.id, authHeader)),
  );
  return { page, children, slug: slugify(page.title) };
}

function buildPathMap(node, parentPath, isRoot, map) {
  const filePath = isRoot
    ? path.join(parentPath, "index.md")
    : node.children.length > 0
      ? path.join(parentPath, node.slug, "index.md")
      : path.join(parentPath, `${node.slug}.md`);
  map.set(node.page.id, filePath);
  const childBase = isRoot
    ? parentPath
    : node.children.length > 0
      ? path.join(parentPath, node.slug)
      : parentPath;
  for (const child of node.children) buildPathMap(child, childBase, false, map);
}

function countNodes(node) {
  return 1 + node.children.reduce((s, c) => s + countNodes(c), 0);
}

// ─── Writer ───────────────────────────────────────────────────────────────────

async function writePage(node, parentPath, isRoot, { site, authHeader, publicDir, pagePathMap }) {
  const adfValue = node.page.body?.atlas_doc_format?.value ?? "";
  let markdown = adfToMarkdown(adfValue);

  // Rewrite Confluence page links to relative MD paths
  markdown = markdown.replace(
    /\[([^\]]+)\]\(https?:\/\/[^/]+\/wiki\/spaces\/[^/]+\/pages\/(\d+)[^)]*\)/g,
    (match, text, linkedId) => {
      const target = pagePathMap.get(linkedId);
      return target ? `[${text}](${target})` : match;
    },
  );

  // Download image attachments
  const attachments = await fetchAttachments(site, node.page.id, authHeader);
  for (const att of attachments) {
    const downloadLink = att._links?.download;
    if (!downloadLink) continue;
    if (!(att.metadata?.mediaType ?? "").startsWith("image/")) continue;
    const filename = att.title;
    const destPath = path.join(publicDir, filename);
    const downloadUrl = downloadLink.startsWith("http")
      ? downloadLink
      : `https://${site}/wiki${downloadLink}`;
    try {
      if (!fs.existsSync(destPath)) {
        await downloadBinary(downloadUrl, destPath, authHeader);
      }
      markdown = markdown.split(downloadUrl).join(`/images/${filename}`);
    } catch {
      console.warn(`  ⚠ Nelze stáhnout přílohu: ${filename}`);
    }
  }

  const filePath = isRoot
    ? path.join(parentPath, "index.md")
    : node.children.length > 0
      ? path.join(parentPath, node.slug, "index.md")
      : path.join(parentPath, `${node.slug}.md`);

  const updatedAt =
    node.page.version?.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const status = preservedStatus(filePath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---\ntitle: ${node.page.title}\nstatus: ${status}\nupdated_at: ${updatedAt}\n---\n\n${markdown.trimStart()}\n`,
    "utf-8",
  );

  const childBase = isRoot
    ? parentPath
    : node.children.length > 0
      ? path.join(parentPath, node.slug)
      : parentPath;
  for (const child of node.children) {
    await writePage(child, childBase, false, { site, authHeader, publicDir, pagePathMap });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const { flags } = parseArgs(process.argv.slice(2));

if (flags.help || flags.h) {
  console.log(`
import-confluence [options]

Import Confluence page tree into tech-docs/v1/ (or a custom output dir).

Options:
  --site=<host>           e.g. myorg.atlassian.net  (required)
  --root-page-id=<id>     Confluence root page ID   (required)
  --output=<dir>          output directory           (default: ./tech-docs/v1)
  --space=<KEY>           Confluence space key       (informational only)

Env vars:
  CONFLUENCE_USER_EMAIL
  CONFLUENCE_API_TOKEN
`);
  process.exit(0);
}

const site = flags.site;
const rootPageId = flags["root-page-id"];
const outputDir = path.resolve(process.cwd(), flags.output ?? "tech-docs/v1");
const publicDir = path.resolve(outputDir, "..", "public", "images");

const email = process.env["CONFLUENCE_USER_EMAIL"];
const token = process.env["CONFLUENCE_API_TOKEN"];

if (!site) { console.error("✗ --site je povinný argument."); process.exit(1); }
if (!rootPageId) { console.error("✗ --root-page-id je povinný argument."); process.exit(1); }
if (!email || !token) {
  console.error("✗ CONFLUENCE_USER_EMAIL a CONFLUENCE_API_TOKEN musí být nastaveny.");
  process.exit(1);
}

const authHeader = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");

console.log(`\nImportuji z Confluence`);
console.log(`  site         : ${site}`);
console.log(`  root-page-id : ${rootPageId}`);
console.log(`  output       : ${outputDir}`);
console.log();

const tree = await buildTree(site, rootPageId, authHeader);

const pagePathMap = new Map();
buildPathMap(tree, outputDir, true, pagePathMap);

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

await writePage(tree, outputDir, true, { site, authHeader, publicDir, pagePathMap });

console.log(`✓ Hotovo. Importováno ${countNodes(tree)} stránek do ${outputDir}`);
console.log(`  Zkontroluj soubory a nastav status: published kde je vhodné.`);
