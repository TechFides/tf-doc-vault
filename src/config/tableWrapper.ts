import type { MarkdownRenderer } from "vitepress";

/**
 * Wrap every rendered `<table>` in a horizontally scrollable container.
 *
 * VitePress emits bare `<table>` elements; a wide, many-column table then
 * overflows the content column and loses its right border. Each table is
 * wrapped as:
 *
 *   <div class="tf-table">          ← frame (border/radius) + scroll-shadow host
 *     <div class="tf-table-scroll"> ← the actual horizontal scroller
 *       <table>…</table>
 *
 * The outer div doesn't scroll, so scroll-shadow pseudo-elements stay pinned
 * to its edges (see `.tf-table` in `theme/styles/base.css`); the inner div
 * owns `overflow-x`. The table stays `width: 100%`, so narrow tables fill the
 * column and wide ones scroll instead of spilling.
 */
const applied = new WeakSet<MarkdownRenderer>();

export function tableWrapper(md: MarkdownRenderer): void {
  // Overriding renderer rules isn't self-idempotent the way markdown-it's
  // named core rules are, so guard against wrapping twice (e.g. the dev
  // server re-running config on HMR) — that would nest .tf-table divs.
  if (applied.has(md)) return;
  applied.add(md);

  const renderToken: NonNullable<typeof md.renderer.rules.table_open> = (
    tokens,
    idx,
    options,
    _env,
    self,
  ) => self.renderToken(tokens, idx, options);

  const open = md.renderer.rules.table_open ?? renderToken;
  const close = md.renderer.rules.table_close ?? renderToken;

  md.renderer.rules.table_open = (tokens, idx, options, env, self): string =>
    `<div class="tf-table"><div class="tf-table-scroll">${open(tokens, idx, options, env, self)}`;
  md.renderer.rules.table_close = (tokens, idx, options, env, self): string =>
    `${close(tokens, idx, options, env, self)}</div></div>`;
}
