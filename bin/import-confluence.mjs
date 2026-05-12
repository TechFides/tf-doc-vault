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

/**
 * Escape all `<` and `>` in markdown outside fenced code blocks and inline code spans.
 * VitePress compiles markdown through Vue, which throws "element is missing end tag"
 * for any unrecognised `<tag>` in the rendered output.
 */

function escapeAngleBrackets(md) {
  // Match fenced code blocks, inline code spans, or angle brackets.
  // Capturing group 1 matches code blocks/spans; if it's missing, we matched an angle bracket.
  const CODE_OR_BRACKET = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)|[<>]/g;

  return md.replace(CODE_OR_BRACKET, (match, code) => {
    return !!code ? code : match === "<" ? "\\<" : "\\>";
  });
}

/** Quote a string for YAML only when needed; uses single quotes to avoid escaping. */
function yamlString(value) {
  if (
    /[[\]{}:#*!|>"%@`,]/.test(value) ||
    /^[&]/.test(value) ||
    /^\s|\s$/.test(value)
  ) {
    // Single-quote: only escape is '' for a literal single quote
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/^\[.*?\]\s*/, "") // strip [SERVICE_ID] prefix
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics
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
        res.on("data", (chunk) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(
              new Error(
                `HTTP ${res.statusCode} for ${url}: ${body.slice(0, 300)}`,
              ),
            );
          } else {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error(`Invalid JSON from ${url}`));
            }
          }
        });
      },
    );
    req.on("error", reject);
  });
}

function downloadBinary(url, destPath, authHeader, depth = 0) {
  if (depth > 5) return Promise.reject(new Error(`Too many redirects: ${url}`));
  return new Promise((resolve, reject) => {
    // Confluence attachment download links typically respond with 302 → signed
    // S3 URL. We must follow Location, but drop the Authorization header on
    // cross-origin hops so we don't leak the basic-auth token to S3.
    const headers = depth === 0 ? { Authorization: authHeader } : {};
    const req = https.get(url, { headers }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume(); // discard body
        const next = new URL(res.headers.location, url).toString();
        const sameOrigin = new URL(next).host === new URL(url).host;
        const nextAuth = sameOrigin ? authHeader : null;
        downloadBinary(next, destPath, nextAuth, depth + 1).then(
          resolve,
          reject,
        );
        return;
      }
      if (status >= 400) {
        reject(new Error(`HTTP ${status} downloading ${url}`));
        return;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", reject);
    });
    req.on("error", reject);
  });
}

function preprocessAdf(adfValue) {
  if (!adfValue) return null;
  try {
    return JSON.parse(adfValue);
  } catch (err) {
    console.warn(`  ⚠ ADF body není validní JSON (${err.message}).`);
    return null;
  }
}

/**
 * Walk an ADF tree and replace media container nodes with paragraph placeholders
 * that survive the adf-to-md conversion.
 *
 * `mediaSingle`/`mediaGroup` are replaced at the block level with a `paragraph`
 * containing a placeholder text node. Replacing only the inner `media` child with
 * a text node is not sufficient — adf-to-md expects a `media` child inside those
 * containers and emits nothing when it finds a text node instead.
 *
 * Confluence's ADF media nodes carry `attrs.id` — a media-platform UUID.
 * Attachment list entries expose the same UUID as `extensions.fileId`, so the
 * post-processing step matches by that field.
 */
function replaceMediaWithPlaceholders(node, mediaIds) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map((c) => replaceMediaWithPlaceholders(c, mediaIds));
  }
  // Block-level media containers: replace the whole element so adf-to-md emits the placeholder.
  if (node.type === "mediaSingle" || node.type === "mediaGroup") {
    const mediaNode = Array.isArray(node.content)
      ? node.content.find((c) => c.type === "media" && c.attrs?.id)
      : null;
    if (mediaNode) {
      mediaIds.push(mediaNode.attrs.id);
      return {
        type: "paragraph",
        content: [
          { type: "text", text: `__MEDIA_PLACEHOLDER_${mediaNode.attrs.id}__` },
        ],
      };
    }
    return node;
  }
  // Fallback for any remaining inline media nodes.
  if (node.type === "media" && node.attrs?.id) {
    mediaIds.push(node.attrs.id);
    return { type: "text", text: `__MEDIA_PLACEHOLDER_${node.attrs.id}__` };
  }
  if (node.content) {
    return {
      ...node,
      content: replaceMediaWithPlaceholders(node.content, mediaIds),
    };
  }
  return node;
}

/**
 * Fetch the Confluence emoji-title-published page property.
 * Confluence stores the emoji as a hex Unicode code point (e.g. "1f680" for 🚀),
 * so we convert it to the actual character. Returns null if not set / request fails.
 */
async function fetchPageEmoji(site, pageId, authHeader) {
  try {
    const url = `https://${site}/wiki/rest/api/content/${pageId}/property/emoji-title-published`;
    const data = await fetchJson(url, authHeader);
    if (typeof data.value !== "string") return null;
    // Hex code point → actual emoji character
    if (/^[0-9a-f]{4,6}$/i.test(data.value)) {
      return String.fromCodePoint(parseInt(data.value, 16));
    }
    return data.value;
  } catch {
    return null;
  }
}

function convertAdf(adfRoot, pageTitle) {
  const mediaIds = [];
  const processed = replaceMediaWithPlaceholders(adfRoot, mediaIds);
  try {
    return { markdown: adfToMd.convert(processed).result, mediaIds };
  } catch (err) {
    console.warn(
      `  ⚠ "${pageTitle}": adf-to-md konverze selhala (${err.message}).`,
    );
    return { markdown: "", mediaIds: [] };
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
      ? (new URLSearchParams(resp._links.next.split("?")[1]).get("cursor") ??
        undefined)
      : undefined;
  } while (cursor);
  return pages;
}

