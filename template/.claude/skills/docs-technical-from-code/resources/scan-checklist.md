# Technical scan checklist

Detection targets per aspect for Step 1 of `docs-technical-from-code`.
Each row says _what_ to look for in the codebase and _which proposed
group_ the evidence populates. Nothing here claims the artifact exists;
if nothing matches, the group is **marked for skipping** in the plan
and the user confirms.

This list is **inclusive, not exclusive**; it defines the minimum
scan surface. Always scan beyond it: if the code suggests a group or
page not listed (e.g. a project-specific pipeline, a custom protocol
layer, a vendor SDK, a migration runner), **propose** it to the user
and add it to the generation plan with cited evidence.

## Scan targets

| Aspect                   | Populates group                               | Where to look                                                                                                         |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Language / runtime       | `tech-stack.md`                               | `package.json` (engines, deps), `go.mod`, `pom.xml`, `pyproject.toml`, `Gemfile`, `Cargo.toml`, `tsconfig.json`       |
| Frontend / backend split | `tech-stack.md`                               | workspace roots, `apps/*`, `packages/*`, `frontend/`, `backend/`                                                      |
| DB / storage             | `tech-stack.md`, `architecture/data-model.md` | `prisma/schema.prisma`, `db/migrations/*`, `knexfile.js`, `typeorm.config.ts`, ORM entity files, `docker-compose.yml` |
| Infrastructure / hosting | `infrastructure.md`                           | `Dockerfile*`, `docker-compose*.yml`, `terraform/`, `helm/`, `k8s/`, `serverless.yml`, `vercel.json`, `netlify.toml`  |
| CI/CD                    | `cicd.md`                                     | `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`              |
| Components               | `architecture/components.md`                  | `src/` module boundaries, workspace packages, top-level `index.ts`/`app.ts`                                           |
| C4 context / container   | `architecture/c4.md`                          | Deployment files + high-level README diagrams; if nothing found → skip                                                |
| Domain model             | `architecture/domain-model.md`                | `src/domain/**`, `entities/**`, aggregate roots, DDD folders                                                          |
| Data model               | `architecture/data-model.md`                  | migrations, schema files, ORM models, ERD tools config                                                                |
| Runtime / sequence       | `architecture/runtime.md`                     | request pipeline, middleware stack, event handlers                                                                    |
| State management         | `architecture/state-management.md`            | Redux / Zustand / Pinia store, XState machines, `state/**`                                                            |
| ADRs                     | `adr/NNNN-<slug>.md`                          | `docs/adr/*`, `architecture/decisions/*`, `ADR-*.md` in repo                                                          |
| Authn / authz            | `security/authn-authz.md`                     | `auth/**`, passport/strategies, NextAuth config, `.env.example`, JWT libs                                             |
| Data protection          | `security/data-protection.md`                 | encryption libs, cloud KMS configs, backup cron jobs, retention policies                                              |
| Compliance               | `security/compliance.md`                      | `SECURITY.md`, `compliance/` folder, audit reports                                                                    |
| Integrations overview    | `integrations/overview.md`                    | high-level HTTP/queue wiring, gateway configs, protocol inventory                                                     |
| API authorization (M2M)  | `integrations/api-authorization.md`           | scope definitions, client-credential flows, API gateway config                                                        |
| Event catalog            | `integrations/events.md`                      | message broker config, topic / queue names, event schemas, `events/**`                                                |
| Business error codes     | `integrations/error-codes.md`                 | `errors/**`, enum of business errors, i18n error keys                                                                 |
| Consumed APIs            | `consumed-apis/<api>.md`                      | `src/clients/**`, `src/integrations/**`, HTTP client configs, OpenAPI schemas under `clients/*`                       |
| Exposed public APIs      | `exposed-public-apis/<api>.md`                | `openapi.yaml`, Swagger decorators, public-facing route definitions, BFF/gateway exposed specs                        |
| Exposed internal APIs    | `exposed-internal-apis/<api>.md`              | internal controllers, BFF → BE routes, in-cluster-only specs, service-to-service OpenAPI                              |
| Roles / permissions      | `roles-matrix.md`                             | role constants, `permissions.ts`, Casbin / CASL policies, guard decorators                                            |
| Automated jobs           | `automated-jobs.md`                           | cron configs, BullMQ / Bee schedulers, `*.cron.ts`, serverless scheduled functions                                    |
| Tests overview           | `tests/index.md`                              | test folder layout (`__tests__`, `test/`, `e2e/`)                                                                     |
| Unit tests               | `tests/unit.md`                               | Jest / Vitest / Mocha configs, coverage reports, `*.test.ts`                                                          |
| Integration tests        | `tests/integration.md`                        | `*.integration.test.ts`, test containers, supertest, Playwright API tests                                             |
| Load tests               | `tests/load.md`                               | `k6/`, `jmeter/`, `gatling/`, Artillery scripts                                                                       |
| Mocks                    | `tests/mocks.md`                              | `msw/**`, `__mocks__/`, WireMock stubs, contract tests                                                                |
| Smoke tests              | `tests/smoke.md`                              | `smoke/` folder, post-deploy verification scripts                                                                     |
| SLA                      | `sla.md`                                      | `SLA.md`, contractual docs, alert thresholds                                                                          |
| Monitoring               | `monitoring-logging.md`                       | `prometheus.yml`, Grafana dashboards, Datadog / NewRelic agents, `logger.ts`, OpenTelemetry config                    |
| Scaling                  | `scaling.md`                                  | `k8s/hpa.yaml`, `autoscaling/*`, load balancer config, graceful shutdown hooks                                        |
| Feature toggles          | `feature-toggles.md`                          | LaunchDarkly / Unleash SDK, `features.ts`, `config/feature-flags.*`                                                   |
| Caching                  | `caching.md`                                  | Redis usage, `cache/**`, CDN config, HTTP cache headers                                                               |
| Localization             | `localization.md`                             | `i18n/**`, `locales/**`, `next-i18next` config, ICU files                                                             |
| Disaster recovery        | `disaster-recovery.md`                        | `runbooks/`, `RUNBOOK.md`, backup scripts, RPO / RTO docs                                                             |
| Accessibility            | `accessibility.md`                            | axe-core, `eslint-plugin-jsx-a11y`, WCAG audit reports                                                                |
| Audit                    | `audit.md`                                    | `audit/`, Dependabot / Renovate config, license scan reports, `KNOWN_ISSUES.md`                                       |
| Local setup guide        | `guides/local-setup.md`                       | `README.md` "Getting started", `docker-compose.yml`, `Makefile`, `.env.example`                                       |
| Test setup guide         | `guides/test-setup.md`                        | test env docs, `test.env.example`, seed scripts                                                                       |
| Troubleshooting          | `guides/troubleshooting.md`                   | `TROUBLESHOOTING.md`, FAQ sections, known-error handlers                                                              |
| Onboarding               | `guides/onboarding.md`                        | `ONBOARDING.md`, `docs/onboarding/*`, first-day checklists                                                            |

## How to use this checklist

1. For each row, check whether the indicated paths / files exist.
2. If they do, include the group in the Step 1 plan with the evidence
   cited (use file paths, `path:line` for specific claims).
3. If nothing matches, mark the group as `skip: no evidence` in the
   plan; the user confirms skipping.
4. For project-specific aspects not covered above, propose a new group
   with evidence, a suggested Czech label, and numbering.

## Rules

- **NEVER** assume evidence exists; verify by reading the file path.
- **NEVER** claim a detail you cannot cite.
- **ALWAYS** prefer `path:line` citation over `path` alone for specific
  claims (a function's return type, a config value, a feature flag).
- **ALWAYS** mark `⚠️ TODO: [missing detail]` rather than inventing.
- This checklist is the **floor, not the ceiling**; new groups and
  pages beyond it are expected and should be proposed with evidence.
