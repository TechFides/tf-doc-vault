/**
 * ADF → VitePress-Markdown conversion.
 *
 * The heavy lifting is done by `extended-markdown-adf-parser`. Around it we add:
 *   - PRE-processing of the ADF tree, turning nodes the library would otherwise
 *     dump as raw-JSON "unknown" fragments (blockCard/embedCard/inlineCard,
 *     mention, status, mediaInline, taskList, decisionList, layoutSection,
 *     external media) into nodes it renders cleanly, and promoting header-less
 *     tables so they emit a separator row (and therefore render as tables).
 *   - POST-processing of the markdown: stripping the library's round-trip
 *     `<!-- adf:* -->` comments, turning `~~~panel~~~` / `~~~expand~~~` fences
 *     into VitePress containers, mapping Atlassian emoji shortnames to Unicode,
 *     and escaping the few sequences that break VitePress' Vue compiler.
 *
 * `convertAdf` is pure (no I/O). Media is left as `adf:media:<id>` placeholders
 * for the caller to resolve against the page's attachments — see resolve-media.
 */

import { Parser, type ADFDocument } from "extended-markdown-adf-parser";
import { type AdfNode, type AdfValue, isAdfNode } from "./types.js";

const parser = new Parser();

/**
 * Atlassian emoji shortnames → Unicode. `atlassian-*` emojis carry their
 * shortname (e.g. `:check_mark:`) in the ADF instead of a Unicode character,
 * so without this map they survive as literal `:check_mark:` text.
 */
export const ATLASSIAN_EMOJI: Record<string, string> = {
  ":check_mark:": "✅",
  ":white_check_mark:": "✅",
  ":heavy_check_mark:": "✔️",
  ":cross_mark:": "❌",
  ":x:": "❌",
  ":warning:": "⚠️",
  ":information_source:": "ℹ️",
  ":question:": "❓",
  ":grey_question:": "❔",
  ":exclamation:": "❗",
  ":heavy_exclamation_mark:": "❗",
  ":star:": "⭐",
  ":fire:": "🔥",
  ":thumbsup:": "👍",
  ":+1:": "👍",
  ":thumbsdown:": "👎",
  ":-1:": "👎",
  ":bulb:": "💡",
  ":memo:": "📝",
  ":pencil:": "✏️",
  ":rocket:": "🚀",
  ":eyes:": "👀",
  ":lock:": "🔒",
  ":unlock:": "🔓",
  ":key:": "🔑",
  ":calendar:": "📅",
  ":clock:": "🕐",
  ":hourglass:": "⏳",
  ":green_circle:": "🟢",
  ":red_circle:": "🔴",
  ":yellow_circle:": "🟡",
  ":large_blue_circle:": "🔵",
  ":tada:": "🎉",
  ":wave:": "👋",
  ":point_right:": "👉",
  ":heavy_plus_sign:": "➕",
  ":heavy_minus_sign:": "➖",
};

// ─── small helpers ──────────────────────────────────────────────────────────

function attrStr(node: AdfNode, key: string): string | undefined {
  const v = node.attrs?.[key];
  return typeof v === "string" ? v : undefined;
}

function asNodes(v: AdfValue): AdfNode[] {
  return Array.isArray(v) ? v.filter(isAdfNode) : [];
}

function inlineChildren(node: AdfNode): AdfValue[] {
  return Array.isArray(node.content) ? node.content : [];
}

function linkText(url: string, text?: string): AdfNode {
  return {
    type: "text",
    text: text && text.length > 0 ? text : url,
    marks: [{ type: "link", attrs: { href: url } }],
  };
}

function paragraphLink(url: string | undefined, text?: string): AdfNode {
  if (!url) return { type: "paragraph" };
  return { type: "paragraph", content: [linkText(url, text)] };
}

// ─── ADF pre-processing ─────────────────────────────────────────────────────

function cardToParagraphLink(node: AdfNode): AdfNode {
  return paragraphLink(attrStr(node, "url"), attrStr(node, "url"));
}

function cardToInlineLink(node: AdfNode): AdfNode {
  const url = attrStr(node, "url");
  if (!url) return { type: "text", text: "" };
  return linkText(url, url);
}

