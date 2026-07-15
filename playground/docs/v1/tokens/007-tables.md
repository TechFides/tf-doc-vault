---
title: Tables
status: published
updated_at: 2026-07-15
---

Layout playground for data-heavy Markdown tables. Tables are plain
Markdown rendered into `.vp-doc` — all styling lives in
`src/theme/styles/base.css`. This page exists to stress the table layout
(long tables, wide tables, mixed content) against realistic spec-style
data.

## Long table — requirements

Vertical rhythm, zebra striping and row density under many rows.

| ID     | Requirement                                     | Priority | Status      | Owner        | Verified |
| ------ | ----------------------------------------------- | -------- | ----------- | ------------ | -------- |
| FR-001 | User can sign in with email and password        | Must     | Done        | Auth team    | Yes      |
| FR-002 | User can sign in via company SSO (OIDC)         | Must     | Done        | Auth team    | Yes      |
| FR-003 | Session expires after 30 minutes of inactivity  | Must     | In progress | Auth team    | No       |
| FR-004 | User can reset a forgotten password             | Must     | Done        | Auth team    | Yes      |
| FR-005 | Failed logins are rate-limited per IP           | Should   | Done        | Platform     | Yes      |
| FR-006 | Admin can deactivate a user account             | Must     | Done        | Platform     | Yes      |
| FR-007 | Audit log records every permission change       | Must     | In progress | Platform     | No       |
| FR-008 | User can enable TOTP two-factor authentication  | Should   | Blocked     | Auth team    | No       |
| FR-009 | Documents are searchable full-text              | Should   | Done        | Search team  | Yes      |
| FR-010 | Search results respect per-document ACLs        | Must     | In progress | Search team  | No       |
| FR-011 | User can export a document to PDF               | Could    | Done        | Docs team    | Yes      |
| FR-012 | User can subscribe to document change alerts    | Could    | Not started | Docs team    | No       |
| FR-013 | Uploaded files are virus-scanned before storage | Must     | Done        | Platform     | Yes      |
| FR-014 | System retains deleted documents for 30 days    | Should   | Done        | Platform     | Yes      |
| FR-015 | User can restore a document from trash          | Should   | In progress | Docs team    | No       |
| FR-016 | API is versioned under `/api/v1`                | Must     | Done        | Platform     | Yes      |
| FR-017 | All API responses include a request-id header   | Should   | Done        | Platform     | Yes      |
| FR-018 | Rate limits are returned in `X-RateLimit-*`     | Could    | Not started | Platform     | No       |
| FR-019 | Webhooks retry with exponential backoff         | Should   | Done        | Integrations | Yes      |
| FR-020 | Webhook payloads are HMAC-signed                | Must     | Done        | Integrations | Yes      |

## Wide table — service inventory

Many columns to test horizontal overflow, `overflow-wrap`, and whether
the table stays inside the content column or scrolls.

| Service      | Owner        | Language   | Runtime | Repository         | CI         | Deploy target | SLA    | On-call      | Last deploy |
| ------------ | ------------ | ---------- | ------- | ------------------ | ---------- | ------------- | ------ | ------------ | ----------- |
| srvc-bat     | Platform     | TypeScript | Node 24 | github/srvc-bat    | GH Actions | GKE eu-west1  | 99.9%  | Platform     | 2026-07-14  |
| srvc-auth    | Auth team    | TypeScript | Node 24 | github/srvc-auth   | GH Actions | GKE eu-west1  | 99.95% | Auth team    | 2026-07-12  |
| srvc-docs    | Docs team    | TypeScript | Node 24 | github/srvc-docs   | GH Actions | GKE eu-west1  | 99.9%  | Docs team    | 2026-07-13  |
| srvc-search  | Search team  | Go         | Go 1.23 | github/srvc-search | GH Actions | GKE eu-west1  | 99.5%  | Search team  | 2026-07-10  |
| srvc-media   | Platform     | Rust       | native  | github/srvc-media  | GH Actions | GKE eu-west1  | 99.5%  | Platform     | 2026-07-11  |
| srvc-notify  | Integrations | TypeScript | Node 24 | github/srvc-notify | GH Actions | GKE eu-west1  | 99.0%  | Integrations | 2026-07-09  |
| srvc-billing | Finance      | Java       | JDK 21  | github/srvc-bill   | Jenkins    | GKE eu-west3  | 99.95% | Finance      | 2026-07-08  |
| srvc-report  | Analytics    | Python     | 3.12    | github/srvc-report | GH Actions | GKE eu-west3  | 99.0%  | Analytics    | 2026-07-07  |

## Narrow table — version history

A compact table with prose-length cells and a mix of short and long
values.

| Version | Date       | Author     | Summary                                                      |
| ------- | ---------- | ---------- | ------------------------------------------------------------ |
| 0.3.0   | 2026-07-15 | V. Mičulka | Reworked table layout; added draft tables playground page.   |
| 0.2.9   | 2026-07-01 | V. Mičulka | Hero subtitle rendering fix; dropped flaky dind cache layer. |
| 0.2.0   | 2026-05-22 | V. Mičulka | Introduced design-token pages and status badges.             |
| 0.1.0   | 2026-04-10 | V. Mičulka | Initial public theme, config factory and sidebar generator.  |
