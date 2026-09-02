---
name: comment-audit
description: >-
  Strict cleanup of comments and prose added or changed in this branch,
  enforcing the Comments and Prose rules in AGENTS.md. Invoked by the Stop
  hook at the end of a turn whenever changed files are detected, and runnable
  manually at any time via /comment-audit. Use it to remove noise comments,
  restated-code comments, changelog-style comments, and AI-writing tells
  (filler, marketing adjectives, forced triples, the "not just X, but Y"
  construction, em dashes) from the files touched in this branch.
---

# Comment and prose audit

A mandatory procedure, not a suggestion. Every step below runs in order; none
are optional and none are judgment calls beyond what the two tests in step 3
already specify.

## Step 1: collect the changed files

```bash
git diff --name-only HEAD
git ls-files --others --exclude-standard
```

Combine both lists into one set of candidate files. Keep only files whose
extension is one of `ts`, `vue`, `css`, `yml`, `yaml`, `sh`, `md`. Drop any
path under `dist/` or `node_modules/`, regardless of extension.

Run both commands again with `git -C <worktree>` for every worktree the Stop
hook named, and add what they report to the same set. Paths from a worktree stay
relative to that worktree, so keep them apart from the ones collected here.

If the filtered set is empty, stop here and report the empty result (see
Step 5); there is nothing to audit.

## Step 2: get the actual diff for each file

For each remaining file, look at what changed rather than the whole file:

```bash
git diff HEAD -- <file>
```

For a file reported only by `git ls-files --others` (untracked, no HEAD
diff), read the whole file instead; every comment line in it counts as
"added" for this audit.

## Step 3: apply both tests to every added comment line

For every comment line that is new or modified in the diff (not comments that
were already there and untouched), apply both tests from AGENTS.md, verbatim:

- Would a competent reader already know this from the code? If yes, delete it.
- If I delete this comment, could someone plausibly break the code? If no,
  delete it.

The default decision is delete. A comment stays only if it passes both tests.
When in doubt, delete.

This applies to every language in the repo: TypeScript, Vue, CSS, YAML, shell,
and Markdown alike.

## Step 4: Markdown gets an additional prose pass

For added or modified prose in `.md` files, also remove or rewrite:

- Filler that pads a sentence without adding information.
- Restatement of what the surrounding text or a code block already shows.
- Marketing adjectives (for example "robust", "seamless", "comprehensive
  solution").
- The "not just X, but Y" construction.
- Forced three-item lists that exist only to hit a count of three.
- Any em dash used as a sentence connector. Replace it with a colon,
  parentheses, a semicolon, a comma, or split the sentence in two. A hyphen in
  compounds and an en dash in a numeric range are fine, as is a lone em dash
  used as an empty-value marker in a table cell.

JSDoc on the published API (`makeConfig` options, `createTheme`, the sidebar
generators) stays; keep it, just keep it short. Do not delete it for failing
the two tests above, those tests are for inline comments, not published API
documentation.

## Step 5: scope discipline

Touch nothing outside the file set collected in Step 1, and inside those
files touch nothing except comments and, in Markdown, prose. No drive-by
refactors, no renames, no logic changes, no formatting passes over code that
isn't a comment. If a comment needs to be deleted, delete only the comment
line(s); do not restructure the surrounding code to compensate.

## Step 6: report

Report the result to the conversation in exactly this shape:

```
Removed:
- <file>:<line> - <what was removed and why it failed the test(s)>

Kept:
- <file>:<line> - <one-line reason it passed both tests>
```

If no comment or prose line in the collected files needed a decision, the
audit is still a valid, complete result. Report it as:

```
nothing added, nothing to remove
```

Do not pad an empty audit with an explanation beyond that line.