function mentionToText(node: AdfNode): AdfNode {
  return { type: "text", text: attrStr(node, "text") ?? "@user" };
}

function statusToText(node: AdfNode): AdfNode {
  const text = attrStr(node, "text");
  if (!text) return { type: "text", text: "" };
  return { type: "text", text: `[${text}]`, marks: [{ type: "strong" }] };
}

function mediaInlineToMedia(node: AdfNode): AdfNode {
  if (attrStr(node, "type") === "external") {
    return paragraphLink(attrStr(node, "url"), attrStr(node, "alt"));
  }
  return {
    type: "mediaSingle",
    content: [{ type: "media", attrs: node.attrs }],
  };
}

/**
 * Normalise a media container (mediaSingle/mediaGroup):
 *   - external (URL) media → a link (the library can't resolve `adf:media:`);
 *   - a `caption` child → lifted out as a following paragraph (the library
 *     treats `caption` as an unknown node and would otherwise drop it).
 */
function mediaContainer(node: AdfNode): AdfValue | AdfValue[] {
  const children = asNodes(node.content);
  const media = children.find((c) => c.type === "media");
  if (media && attrStr(media, "type") === "external") {
    return paragraphLink(attrStr(media, "url"), attrStr(media, "alt"));
  }
  const caption = children.find((c) => c.type === "caption");
  if (!caption) return node;
  const mediaOnly: AdfNode = {
    ...node,
    content: children.filter((c) => c.type !== "caption"),
  };
  const capContent = inlineChildren(caption);
  if (capContent.length === 0) return mediaOnly;
  return [mediaOnly, { type: "paragraph", content: capContent }];
}

function taskListToBulletList(node: AdfNode): AdfNode {
  const items: AdfNode[] = [];
  for (const child of asNodes(node.content)) {
    if (child.type !== "taskItem") {
      const prev = items[items.length - 1];
      if (prev) {
        prev.content = [...asNodes(prev.content), child];
      } else {
        items.push({ type: "listItem", content: [child] });
      }
      continue;
    }
    const prefix = attrStr(child, "state") === "DONE" ? "[x] " : "[ ] ";
    items.push({
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: prefix }, ...inlineChildren(child)],
        },
      ],
    });
  }
  return { type: "bulletList", content: items };
}

const EMPHASIS_MARK_TYPES = new Set(["strong", "em", "strike"]);

function liftMarkEdgeWhitespace(node: AdfNode): AdfValue | AdfValue[] {
  const text = node.text;
  if (
    typeof text !== "string" ||
    !node.marks?.some((m) => EMPHASIS_MARK_TYPES.has(m.type))
  ) {
    return node;
  }
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  if (!match) return node;
  const [, lead = "", core = "", trail = ""] = match;
  if (!lead && !trail) return node;
  if (!core) return { type: "text", text: " " };
  const out: AdfNode[] = [];
  if (lead) out.push({ type: "text", text: lead });
  out.push({ ...node, text: core });
  if (trail) out.push({ type: "text", text: trail });
  return out;
}

function decisionListToBulletList(node: AdfNode): AdfNode {
  const items = asNodes(node.content).map((item): AdfNode => {
    const prefix = attrStr(item, "state") === "DECIDED" ? "✓ " : "";
    return {
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: prefix }, ...inlineChildren(item)],
        },
      ],
    };
  });
  return { type: "bulletList", content: items };
}

/** Markdown has no columns — flatten a layout into stacked blocks. */
function flattenLayout(node: AdfNode): AdfNode[] {
  return asNodes(node.content).flatMap((column) => asNodes(column.content));
}

/** A cell is "simple" if it holds at most one paragraph (no lists/blocks). */
function isSimpleCell(cell: AdfNode): boolean {
  const blocks = asNodes(cell.content);
  if (blocks.length === 0) return true;
  return blocks.length === 1 && blocks[0]?.type === "paragraph";
}

/**
 * GFM table cells only render inline content, so a `heading` inside a cell is
 * emitted as literal `### …` text. Demote every heading inside a cell to a
 * paragraph (its inline marks — e.g. bold — are preserved), so the title stays
 * emphasised without leaking the `#` markup into the rendered cell.
 */
