import container from "markdown-it-container";
import type { MarkdownRenderer } from "vitepress";

/**
 * VitePress bundles markdown-it into its own dist rather than depending on the
 * package, so `markdown-it/lib/token.mjs` does not resolve. Recover the token
 * type from the renderer's public surface instead of adding a second copy of
 * markdown-it just for a type.
 */
type RenderRule = NonNullable<MarkdownRenderer["renderer"]["rules"][string]>;
type Token = Parameters<RenderRule>[0][number];

/**
 * TO-BE tagging: mark planned, not-yet-deployed changes in a functional
 * specification. Analysts write `{ADD <ticket>}…{/ADD}` inline or a
 * `::: add <ticket>` block; both render coloured with the ticket linked.
 * Omit the option and no rules are registered.
 */
export interface ToBeTags {
  /**
   * Base URL a ticket number is appended to, including the browse path, e.g.
   * `https://acme.atlassian.net/browse`. Any issue tracker works.
   */
  jiraBaseUrl: string;
  /**
   * Source pattern (a string, not a RegExp, so it survives config
   * serialisation) matching a ticket number. Defaults to `FF[VP]-\d+`.
   * Anchoring and grouping are added internally.
   */
  ticketPattern?: string;
}

type Kind = "add" | "del";

interface OpenMeta {
  kind: Kind;
  ticket: string;
  literal: string;
  unmatched?: boolean;
}

interface CloseMeta {
  kind: Kind;
  literal: string;
  unmatched?: boolean;
}

interface Resolved {
  jiraBaseUrl: string;
  pattern: string;
  /** Inline opener, e.g. `{ADD FFV-1}`. */
  open: RegExp;
  /** Container info string per kind, e.g. `add FFV-1`. */
  info: Record<Kind, RegExp>;
}

const DEFAULT_TICKET_PATTERN = "FF[VP]-\\d+";
const OPEN_TOKEN = "tobe_open";
const CLOSE_TOKEN = "tobe_close";
const KINDS: readonly Kind[] = ["add", "del"];
const CURLY = 0x7b;

// A marker shaped like ours but carrying a ticket the pattern rejects. Used only
// to warn: a typo'd ticket would otherwise render as silent literal text.
const LOOSE_OPEN = /^\{(ADD|DEL)\s+([^}]*)\}/;
const CLOSE = /^\{\/(ADD|DEL)\}/;

/**
 * Live options per renderer. The rules read from here instead of closing over
 * the values, so re-invoking `toBeTags` (the dev server re-runs the config on
 * HMR, and VitePress hands out one cached renderer per process) updates the
 * options without installing a second copy of every rule.
 */
const configs = new WeakMap<MarkdownRenderer, Resolved>();

function resolve(options: ToBeTags): Resolved {
  const pattern = options.ticketPattern ?? DEFAULT_TICKET_PATTERN;
  const info = (kind: Kind): RegExp =>
    // The \s+ stops `::: added` from matching the `add` container.
    new RegExp(`^${kind}\\s+(${pattern})\\s*$`);
  return {
    jiraBaseUrl: options.jiraBaseUrl,
    pattern,
    open: new RegExp(`^\\{(ADD|DEL)\\s+(${pattern})\\}`),
    info: { add: info("add"), del: info("del") },
  };
}

function ticketUrl(base: string, ticket: string): string {
  return `${base.replace(/\/+$/, "")}/${ticket}`;
}

function openMarker(kind: Kind, ticket: string, base: string): string {
  const href = ticketUrl(base, ticket);
  // &nbsp; so the marker never wraps between the label and the ticket.
  return (
    `<strong class="tf-tobe-marker">{${kind.toUpperCase()}&nbsp;` +
    `<a href="${href}" target="_blank" rel="noreferrer">${ticket}</a>}</strong>`
  );
}

function closeMarker(kind: Kind): string {
  return `<strong class="tf-tobe-marker">{/${kind.toUpperCase()}}</strong>`;
}

/** VitePress puts the page path here; absent when markdown-it is driven directly. */
function sourcePath(env: unknown): string {
  if (env && typeof env === "object" && "relativePath" in env) {
    const value = (env as { relativePath?: unknown }).relativePath;
    if (typeof value === "string") return value;
  }
  return "unknown file";
}

/**
 * Both markers are pushed with nesting 0 and emit their own `<span>` tags as
 * text. Real nesting (1/-1) would be more idiomatic but makes markdown-it
 * maintain a delimiter stack, and a closer with no opener pops it empty, then
 * crashes `link_pairs` on an undefined `state.delimiters`. Unbalanced markers are
 * a normal authoring mistake here, not an edge case, so the stack must stay
 * untouched.
 */
