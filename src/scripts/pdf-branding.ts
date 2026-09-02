/**
 * Per-project PDF branding, read from `tf-doc-vault.json` in the project root,
 * plus the escape both consumers put its values through. The print generator and
 * the PDF exporter are separate Node processes that never load the VitePress
 * config, so this is the only channel between an offer's identity and its export.
 */

import fs from "node:fs";
import path from "node:path";

export interface PdfCover {
  /** Set above the title, in caps. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  vendor?: string;
  website?: string;
  /** The addressee, as it should appear on the imprint. */
  recipient?: string;
  validUntil?: string;
  contact?: string;
  /** Also repeated in the running footer. */
  confidentiality?: string;
}

export interface PdfBranding {
  /** Output name under `artifacts/`. Defaults to `docs-full.pdf`. */
  fileName?: string;
  /** Wordmark on the letterhead rule. Omitted means no letterhead. */
  mark?: string;
  /** Left half of the running footer. */
  footerLabel?: string;
  /** Omitted means the document opens on its table of contents. */
  cover?: PdfCover;
}

const CONFIG_FILE = "tf-doc-vault.json";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * A missing file is the documented way to opt out, so it yields defaults. A file
 * that exists but cannot be parsed is a typo in something the author meant to
 * apply, and fails loudly rather than silently dropping their cover page.
 */
export function readPdfBranding(root: string = process.cwd()): PdfBranding {
  const file = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(file)) return {};

  try {
    return (
      (JSON.parse(fs.readFileSync(file, "utf-8")) as { pdf?: PdfBranding })
        .pdf ?? {}
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${CONFIG_FILE} could not be read: ${reason}`);
    process.exit(1);
  }
}
