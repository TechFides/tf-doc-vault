/**
 * Resolve the `adf:media:<id>` placeholders left by the converter against a
 * page's attachment list, rewriting them to `/images/<filename>` references.
 *
 * Pure (no I/O) so it can be unit-tested without the network. The caller is
 * responsible for actually downloading the resolved files into `public/images`.
 */

import { type Attachment } from "./types.js";

/** Matches `![alt](adf:media:<id>)` image references emitted by the converter. */
const MEDIA_REF = /!\[([^\]]*)\]\(adf:media:([^)]+)\)/g;

export interface MediaRef {
  alt: string;
  id: string;
}

export interface AttachmentIndex {
  /** ADF media id (== attachment.extensions.fileId) → filename. */
  byFileId: Map<string, string>;
  /** Attachment title (== filename, also the ADF media `alt`) → filename. */
  byTitle: Map<string, string>;
}

/** Collect every `adf:media:<id>` reference present in the markdown. */
export function parseMediaRefs(markdown: string): MediaRef[] {
  const refs: MediaRef[] = [];
  for (const m of markdown.matchAll(MEDIA_REF)) {
    refs.push({ alt: m[1] ?? "", id: m[2] ?? "" });
  }
  return refs;
}

export function buildAttachmentIndex(
  attachments: Attachment[],
): AttachmentIndex {
  const byFileId = new Map<string, string>();
  const byTitle = new Map<string, string>();
  for (const att of attachments) {
    if (!att.title) continue;
    if (att.extensions?.fileId) byFileId.set(att.extensions.fileId, att.title);
    byTitle.set(att.title, att.title);
  }
  return { byFileId, byTitle };
}

export interface ResolveResult {
  markdown: string;
  /** References that matched no attachment (image dropped from the output). */
  unresolved: MediaRef[];
}

/**
 * Rewrite `adf:media:<id>` placeholders to `/images/<filename>`.
 * Resolution order: attachment fileId (authoritative) → alt/filename fallback.
 * Unresolved references are dropped (and reported) so no broken `adf:media:` URL
 * leaks into the published docs.
 */
export function resolveMediaInMarkdown(
  markdown: string,
  index: AttachmentIndex,
): ResolveResult {
  const unresolved: MediaRef[] = [];
  const out = markdown.replace(
    MEDIA_REF,
    (_match, alt: string, id: string): string => {
      const filename = index.byFileId.get(id) ?? index.byTitle.get(alt);
      if (filename) return `![${alt}](/images/${filename})`;
      unresolved.push({ alt, id });
      return "";
    },
  );
  return { markdown: out, unresolved };
}
