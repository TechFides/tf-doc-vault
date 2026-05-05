# API documentation guide

Reference patterns for documenting **REST APIs** inside the technical
section. Applies whenever a page is produced in one of the three API
groups:

- `technical/consumed-apis/<api>.md` — third-party / upstream APIs the
  system calls.
- `technical/exposed-public-apis/<api>.md` — APIs the system exposes to
  external consumers.
- `technical/exposed-internal-apis/<api>.md` — APIs the system exposes to
  other internal services / teams.

## When to invoke this resource

Load this file **every time** a new or existing API page is being
generated or updated. That covers:

- Step 1 planning — when the scan lists an API row in the plan, this
  resource governs the expected page shape.
- Step 2 generation — structural templates for endpoints, errors, auth,
  rate limits, versioning, examples, webhooks.
- Step 3 index check — only the API group index; the guide does not
  apply to non-API technical pages.

One file per API. **NEVER** bundle multiple APIs into a single page —
one consumer / one exposed API = one `.md` file.

## Project-specific rules (inherit from CLAUDE.md)

These override anything in the generic patterns below when they
conflict:

- **Evidence-first** (§1 CLAUDE.md). Every endpoint, field, code,
  status, and rate-limit value must be traceable to code / OpenAPI
  spec / config. Values that cannot be cited get `⚠️ TODO: …` — never
  invented.
- **Czech body text, original technical identifiers** (§7). Method
  names, HTTP verbs, status codes, field names, header names, error
  codes stay in English; prose around them is Czech.
- **Frontmatter + Confluence marks are mandatory** (§5, §6).
- **Realistic example values** from the real integration (with PII
  substituted). No `"string"` / `"example"` placeholders.
- **Title numbering**: API pages inherit the group prefix from
  `proposed-structure.md` (e.g. `2.8.1 <API name>`).

## Page structure (per API)

Every API page (regardless of consumed / exposed-public /
exposed-internal) follows this outline. Empty sections are omitted —
but every relevant section is present.

1. **Info blok** — base URL(s), version, environment, owner team,
   Confluence / SLA / support contact.
2. **Authentication** — how to obtain credentials, how to pass them,
   token lifetime / rotation.
3. **Rate limiting & quotas** — limits per plan / consumer, relevant
   response headers, back-off strategy.
4. **Endpoints** — one sub-section per endpoint, in CRUD order (List,
   Get, Create, Update, Delete).
5. **Error responses** — common error envelope + catalog of codes.
6. **Webhooks / callbacks** — if the API supports them.
7. **Versioning** — current version, deprecation policy, migration
   links.
8. **Code examples** — cURL + one or two languages actually used in the
   codebase (JS/TS, Python, Go, …).
9. **Related documents** — links to scenarios that consume this API,
   `integrations/api-authorization.md`, `error-codes.md`, etc.

## Per-endpoint documentation pattern

Use this shape for every endpoint sub-section:

````markdown
## <Endpoint name>

<Krátký popis (1–2 věty) k čemu endpoint slouží a kdy se používá.>

### Request

```http
METHOD /path/{param}
```

#### Path parameters

| Name  | Type   | Description             |
| ----- | ------ | ----------------------- |
| param | string | <Co parameter označuje> |

#### Query parameters

| Name  | Type    | Required | Default | Description              |
| ----- | ------- | -------- | ------- | ------------------------ |
| page  | integer | No       | 1       | Číslo stránky (1-based)  |
| limit | integer | No       | 20      | Počet položek (max. 100) |

#### Request body

```json
{
  "field": "value"
}
```

| Field | Type   | Required | Description                |
| ----- | ------ | -------- | -------------------------- |
| field | string | Yes      | <Sémantika pole v byznysu> |

### Response

#### Success (200)

```json
{
  "data": {}
}
```

#### Errors

| Status | Code          | Description               |
| ------ | ------------- | ------------------------- |
| 400    | INVALID_INPUT | Validace requestu selhala |
| 404    | NOT_FOUND     | Zdroj neexistuje          |
````

### Field rules

- **Types** use the wire format (`string`, `integer`, `boolean`,
  `object`, `array<T>`, ISO formats `date-time`, `email`, `uuid`).
  Not language-level types (no `number`, no `int32` unless the spec
  enforces it).
- **Required** column: `Yes` / `No`. Conditional required (`required
if X`) belongs in the `Description` column.
- **Default** column: the value the server assumes when the field is
  omitted. `—` when no default applies.

## OpenAPI integration

When the project ships an OpenAPI (Swagger) spec, the API page links
to it rather than duplicating every schema inline. Minimum linking
pattern:

```markdown
Specifikace: [`openapi/<name>.yaml`](../../../openapi/<name>.yaml)
(generuje HTML přes `npx @redocly/cli build-docs`).
```

### Reference OpenAPI skeleton

When no spec exists yet and writing one is in scope, use this
skeleton:

