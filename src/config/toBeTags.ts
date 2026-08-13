import container from "markdown-it-container";
import type { MarkdownRenderer } from "vitepress";

// VitePress bundles markdown-it instead of depending on it, so
// `markdown-it/lib/token.mjs` does not resolve.
type RenderRule = NonNullable<MarkdownRenderer["renderer"]["rules"][string]>;
type Token = Parameters<RenderRule>[0][number];

/**
 * Tagging for planned, not-yet-deployed changes in a functional specification.
 * Analysts write `{ADD <ticket>}…{/ADD}` inline or a `::: add <ticket>` block;
 * both render coloured with the ticket linked. Omit the option to register no
 * rules at all.
 */
export interface ToBeTags {
  /**
   * Base URL the ticket is appended to, including the browse path, e.g.
   * `https://acme.atlassian.net/browse`. The ticket is never checked against a
   * project key, so any tracker works.
   */
  jiraBaseUrl: string;
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

const OPEN_TOKEN = "tobe_open";
const CLOSE_TOKEN = "tobe_close";
const KINDS: readonly Kind[] = ["add", "del"];
const CURLY = 0x7b;

// A whitespace-free ticket is what keeps prose like `{ADD a note here}` from
// parsing as a marker.
const OPEN = /^\{(ADD|DEL)\s+([^}\s]+)\}/;
const CLOSE = /^\{\/(ADD|DEL)\}/;
// The \s+ stops `::: added` from matching the `add` container.
const INFO: Record<Kind, RegExp> = {
  add: /^add\s+([^}\s]+)\s*$/,
  del: /^del\s+([^}\s]+)\s*$/,
};

// Rules read options from here rather than closing over them: VitePress caches
// one renderer per process, so a later call has to retarget the installed rules
// instead of adding a second copy of each.
const configs = new WeakMap<MarkdownRenderer, ToBeTags>();

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

function registerInline(md: MarkdownRenderer): void {
  md.inline.ruler.before("link", "tobe-tag", (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== CURLY) return false;
    const rest = state.src.slice(state.pos, state.posMax);

    const opening = OPEN.exec(rest);
    if (opening) {
      if (!silent) {
        // Nesting stays 0: with real nesting markdown-it keeps a delimiter
        // stack, and an unmatched closer pops it empty, then crashes
        // `link_pairs` on an undefined `state.delimiters`.
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

    return false;
  });
}

/** Pairing is per `inline` token, so an inline tag cannot cross a paragraph. */
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
    const meta = tokens[idx]?.meta as OpenMeta | undefined;
    if (!meta) return "";
    const base = configs.get(md)?.jiraBaseUrl;
    if (meta.unmatched || base === undefined) {
      return md.utils.escapeHtml(meta.literal);
    }
    return (
      `<span class="tf-tobe tf-tobe-${meta.kind}">` +
      openMarker(meta.kind, meta.ticket, base)
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
    validate: (params: string): boolean => INFO[kind].test(params.trim()),
    render: (tokens: Token[], idx: number): string => {
      const token = tokens[idx];
      if (token?.nesting !== 1) {
        return `<p class="tf-tobe-marker-line">${closeMarker(kind)}</p>\n</div>\n`;
      }
      const ticket = INFO[kind].exec(token.info.trim())?.[1] ?? "";
      const base = configs.get(md)?.jiraBaseUrl ?? "";
      return (
        `<div class="tf-tobe tf-tobe-${kind}">\n<p class="tf-tobe-marker-line">` +
        `${openMarker(kind, ticket, base)}</p>\n`
      );
    },
  });
}

export function toBeTags(md: MarkdownRenderer, options: ToBeTags): void {
  const installed = configs.has(md);
  configs.set(md, { jiraBaseUrl: options.jiraBaseUrl });
  if (installed) return;

  for (const kind of KINDS) registerContainer(md, kind);
  registerInline(md);
  registerPairing(md);
  registerRenderers(md);
}
