/**
 * Shared types for the Confluence import pipeline. The ADF types are loose on
 * purpose: the importer walks arbitrary Confluence documents, so every field is
 * optional and an index signature keeps unknown attributes around.
 */

export type AdfValue =
  | AdfNode
  | AdfValue[]
  | string
  | number
  | boolean
  | null
  | undefined;

export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface AdfNode {
  type?: string;
  content?: AdfValue;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
  text?: string;
  [key: string]: unknown;
}

export interface ConfluencePage {
  id: string;
  title: string;
  body?: { atlas_doc_format?: { value?: string } };
  version?: { createdAt?: string };
}

export interface ChildPage {
  id: string;
}

export interface Attachment {
  id: string;
  title: string;
  metadata?: { mediaType?: string };
  extensions?: { fileId?: string };
  _links?: { download?: string };
}

export interface TreeNode {
  page: ConfluencePage;
  children: TreeNode[];
  slug: string;
  emoji: string | null;
  cleanTitle: string;
}

export interface ImportError {
  pageId: string;
  title?: string;
  error: string;
}

export function isAdfNode(v: AdfValue): v is AdfNode {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
