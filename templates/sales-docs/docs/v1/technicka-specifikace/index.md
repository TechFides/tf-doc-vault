---
title: Technická specifikace
status: draft
updated_at: 2026-04-27
---

# Technická specifikace

Jak je to postavené: architektura, integrace, deployment.

## Architektura

_(doplnit)_

## Integrace

_(doplnit)_

## Deployment

Dokumentace se nasazuje na Vercel (git integrace: push do `main` nasadí produkci, push do jiné větve vytvoří preview) přes scaffold `@techfides/tf-doc-vault`. GitHub Actions kontroluje typecheck/lint/format/validaci při každém PR. Detaily v `vercel.json` a `.github/workflows/ci.yml`.