```yaml
openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
  description: |
    API description with markdown support.

    ## Authentication
    All endpoints require Bearer token authentication.

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

paths:
  /users:
    get:
      summary: List users
      description: Returns a paginated list of users.
      tags:
        - Users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserList"
              example:
                data:
                  - id: "usr_123"
                    email: "jane@example.com"
                meta:
                  total: 100
                  page: 1

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          description: Unique user identifier
          example: "usr_123"
        email:
          type: string
          format: email
          example: "jane@example.com"
        name:
          type: string
          example: "Jane Doe"
        createdAt:
          type: string
          format: date-time

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

### Tooling

```bash
# Redocly — statické HTML
npx @redocly/cli build-docs openapi.yaml -o docs/api.html

# Swagger UI — interaktivní
docker run -p 80:8080 \
  -e SWAGGER_JSON=/spec/openapi.yaml \
  -v ./openapi.yaml:/spec/openapi.yaml \
  swaggerapi/swagger-ui

# TypeScript typy
npx openapi-typescript openapi.yaml -o types/api.d.ts

# Validace
npx @redocly/cli lint openapi.yaml
```

## Request / response examples

### Example quality

**Use realistic values** (with PII substituted):

```json
// ✅ Good — realistic
{
  "email": "jana.novakova@example.com",
  "name": "Jana Nováková",
  "role": "admin"
}
```

```json
// ❌ Bad — placeholder
{
  "email": "string",
  "name": "string",
  "role": "string"
}
```

**Show common variations** when the endpoint accepts optional fields:

```markdown
### Request examples

**Minimal (povinná pole)**:

\`\`\`json
{ "email": "user@example.com" }
\`\`\`

**Úplný (všechna pole)**:

\`\`\`json
{
"email": "user@example.com",
"name": "Jana Nováková",
"role": "admin",
"notifications": { "email": true, "push": false }
}
\`\`\`
```

## Error documentation

### Error envelope

Document the project's canonical error shape once per API page:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [{ "field": "email", "message": "Invalid email format" }],
    "requestId": "req_abc123"
  }
}
```

### Error code catalog

| Code           | HTTP | Description               | Resolution                    |
| -------------- | ---- | ------------------------- | ----------------------------- |
| INVALID_INPUT  | 400  | Validace requestu selhala | Zkontrolovat tělo requestu    |
| UNAUTHORIZED   | 401  | Chybí nebo neplatný token | Obnovit přihlášení            |
| FORBIDDEN      | 403  | Nedostatečná oprávnění    | Požádat o přístup             |
| NOT_FOUND      | 404  | Zdroj neexistuje          | Zkontrolovat ID               |
| RATE_LIMITED   | 429  | Překročen rate limit      | Počkat dle `Retry-After`      |
| INTERNAL_ERROR | 500  | Chyba na straně serveru   | Eskalovat na vlastníka služby |

Link the cross-API canonical catalog in
`technical/integrations/error-codes.md`; per-API pages list only codes
actually returned by **that** API.

## Authentication documentation

Pattern (adapt to the project's auth scheme):

```markdown
## Authentication

Všechny requesty vyžadují autentizaci přes Bearer token.

### Získání tokenu

\`\`\`http
POST /auth/token
Content-Type: application/json

{
"client_id": "your_client_id",
"client_secret": "your_client_secret"
}
\`\`\`

Response:

\`\`\`json
{
"access_token": "eyJhbG...",
"token_type": "bearer",
"expires_in": 3600
}
\`\`\`

### Použití tokenu

\`\`\`http
GET /api/v1/users
Authorization: Bearer eyJhbG...
\`\`\`

### Expirace

Token platí 1 hodinu. Po odpovědi 401 `TOKEN_EXPIRED` vyžádat nový
přes `POST /auth/token`.
```

For OIDC / OAuth2 / mTLS / API key, keep the same shape (how to obtain,
how to pass, how to rotate / expire).

## Rate limiting documentation

```markdown
## Rate limits

| Plán       | Req / min | Req / day  |
| ---------- | --------- | ---------- |
| Free       | 60        | 1 000      |
| Pro        | 600       | 50 000     |
| Enterprise | 6 000     | bez limitu |

### Rate-limit hlavičky

| Header                  | Popis                           |
| ----------------------- | ------------------------------- |
| `X-RateLimit-Limit`     | Limit pro aktuální okno         |
| `X-RateLimit-Remaining` | Zbývající počet requestů v okně |
| `X-RateLimit-Reset`     | Unix timestamp resetu okna      |

### Handling

\`\`\`http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Reset: 1705320000

{
"error": {
"code": "RATE_LIMITED",
"message": "Rate limit exceeded. Try again in 30 seconds."
}
}
\`\`\`

**Best practices**:

- exponential back-off,
- cache idempotentních GETů,
- batchování kde to API dovolí.
```

## Versioning documentation