function demoteCellHeadings(table: AdfNode): AdfNode {
  const rows = asNodes(table.content).map((row): AdfNode => {
    const cells = asNodes(row.content).map((cell): AdfNode => {
      const blocks = asNodes(cell.content);
      const mapped = blocks.map((block, i): AdfNode => {
        if (block.type !== "heading") return block;
        // A heading followed by more content keeps a line break after it so the
        // (now inline) title is not glued to the body text in the rendered cell.
        const inline = inlineChildren(block);
        const content =
          i < blocks.length - 1 ? [...inline, { type: "hardBreak" }] : inline;
        return { type: "paragraph", content };
      });
      return { ...cell, content: mapped };
    });
    return { ...row, content: cells };
  });
  return { ...table, content: rows };
}

/**
 * GFM tables need a header row to emit a separator (and thus render at all).
 * Confluence tables whose first row is plain `tableCell` produce no separator,
 * so we promote that first row to `tableHeader` — but only when its cells are
 * simple. Promoting a row with block content (e.g. a list) makes the library
 * emit a literal newline that breaks the pipe table, so such tables are left
 * as-is (the library renders their block cells with `<br>` instead).
 */
function ensureTableHeader(node: AdfNode): AdfNode {
  const rows = asNodes(node.content);
  const hasHeader = rows.some((row) =>
    asNodes(row.content).some((cell) => cell.type === "tableHeader"),
  );
  if (hasHeader || rows.length === 0) return node;
  const [first, ...rest] = rows;
  if (!first) return node;
  const cells = asNodes(first.content);
  if (!cells.every(isSimpleCell)) return node;
  const promoted: AdfNode = {
    ...first,
    content: cells.map((cell) =>
      cell.type === "tableCell" ? { ...cell, type: "tableHeader" } : cell,
    ),
  };
  return { ...node, content: [promoted, ...rest] };
}

function transformChildren(content: AdfValue): AdfValue {
  if (!Array.isArray(content)) return content;
  return content.flatMap((child): AdfValue[] => {
    const r = transformNode(child);
    return Array.isArray(r) ? r : [r];
  });
}

function transformNode(node: AdfValue): AdfValue | AdfValue[] {
  if (!isAdfNode(node)) return node;
  const withChildren: AdfNode =
    node.content !== undefined
      ? { ...node, content: transformChildren(node.content) }
      : node;

  switch (withChildren.type) {
    case "text":
      return liftMarkEdgeWhitespace(withChildren);
    case "blockCard":
    case "embedCard":
      return cardToParagraphLink(withChildren);
    case "inlineCard":
      return cardToInlineLink(withChildren);
    case "mention":
      return mentionToText(withChildren);
    case "status":
      return statusToText(withChildren);
    case "mediaInline":
      return mediaInlineToMedia(withChildren);
    case "mediaSingle":
    case "mediaGroup":
      return mediaContainer(withChildren);
    case "taskList":
      return taskListToBulletList(withChildren);
    case "decisionList":
      return decisionListToBulletList(withChildren);
    case "layoutSection":
      return flattenLayout(withChildren);
    case "table":
      return ensureTableHeader(demoteCellHeadings(withChildren));
    default:
      return withChildren;
  }
}

export function preprocessAdf(adf: AdfNode): ADFDocument {
  return {
    type: "doc",
    version: typeof adf.version === "number" ? adf.version : 1,
    content: asNodes(transformChildren(adf.content)),
  } as unknown as ADFDocument;
}

// ─── markdown post-processing ───────────────────────────────────────────────

const PANEL_CONTAINER: Record<string, string> = {
  info: "info",
  note: "info",
  tip: "tip",
  success: "tip",
  warning: "warning",
  error: "danger",
};

function stripUnknownBlocks(md: string): {
  md: string;
  unknownTypes: string[];
} {
  const UNKNOWN =
    /<!-- adf:unknown type="([^"]*)"[\s\S]*?<!-- \/adf:unknown -->/g;
  const unknownTypes: string[] = [];
  const out = md.replace(UNKNOWN, (_match, type: string): string => {
    unknownTypes.push(type);
    return "";
  });
  return { md: out, unknownTypes };
}

