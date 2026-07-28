/**
 * Confluence REST client used by import-confluence. Built for large spaces:
 * requests go through a bounded concurrency pool, are retried with backoff on
 * 429/5xx/transient network errors, and listings are fully paginated.
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import {
  type Attachment,
  type ChildPage,
  type ConfluencePage,
  type ImportError,
  type TreeNode,
  errorMessage,
} from "./types.js";
import { slugify } from "./layout.js";

const MAX_CONCURRENCY = 6;
const MAX_RETRIES = 3;

// ─── concurrency pool ────────────────────────────────────────────────────────

let active = 0;
const waiters: Array<() => void> = [];

async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENCY) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

// ─── retry ───────────────────────────────────────────────────────────────────

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isRetryable(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  if (err instanceof Error && err.message.startsWith("Invalid JSON")) {
    return false;
  }
  return true; // transient network errors (ECONNRESET, ETIMEDOUT, …)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES - 1 || !isRetryable(err)) throw err;
      const backoff = 400 * 2 ** attempt + Math.floor(Math.random() * 200);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

// ─── HTTP ──────────────────────────────────────────────────────────────────

function getJson<T>(url: string, authHeader: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { Authorization: authHeader, Accept: "application/json" } },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status >= 400) {
            reject(new HttpError(status, `HTTP ${status} for ${url}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error(`Invalid JSON from ${url}`));
          }
        });
      },
    );
    req.on("error", reject);
  });
}

export function fetchJson<T>(url: string, authHeader: string): Promise<T> {
  return withLimit(() => withRetry(() => getJson<T>(url, authHeader)));
}

function downloadRaw(
  url: string,
  destPath: string,
  authHeader: string | null,
  depth: number,
): Promise<void> {
  if (depth > 5) return Promise.reject(new Error(`Too many redirects: ${url}`));
  return new Promise<void>((resolve, reject) => {
    // Confluence attachment links 302 to a signed S3 URL. Follow Location, but
    // drop Authorization on cross-origin hops so the token stays with Atlassian.
    const headers: Record<string, string> =
      depth === 0 && authHeader ? { Authorization: authHeader } : {};
    const req = https.get(url, { headers }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        const sameOrigin = new URL(next).host === new URL(url).host;
        downloadRaw(
          next,
          destPath,
          sameOrigin ? authHeader : null,
          depth + 1,
        ).then(resolve, reject);
        return;
      }
      if (status >= 400) {
        reject(new HttpError(status, `HTTP ${status} downloading ${url}`));
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

export function downloadBinary(
  url: string,
  destPath: string,
  authHeader: string | null,
): Promise<void> {
  return withLimit(() =>
    withRetry(() => downloadRaw(url, destPath, authHeader, 0)),
  );
}

// ─── pagination ──────────────────────────────────────────────────────────────

interface Paged<T> {
  results: T[];
  _links?: { next?: string };
}

export function absoluteNext(
  site: string,
  next: string | undefined,
): string | undefined {
  if (!next) return undefined;
  if (next.startsWith("http")) return next;
  if (next.startsWith("/wiki")) return `https://${site}${next}`;
  return `https://${site}/wiki${next}`;
}

async function fetchAllPages<T>(
  site: string,
  firstUrl: string,
  authHeader: string,
): Promise<T[]> {
  const all: T[] = [];
  let url: string | undefined = firstUrl;
  while (url) {
    const resp: Paged<T> = await fetchJson<Paged<T>>(url, authHeader);
    all.push(...(resp.results ?? []));
    url = absoluteNext(site, resp._links?.next);
  }
  return all;
}

// ─── Confluence API ──────────────────────────────────────────────────────────

export function fetchPage(
  site: string,
  pageId: string,
  authHeader: string,
): Promise<ConfluencePage> {
  const url = `https://${site}/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`;
  return fetchJson<ConfluencePage>(url, authHeader);
}

export function fetchChildren(
  site: string,
  pageId: string,
  authHeader: string,
): Promise<ChildPage[]> {
  const url = `https://${site}/wiki/api/v2/pages/${pageId}/children?limit=250`;
  return fetchAllPages<ChildPage>(site, url, authHeader);
}

export async function fetchAttachments(
  site: string,
  pageId: string,
  authHeader: string,
): Promise<Attachment[]> {
  try {
    const url = `https://${site}/wiki/rest/api/content/${pageId}/child/attachment?limit=100&expand=extensions,metadata`;
    return await fetchAllPages<Attachment>(site, url, authHeader);
  } catch {
    // Attachment list unavailable (e.g. permissions): the page still imports;
    // its images simply resolve to "unresolved" and are reported by the caller.
    return [];
  }
}

/**
 * The `emoji-title-published` page property, stored as a hex code point such as
 * "1f680". Returns null when the property is unset or the request fails.
 */
export async function fetchPageEmoji(
  site: string,
  pageId: string,
  authHeader: string,
): Promise<string | null> {
  try {
    const url = `https://${site}/wiki/rest/api/content/${pageId}/property/emoji-title-published`;
    const data = await fetchJson<{ value?: unknown }>(url, authHeader);
    if (typeof data.value !== "string") return null;
    if (/^[0-9a-f]{4,6}$/i.test(data.value)) {
      return String.fromCodePoint(parseInt(data.value, 16));
    }
    return data.value;
  } catch {
    return null;
  }
}

// ─── tree ────────────────────────────────────────────────────────────────────

/**
 * Recursively fetch a page and its descendants. A failing page lands in
 * `errors` and skips its subtree instead of aborting the whole import.
 */
export async function buildTree(
  site: string,
  pageId: string,
  authHeader: string,
  errors: ImportError[],
): Promise<TreeNode | null> {
  let page: ConfluencePage;
  let childPages: ChildPage[];
  let emoji: string | null;
  try {
    [page, childPages, emoji] = await Promise.all([
      fetchPage(site, pageId, authHeader),
      fetchChildren(site, pageId, authHeader),
      fetchPageEmoji(site, pageId, authHeader),
    ]);
  } catch (err) {
    errors.push({ pageId, error: errorMessage(err) });
    return null;
  }

  const childResults = await Promise.all(
    childPages.map((c) => buildTree(site, c.id, authHeader, errors)),
  );
  const children = childResults.filter((c): c is TreeNode => c !== null);

  return {
    page,
    children,
    slug: slugify(page.title),
    emoji,
    cleanTitle: page.title.replace(/^\[.*?\]\s*/, ""),
  };
}
