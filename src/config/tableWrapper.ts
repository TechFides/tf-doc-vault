import type { MarkdownRenderer } from "vitepress";

const applied = new WeakSet<MarkdownRenderer>();

/**
 * Wrap every rendered `<table>` in `.tf-table > .tf-table-scroll`. The outer div
 * carries the frame and the pinned scroll-shadow pseudo-elements (see
 * `theme/styles/base.css`); the inner one owns `overflow-x`, so a wide table
 * scrolls instead of spilling out of the content column.
 */
export function tableWrapper(md: MarkdownRenderer): void {
  // Overriding renderer rules is not self-idempotent the way markdown-it's named
  // core rules are, so guard against wrapping twice (the dev server re-runs the
  // config on HMR), which would nest .tf-table divs.
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
