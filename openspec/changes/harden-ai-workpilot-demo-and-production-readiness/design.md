# Design: Harden AI WorkPilot Demo and Production Readiness

## Context

The current system correctly regenerates plans on the server, gates risky plans
through a state machine, scopes database queries by `id` and `owner`, and uses a
compare-and-swap update to reject concurrent transitions. Its `owner` is,
however, a UUID generated in browser localStorage and sent in a request header.
That is adequate only for disposable, anonymous demo history.

## Decision record

| Decision | Selected approach | Reason |
|---|---|---|
| Public demo identity | Explicit anonymous-demo mode, server-issued expiring token | Avoid presenting a browser UUID as authentication. |
| Real-action identity | Signed HttpOnly session tied to a verified user | Prevent client-controlled ownership and support revocation. |
| Request protection | Body-byte cap before JSON parse plus owner/IP rate limit | Stop avoidable Worker/D1 cost and malformed payload abuse. |
| Persistence | Migrations only; normalized append-only event table | Remove per-request DDL and preserve event provenance. |
| Audit event contract | `event_id`, `run_id`, `sequence`, `actor`, `action`, `payload`, `created_at` | Supports order, idempotency, diagnosis, and later adapters. |
| Production execution | Queue/lease and adapter result callback with idempotency key | A client must never mark a real external action completed. |

## Security and data model

1. `POST /api/session` issues an opaque random demo token with expiry and a
   server-side hash. It is limited to the demo history scope. The raw token is
   stored only in an HttpOnly, Secure, SameSite=Lax cookie; it is never a
   user identity.
2. Authenticated mode obtains the subject only from the hosting identity/session
   integration. `runs.owner_subject` is immutable and is never read from a
   browser header or JSON body.
3. Every write requires a request id/idempotency key. Replays return the prior
   result; conflicting reuse returns 409.
4. The API rejects a missing/oversized `Content-Length` (where supplied) and
   streams/limits undecoded bodies to a documented byte maximum before calling
   `request.json()`.
5. A rate limiter keys on authenticated subject or demo-token hash, with IP as a
   secondary abuse signal. It returns 429 and `Retry-After`; no action reaches
   D1 after the quota is exhausted.
6. Default retention is short and documented for demo runs. A scheduled purge
   deletes expired demo sessions and dependent runs/events. Authenticated data
   requires a separately approved retention schedule and deletion endpoint.

## State and execution invariants

- The server derives plan, risk, and plan hash; it ignores client plan fields.
- Approval records `plan_hash`, approver subject, time, and expiry. A changed
  plan invalidates previous approval.
- One expected state and one version may transition in a transaction. A losing
  concurrent request gets 409 without running an adapter.
- `running` may be entered only by a server worker after a valid approval.
- Only a signed adapter callback/lease holder can append completion/failure.
- All event inserts are append-only and sequence numbers are strictly monotonic
  per run.

## Rollout

1. Keep public site in `demo-only` mode; add clear scope and retention notice.
2. Apply migrations and add runtime health/version endpoint.
3. Enable body caps/rate limits and test 429 behavior in preview.
4. Add expiring demo sessions without changing real adapter capability.
5. Before enabling any adapter, require authenticated mode, retention/deletion,
   audit event model, secret management, and the complete production test gate.

## Rollback

Feature-flag authentication mode and new API version. If migration deployment
fails, serve read-only demo UI with a visible maintenance message; do not fall
back to client-owned sessions for real actions.