function registerInline(md: MarkdownRenderer): void {
  md.inline.ruler.before("link", "tobe-tag", (state, silent) => {
    const config = configs.get(md);
    if (!config) return false;
    if (state.src.charCodeAt(state.pos) !== CURLY) return false;
    const rest = state.src.slice(state.pos, state.posMax);

    const opening = config.open.exec(rest);
    if (opening) {
      if (!silent) {
        const token = state.push(OPEN_TOKEN, "span", 0);
        token.meta = {
          kind: opening[1]?.toLowerCase() as Kind,
          ticket: opening[2] ?? "",
          literal: opening[0],
        } satisfies OpenMeta;
      }
      state.pos += opening[0].length;
      return true;
    }

    const closing = CLOSE.exec(rest);
    if (closing) {
      if (!silent) {
        const token = state.push(CLOSE_TOKEN, "span", 0);
        token.meta = {
          kind: closing[1]?.toLowerCase() as Kind,
          literal: closing[0],
        } satisfies CloseMeta;
      }
      state.pos += closing[0].length;
      return true;
    }

    const loose = LOOSE_OPEN.exec(rest);
    if (loose && !silent) {
      console.warn(
        `[tf-doc-vault] ${sourcePath(state.env)}: "${loose[0]}" looks like a ` +
          `TO-BE tag but the ticket does not match /${config.pattern}/, so it ` +
          `renders as plain text.`,
      );
    }
    return false;
  });
}

/**
 * Pair the inline markers within each paragraph. An unclosed opener or a stray
 * closer is flagged to render as literal text: emitting a half-open span would
 * bleed colour into unrelated content, and the visible braces make the mistake
 * obvious to the author. Spanning a paragraph boundary is what the block form is
 * for.
 */
function registerPairing(md: MarkdownRenderer): void {
  md.core.ruler.push("tobe-pair", (state) => {
    for (const token of state.tokens) {
      if (token.type !== "inline" || !token.children) continue;

      const openers: Token[] = [];
      for (const child of token.children) {
        if (child.type === OPEN_TOKEN) {
          openers.push(child);
        } else if (child.type === CLOSE_TOKEN) {
          if (openers.length > 0) openers.pop();
          else (child.meta as CloseMeta).unmatched = true;
        }
      }
      for (const orphan of openers) {
        (orphan.meta as OpenMeta).unmatched = true;
      }
    }
    return true;
  });
}

function registerRenderers(md: MarkdownRenderer): void {
  md.renderer.rules[OPEN_TOKEN] = (tokens, idx): string => {
    const config = configs.get(md);
    const meta = tokens[idx]?.meta as OpenMeta | undefined;
    if (!config || !meta) return "";
    if (meta.unmatched) return md.utils.escapeHtml(meta.literal);
    return (
      `<span class="tf-tobe tf-tobe-${meta.kind}">` +
      openMarker(meta.kind, meta.ticket, config.jiraBaseUrl)
    );
  };

  md.renderer.rules[CLOSE_TOKEN] = (tokens, idx): string => {
    const meta = tokens[idx]?.meta as CloseMeta | undefined;
    if (!meta) return "";
    if (meta.unmatched) return md.utils.escapeHtml(meta.literal);
    return `${closeMarker(meta.kind)}</span>`;
  };
}

function registerContainer(md: MarkdownRenderer, kind: Kind): void {
  md.use(container, kind, {
    validate: (params: string): boolean =>
      configs.get(md)?.info[kind].test(params.trim()) ?? false,
    render: (tokens: Token[], idx: number): string => {
      const token = tokens[idx];
      if (token?.nesting !== 1) {
        return `<p class="tf-tobe-marker-line">${closeMarker(kind)}</p>\n</div>\n`;
      }
      const config = configs.get(md);
      const ticket = config?.info[kind].exec(token.info.trim())?.[1] ?? "";
      return (
        `<div class="tf-tobe tf-tobe-${kind}">\n<p class="tf-tobe-marker-line">` +
        `${openMarker(kind, ticket, config?.jiraBaseUrl ?? "")}</p>\n`
      );
    },
  });
}

export function toBeTags(md: MarkdownRenderer, options: ToBeTags): void {
  const installed = configs.has(md);
  configs.set(md, resolve(options));
  if (installed) return;

  for (const kind of KINDS) registerContainer(md, kind);
  registerInline(md);
  registerPairing(md);
  registerRenderers(md);
}
