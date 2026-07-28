# Evidence rules (functional phase, dual source)

Concrete rules for citing source evidence and for deciding when to
write content vs. a TODO. Applies to every page this skill generates.

## The rule, in one sentence

If you cannot cite it, from **code** (primary) or **already-generated
technical docs** (secondary), you cannot claim it. Mark `⚠️ TODO:
[what is missing]` instead.

## Two sources, clear hierarchy

1. **Code (primary)**: source of truth for what the system actually
   does. **ALWAYS** the final authority on behavior.
2. **`docs/<version>/technical/` (secondary, if present)**: a
   pre-digested view of the same code. Use it as a **fast lookup** for
   already-documented facts (API shapes, roles, feature toggles, event
   names, metric names, error codes). **ALWAYS** cross-check against
   the code when the claim is behavior-critical.

If the technical section has not been generated yet, only the code is
used; references to technical pages become TODOs of kind
`link to technical/<expected-path>`.

## Citation forms

| Claim type                                 | Expected citation                                                |
| ------------------------------------------ | ---------------------------------------------------------------- |
| A file exists in the repo                  | `path/to/file`                                                   |
| A specific line (function, type, constant) | `path/to/file:42`                                                |
| A role / permission                        | `src/auth/roles.ts:NAME` + `technical/roles-matrix.md`           |
| A validation rule                          | `src/*.schema.ts:field` or validator file+line                   |
| A user-visible error                       | `src/errors/*.ts:CODE` + `technical/integrations/error-codes.md` |
| A scenario entry point                     | controller / resolver / handler `path:line`                      |
| A business rule                            | policy / guard `path:line`                                       |
| A notification                             | sender call + template path                                      |
| A feature toggle                           | SDK call `path:line` + `technical/feature-toggles.md`            |
| A metric                                   | metric emission `path:line` + `technical/monitoring-logging.md`  |

A claim without a concrete citation is not evidence; it is an
assumption. Assumptions become TODOs.

## When to write content

Write the content when **all** of the following are true:

1. The claim is backed by at least one concrete citation from code
   (primary).
2. If the technical section is used as a shortcut, the code has been
   opened at least once to confirm the behavior matches.
3. The citation is in the `source_path` / `docs/<version>/technical/`
   tree you were given (not imagined, not copied from a similar
   project).
4. The fact is stable; it reflects the main branch / tagged source
   version, not a stale branch.

## When to write `⚠️ TODO`

Write `⚠️ TODO: [what is missing]` when:

1. The aspect is expected by the proposed structure but no evidence was
   found in either source (`personas.md`, `reports.md` are common
   cases).
2. A specific value cannot be derived (e.g. the input validation says
   "string, required" but the business meaning (minimum length, format)
   is not expressed in code).
3. The code disagrees with the technical section; cite both and ask
   the user to reconcile. Use TODO kind
   `diagram-text-contradiction` (if a diagram in technical is the
   conflicting side) or plain `missing-evidence`.
4. A cross-link points to a technical page that does not exist yet;
   insert `⚠️ TODO: link to technical/<expected-path>` and keep the
   surrounding prose.
5. The scenario includes a wireframe placeholder but no screenshot /
   UI evidence is available; mark `⚠️ TODO: wireframe-gap`.

## Examples

### Good: concrete dual-source evidence

> Po úspěšném přihlášení systém vydá access token s platností 15 minut
> a refresh token s platností 30 dnů.
>
> Zdroj: `src/auth/token.service.ts:42` (konstanty `ACCESS_TTL_MIN`,
> `REFRESH_TTL_DAYS`); cross-check: `technical/security/authn-authz.md`
> (sekce "Token TTL").

### Good: code-only (technical not yet generated)

> Scénář vyžaduje roli `admin` nebo `billing-manager`.
>
> Zdroj: `src/billing/invoice.controller.ts:18`
> (`@Roles('admin', 'billing-manager')`).
>
> > ⚠️ TODO: link to technical/roles-matrix.md (technická sekce ještě
> > nebyla vygenerována, doplnit odkaz po jejím dokončení).

### Bad: invented

> Po přihlášení dostane uživatel standardní session s typickou
> platností několik hodin.

("standardní", "typicky" = hallucination flag, no citation.)

### Good: TODO for a known gap

> Notifikace o zaplacené faktuře je odeslána e-mailem na fakturační
> adresu.
>
> Zdroj: `src/billing/notification.service.ts:65`.
>
> > ⚠️ TODO: šablona e-mailu: v kódu se odkazuje na
> > `templates/invoice-paid.mjml`, ale soubor není v repozitáři (nebo
> > je generován při buildu). Ověřit s produktem.

## Cross-checks and conflicts

- **Code vs. technical**: if the technical section describes behavior
  differently from the code, the code wins. Write the code-backed
  claim, and raise the discrepancy as `⚠️ TODO: text vs. technical:
<technical path>:<location> říká X, kód říká Y`.
- **Code vs. UI screenshot** (when screenshots are provided as
  reference for scenario wireframes): the code wins for behavior;
  the screenshot wins for visual layout. If they contradict on
  behavior (screenshot shows a field the code does not handle),
  raise `⚠️ TODO: wireframe-text-contradiction: screenshot ukazuje
pole X, kód ho nezpracovává`.

## Rules (recap)

- **NEVER** invent behavior, fields, validations, errors, or roles.
- **NEVER** cite a file you have not opened.
- **NEVER** copy a behavioral claim from the technical section without
  cross-checking the code.
- **ALWAYS** prefer `path:line` over `path` for specific claims.
- **ALWAYS** include at least one concrete example per non-trivial
  concept, drawn from the code (§7 of `CLAUDE.md`).
- **ALWAYS** keep technical terms in their original language; only
  surrounding prose is Czech.