```markdown
## Versioning

Verze je součástí URL:

\`\`\`
https://api.example.com/v1/users
https://api.example.com/v2/users
\`\`\`

### Lifecycle

| Verze | Status     | Podpora do |
| ----- | ---------- | ---------- |
| v2    | Current    | —          |
| v1    | Deprecated | 2025-01-01 |

### Migrace

[v1 → v2 Migration](./migration-v1-v2.md) — breaking changes a
postup přechodu.

### Deprecation policy

- Deprecated verze podporovaná minimálně 12 měsíců.
- Deprecation warning v `Sunset` / `Deprecation` hlavičkách.
- E-mail notifikace 90 dní před EOL.
```

## Code examples

Include cURL always, plus **one language that actually appears in the
repo** (TypeScript if FE/Node, Python if services, Go if services,
etc.). Do NOT copy-paste three languages "for completeness" if the code
base uses only one — it bloats the doc and rots faster.

### cURL

```bash
curl -X POST https://api.example.com/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "Jana"}'
```

### TypeScript / JavaScript

```javascript
const response = await fetch("https://api.example.com/v1/users", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
    name: "Jana",
  }),
});

const data = await response.json();
```

### Python

```python
import requests

response = requests.post(
    "https://api.example.com/v1/users",
    headers={"Authorization": f"Bearer {token}"},
    json={"email": "user@example.com", "name": "Jana"},
)

data = response.json()
```

## Webhooks documentation

```markdown
## Webhooks

### Registrace

\`\`\`http
POST /webhooks
{
"url": "https://your-app.com/webhook",
"events": ["user.created", "user.deleted"]
}
\`\`\`

### Payload

\`\`\`json
{
"id": "evt_123",
"type": "user.created",
"timestamp": "2024-01-15T10:30:00Z",
"data": {
"user": { "id": "usr_456", "email": "jana@example.com" }
}
}
\`\`\`

### Ověření podpisu

Každý webhook nese hlavičku `X-Webhook-Signature: sha256=...`. Ověření
HMAC-SHA256:

\`\`\`javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
const expected = crypto
.createHmac("sha256", secret)
.update(payload)
.digest("hex");
return `sha256=${expected}` === signature;
}
\`\`\`
```

## Consumed vs. exposed — what differs

The page outline is the same, but emphasis shifts:

| Section        | `consumed-apis/`                           | `exposed-public-apis/` / `exposed-internal-apis/` |
| -------------- | ------------------------------------------ | ------------------------------------------------- |
| Info block     | Upstream owner, contact, contract link     | Our team as owner, consumer contacts              |
| Authentication | How **we** authenticate to the upstream    | How consumers authenticate to **us**              |
| Rate limits    | Upstream's limits that constrain us        | Our limits imposed on consumers                   |
| Endpoints      | Only endpoints **we actually call**        | Every endpoint we expose                          |
| Errors         | Upstream error codes we propagate / handle | Our error envelope + codes                        |
| Code examples  | Our client code (`src/clients/<api>.ts`)   | Consumer-perspective examples (cURL + 1 lang)     |
| Versioning     | Upstream's version we're pinned to         | Our version lifecycle + deprecation policy        |
| Related docs   | Scenarios consuming this API               | Scenarios backed by this API                      |

For `consumed-apis/` the evidence primarily lives in the client module
(`src/clients/<api>.ts` / similar) + any vendor spec / Confluence. For
`exposed-*` it lives in the route / controller files + own OpenAPI
spec.

## Quality checklist (before saving the page)

- [ ] Every endpoint has request, response, and errors.
- [ ] Field tables have `Type`, `Required`, `Default` (queries only),
      `Description`.
- [ ] At least one request/response pair uses realistic values (not
      `"string"` placeholders), PII substituted.
- [ ] Error-code table lists **only** codes this API actually returns.
- [ ] Auth section explains obtain / use / rotate.
- [ ] Rate-limit section lists real limits or is absent (don't invent
      limits).
- [ ] Versioning section exists when the API is versioned; omit when
      not.
- [ ] Code example(s) match languages used in the repo; cURL always.
- [ ] Page title carries the hierarchical prefix from
      `proposed-structure.md` (e.g. `2.8.3 Billing API`).
- [ ] Frontmatter + Confluence mark present.
- [ ] Every anchor for a future diagram is inserted as
      `<!-- diagram-anchor: <name> -->` (not a Mermaid block — this
      phase is text-only).

## Rules

- **NEVER** invent endpoints, fields, codes, headers, or limits. Cite
  or TODO.
- **NEVER** bundle multiple APIs into one page.
- **NEVER** inline the whole OpenAPI spec — link to it.
- **ALWAYS** use realistic values, with PII substituted.
- **ALWAYS** differentiate consumed vs. exposed sections per the table
  above.
- **ALWAYS** keep this guide in sync with
  `integrations/error-codes.md` and
  `integrations/api-authorization.md` — those are the cross-API
  canonical sources.