function stripAdfComments(md: string): string {
  return md
    .replace(/<!--\s*\/?adf:[\s\S]*?-->/g, "")
    .replace(/<!--\s*colspan=\d+\s*-->/g, "");
}

function panelsToContainers(md: string): string {
  return md.replace(
    /~~~panel type=(\w+)[^\n]*\n([\s\S]*?)\n~~~/g,
    (_match, type: string, body: string): string => {
      const container = PANEL_CONTAINER[type] ?? "info";
      return `::: ${container}\n${body}\n:::`;
    },
  );
}

function expandsToContainers(md: string): string {
  return md.replace(
    /~~~expand(?: title="([^"]*)")?(?: attrs='[^']*')?[^\n]*\n([\s\S]*?)\n~~~/g,
    (_match, title: string | undefined, body: string): string => {
      const summary = title?.trim() ? title.trim() : "Detaily";
      return `::: details ${summary}\n${body}\n:::`;
    },
  );
}

/**
 * Apply `fn` to every part of `md` that is NOT inside a fenced code block or an
 * inline code span, so we never rewrite code content.
 */
function transformOutsideCode(md: string, fn: (s: string) => string): string {
  const CODE = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g;
  let result = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = CODE.exec(md)) !== null) {
    result += fn(md.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return result + fn(md.slice(last));
}

/**
 * Confluence applies a bold mark to the text *including* its surrounding spaces,
 * so the parser emits `**text **` / `** text**`. Markdown only treats `**` as a
 * delimiter when it hugs a non-space character, so those render as literal
 * asterisks. Move any whitespace that sits just inside the markers to the
 * outside (`**text **` → `**text** `); drop the emphasis entirely when it wraps
 * nothing but whitespace (`** **`).
 */
function fixEmphasisWhitespace(md: string): string {
  return transformOutsideCode(md, (s) =>
    s.replace(
      /\*\*([ \t]*)([^\n]*?)([ \t]*)\*\*/g,
      (_match, lead: string, body: string, trail: string): string =>
        body.trim() === "" ? lead + trail : `${lead}**${body}**${trail}`,
    ),
  );
}

function applyEmoji(md: string): string {
  return transformOutsideCode(md, (s) => {
    let out = s;
    for (const [shortName, unicode] of Object.entries(ATLASSIAN_EMOJI)) {
      if (out.includes(shortName)) out = out.split(shortName).join(unicode);
    }
    return out;
  });
}

/**
 * Escape sequences that break VitePress' Vue compiler — stray `<`/`>` (parsed
 * as components → "element is missing end tag") and `{{` (interpolation) — while
 * preserving the `<br>` tags the converter intentionally emits in table cells.
 */
function escapeForVue(md: string): string {
  return transformOutsideCode(md, (s) => {
    const BR = /<br\s*\/?>/gi;
    return s
      .split(BR)
      .map((part) =>
        part
          .replace(/</g, "\\<")
          .replace(/>/g, "\\>")
          .replace(/\{\{/g, "&#123;&#123;"),
      )
      .join("<br>");
  });
}

export interface ConvertResult {
  markdown: string;
  /** ADF node types the library could not render (dropped from the output). */
  unknownTypes: string[];
}

/**
 * Convert an ADF document node to VitePress-flavoured Markdown. Media is left as
 * `adf:media:<id>` placeholders for the caller to resolve against attachments.
 */
export function convertAdf(adf: AdfNode): ConvertResult {
  let md: string;
  try {
    md = parser.adfToMarkdown(preprocessAdf(adf));
  } catch {
    return { markdown: "", unknownTypes: [] };
  }
  const stripped = stripUnknownBlocks(md);
  md = stripAdfComments(stripped.md);
  md = panelsToContainers(md);
  md = expandsToContainers(md);
  md = fixEmphasisWhitespace(md);
  md = applyEmoji(md);
  md = escapeForVue(md);
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return { markdown: md, unknownTypes: stripped.unknownTypes };
}
