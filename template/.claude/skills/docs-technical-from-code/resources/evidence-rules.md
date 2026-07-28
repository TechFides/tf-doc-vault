# Evidence rules (technical phase)

Concrete rules for citing source evidence and for deciding when to
write content vs. a TODO. Applies to every page this skill generates.

## The rule, in one sentence

If you cannot cite it, you cannot claim it; mark `⚠️ TODO: [what is
missing]` instead.

## Citation forms

| Claim type                                 | Expected citation                         |
| ------------------------------------------ | ----------------------------------------- |
| A file exists in the repo                  | `path/to/file`                            |
| A specific line (function, type, constant) | `path/to/file:42`                         |
| A config value                             | `path/to/config:key`                      |
| A schema field                             | `db/migrations/xyz.sql:column-name`       |
| An env var the code actually reads         | `src/config.ts:42` + `.env.example` entry |
| An endpoint                                | `METHOD /path` + `path/to/route-file:L`   |
| A dependency                               | `package.json` / `go.mod` with version    |

A claim without a concrete citation is not evidence; it is an
assumption. Assumptions become TODOs.

## When to write content

Write the content when **all** of the following are true:

1. The claim is backed by at least one concrete citation above.
2. The citation is in the `source_path` tree you were given (not
   imagined, not copied from a similar project).
3. The fact is stable; it reflects the main branch / tagged source
   version, not a stale branch.

## When to write `⚠️ TODO`

Write `⚠️ TODO: [what is missing]` when:

1. The aspect is expected by the proposed structure but no evidence was
   found (`SLA`, `compliance`, `accessibility` are common cases).
2. A specific value cannot be derived (e.g. "coverage threshold", where the
   test config exists but does not set a threshold).
3. The evidence is ambiguous (two conflicting sources). Include both in
   the TODO text so the user can decide.
4. The codebase shows _that_ something exists but not _how_ (e.g. a
   retry policy is configured via env var with no default; mark
   `⚠️ TODO: retry default: not set in code, environment-specific`).

## Examples

### Good: concrete evidence

> Aplikace používá HTTP retry s exponenciálním backoffem. Maximální
> počet pokusů je 5, počáteční interval 200 ms.
>
> Zdroj: `src/http/retry.ts:12` (konstanty `MAX_RETRIES`, `BASE_DELAY_MS`).

### Bad: invented

> Aplikace používá HTTP retry s exponenciálním backoffem. Maximální
> počet pokusů je typicky 3, počáteční interval cca 100 ms.

("typicky", "cca" = hallucination flag, no citation.)

### Good: explicit TODO

> Aplikace používá HTTP retry s exponenciálním backoffem.
>
> Zdroj: `src/http/retry.ts:8` (komentář "exponential backoff").
>
> > ⚠️ TODO: konkrétní hodnoty (MAX_RETRIES, BASE_DELAY_MS): nejsou
> > v kódu definované, zřejmě přicházejí z env var.

## Cross-check against secondary evidence

When a scanned file references another (e.g. a README claims a feature,
the code implements it differently), cite the **code** as primary and
note the README discrepancy as a TODO of kind `missing-evidence` with
the conflict spelled out.

## Rules (recap)

- **NEVER** invent values, names, thresholds, or behaviors.
- **NEVER** cite a file you have not opened and read.
- **ALWAYS** prefer `path:line` over `path` for specific claims.
- **ALWAYS** include at least one example per non-trivial concept, drawn
  from the code (§7 of `CLAUDE.md`).
- **ALWAYS** keep technical terms in their original language; only
  surrounding prose is Czech.
