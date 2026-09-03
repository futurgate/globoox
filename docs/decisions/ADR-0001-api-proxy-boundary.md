---
type: adr
status: accepted
owner: engineering
date: 2026-03-20
last_verified: 2026-09-01
implementation:
  - src/lib/api.ts
  - src/app/(app)/api/_proxy.ts
---

# ADR-0001: Keep browser API calls behind local authenticated proxy routes

## Context

Browser requests need the current Supabase access token, consistent error handling, and support for JSON, multipart, streaming, and binary backend responses. Direct backend calls would distribute those concerns across feature code and expose the backend origin to the browser.

## Decision

Browser code calls relative Next.js `/api/*` routes. Shared proxy code reads the server-side Supabase session, attaches its bearer token, and forwards the request to the configured backend.

Server-side code may call the configured backend directly when appropriate.

## Alternatives considered

### Direct browser-to-backend requests

Not selected because auth injection, deployment configuration, CORS behavior, streaming, and diagnostics would become browser concerns and be duplicated across clients.

### Direct database access from product features

Not selected. Backend contracts remain authoritative for books, content, translation, progress, billing, and account-scoped data.

## Consequences

- Browser features use one origin and one authentication boundary.
- `API_URL` can remain server-only.
- Route handlers add code, but most behavior stays centralized in `_proxy.ts`.
- Session-refresh middleware and API proxy responsibilities must remain distinct.

## Reference

[API and sync architecture](../reference/architecture/api-and-sync.md)
