# Tasks

## 0. Guardrails and scope

- [ ] Add a single `DEMO_ONLY` capability flag; assert that no adapter can run when it is enabled.
- [ ] Publish a concise in-product retention and privacy notice, including how demo history is isolated and removed.
- [ ] Update README terminology: call the current event storage an event timeline, not append-only audit evidence.
- [ ] Align README state diagram with implementation, or implement the documented `draft` state.

## 1. Immediate public-demo quality

- [ ] Serve `public/favicon.ico` or update metadata to the existing SVG asset; add an HTTP smoke assertion for 200.
- [ ] Add an accessible loading/error state for history initialization and a retry action.
- [ ] Add keyboard, 360px, and reduced-motion E2E checks for the plan/approve/execute/retry flow.

## 2. API abuse resistance

- [ ] Implement byte-limited request body parsing before JSON decoding.
- [ ] Define and implement `POST`/`PATCH` quotas per session and IP; return 429 plus `Retry-After`.
- [ ] Add a bounded history cursor instead of a fixed implicit 20-row policy; validate cursor and limit.
- [ ] Move `CREATE TABLE/INDEX` out of request handling and deploy only generated migrations.

## 3. Identity and privacy

- [ ] Implement server-issued, hashed, expiring demo-session tokens in Secure HttpOnly cookies.
- [ ] Wire verified hosting identity to authenticated mode; remove `x-workpilot-session` as an ownership authority.
- [ ] Implement session revoke/logout and data deletion/purge paths.
- [ ] Add redaction/minimization rules and tests for common credentials, identity numbers, emails, and phone numbers.

## 4. Durable audit and real-adapter readiness

- [ ] Add migrations for `runs`, `run_events`, `sessions`, and `idempotency_keys` with indexes and constraints.
- [ ] Write event rows append-only with event ID, sequence, actor, request ID, plan hash, and adapter provenance.
- [ ] Enforce approval expiry and plan-hash matching.
- [ ] Introduce worker lease, idempotency key, timeout, and callback verification before any real adapter is enabled.
- [ ] Store adapter secrets only in managed secrets; define allowed tool scopes and outbound allowlists.

## 5. Verification gate

- [ ] API integration: 400 malformed/oversized body, 401 unauthenticated, 403 cross-owner, 404 absent, 409 race/replay, 429 quota, and retention deletion.
- [ ] D1 integration: migration-from-empty, index/schema verification, malformed persisted JSON containment, and rollback rehearsal.
- [ ] Browser E2E: successful demo, rejected plan, deliberate failure/retry, refresh/history restoration, and two-session isolation.
- [ ] Accessibility: automated axe scan plus manual keyboard and screen-reader label review at 360px and desktop.
- [ ] CI: Node 22.13+, lint, tests, production build, dependency audit, preview smoke, and production post-deploy smoke.
