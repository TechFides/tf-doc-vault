/**
 * Per-project PDF branding, read from `tf-doc-vault.json` in the project root,
 * plus the escape both consumers put its values through. The print generator and
 * the PDF exporter are separate Node processes that never load the VitePress
 * config, so this is the only channel between an offer's identity and its export.
 */

import { readProjectConfig } from "../shared/project-config.js";
import { configOrExit } from "./config-or-exit.js";

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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function readPdfBranding(root: string = process.cwd()): PdfBranding {
  const pdf = configOrExit(() => readProjectConfig(root)["pdf"]);
  return (pdf as PdfBranding | undefined) ?? {};
}