async function fetchAttachments(site, pageId, authHeader) {
  try {
    // expand=extensions surfaces extensions.fileId — the same UUID used by ADF
    // media nodes in attrs.id, so we can map media → attachment downloads.
    const url = `https://${site}/wiki/rest/api/content/${pageId}/child/attachment?limit=200&expand=extensions,metadata`;
    const data = await fetchJson(url, authHeader);
    return data.results ?? [];
  } catch (err) {
    console.warn(
      `  ⚠ Nelze načíst seznam attachmentů pro page ${pageId}: ${err.message}`,
    );
    return [];
  }
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

async function buildTree(site, pageId, authHeader) {
  const [page, childPages, emojiProperty] = await Promise.all([
    fetchPage(site, pageId, authHeader),
    fetchChildren(site, pageId, authHeader),
    fetchPageEmoji(site, pageId, authHeader),
  ]);
  const emoji = emojiProperty;
  const children = await Promise.all(
    childPages.map((c) => buildTree(site, c.id, authHeader)),
  );
  const title = page.title;
  return {
    page,
    children,
    slug: slugify(title),
    emoji,
    cleanTitle: title.replace(/^\[.*?\]\s*/, ""),
  };
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

async function writePage(
  node,
  parentPath,
  isRoot,
  { site, authHeader, publicDir, pagePathMap, docsRoot },
) {
  const adfValue = node.page.body?.atlas_doc_format?.value ?? "";
  const adfRoot = preprocessAdf(adfValue);
  if (!adfRoot) {
    console.warn(`  ⚠ "${node.page.title}": prázdné nebo nevalidní ADF tělo.`);
  }
  const { markdown: rawMarkdown, mediaIds } = adfRoot
    ? convertAdf(adfRoot, node.page.title)
    : { markdown: "", mediaIds: [] };
  let markdown = rawMarkdown;

  // Ensure code fences (``` or ~~~) always start on their own line.
  markdown = markdown.replace(/([^\n])(```|~~~)/g, "$1\n$2");

  markdown = escapeAngleBrackets(markdown);

  // Rewrite Confluence page links to VitePress paths (e.g. /v1/page)
  markdown = markdown.replace(
    /\[([^\]]+)\]\(https?:\/\/[^/]+\/wiki\/spaces\/[^/]+\/pages\/(\d+)[^)]*\)/g,
    (match, text, linkedId) => {
      const absPath = pagePathMap.get(linkedId);
      if (!absPath) return match;
      const relativePath = "/" + path.relative(docsRoot, absPath).replace(/\.md$/, "");
      return `[${text}](${relativePath})`;
    },
  );

  // Download image attachments + build a media-id → filename map
  const attachments = await fetchAttachments(site, node.page.id, authHeader);
  const mediaToFilename = new Map();
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
      // Tracked by media UUID (ADF attrs.id) → typically attachment.extensions.fileId
      const fileId = att.extensions?.fileId;
      if (fileId) mediaToFilename.set(fileId, filename);
      // Fallback: also expose by attachment id and title for diagnostics
      mediaToFilename.set(att.id, filename);
      // Best-effort: also catch the rare case where adf-to-md emits the raw URL
      markdown = markdown.split(downloadUrl).join(`/images/${filename}`);
    } catch (err) {
      console.warn(`  ⚠ Nelze stáhnout přílohu "${filename}": ${err.message}`);
    }
  }

  // Post-process media placeholders left by replaceMediaWithPlaceholders()
  markdown = markdown.replace(
    /__MEDIA_PLACEHOLDER_([\w-]+)__/g,
    (_match, mediaId) => {
      const filename = mediaToFilename.get(mediaId);
      if (filename) return `![${filename}](/images/${filename})`;
      console.warn(
        `  ⚠ "${node.page.title}": neznámé media id ${mediaId} (žádný odpovídající attachment).`,
      );
      return "";
    },
  );
  // Surface any media references that we collected from ADF but didn't resolve
  const unresolved = mediaIds.filter((id) => !mediaToFilename.has(id));
  if (unresolved.length > 0) {
    console.warn(
      `  ⚠ "${node.page.title}": ${unresolved.length} obrázek(ů) bez attachmentu.`,
    );
  }

  const filePath = isRoot
    ? path.join(parentPath, "index.md")
    : node.children.length > 0
      ? path.join(parentPath, node.slug, "index.md")
      : path.join(parentPath, `${node.slug}.md`);

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

${markdown.trimStart()}
`,
    "utf-8",
  );

  const childBase = isRoot
    ? parentPath
    : node.children.length > 0
      ? path.join(parentPath, node.slug)
      : parentPath;
  for (const child of node.children) {
    await writePage(child, childBase, false, {
      site,
      authHeader,
      publicDir,
      pagePathMap,
      docsRoot,
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const { flags } = parseArgs(process.argv.slice(2));

if (flags.help || flags.h) {
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
  process.exit(0);
}

const site = flags.site;
const rootPageId = flags["root-page-id"];
const outputDir = flags.output
  ? path.resolve(process.cwd(), flags.output)
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

const tree = await buildTree(site, rootPageId, authHeader);

const pagePathMap = new Map();
buildPathMap(tree, outputDir, true, pagePathMap);

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

await writePage(tree, outputDir, true, {
  site,
  authHeader,
  publicDir,
  pagePathMap,
  docsRoot,
});

console.log(
  `✓ Hotovo. Importováno ${countNodes(tree)} stránek do ${outputDir}`,
);
console.log(`  Zkontroluj soubory a nastav status: published kde je vhodné.`);
