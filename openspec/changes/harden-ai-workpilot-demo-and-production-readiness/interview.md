# Expert Cross-Examination Ledger

## Scope and evidence

Evidence reviewed: application source, D1 migration, local unit tests, lint,
production build, README, public deployment metadata, and seven-day worker logs.
Automated result: `pnpm test` 5/5, `pnpm lint` pass, `pnpm build` pass. Public
site is active and public. The log sample contains repeated `GET /favicon.ico`
404 responses.

## Dialogue

**Expert A — Security Architect:** Does a public demo need production
authentication if it only simulates tools?

**Expert B — Product/QA Lead:** Not for a disposable demo, provided it says so.
But the current browser UUID is treated as the run owner. The product must not
let that mechanism silently become real-user authentication.

**A:** What proves the safety core is real rather than a UI-only claim?

**B:** The server regenerates the plan, ignores client plan fields, gates state
with `nextState`, filters reads and writes by owner, and applies compare-and-swap
on the stored state. Those are credible demo controls; they must be exercised by
HTTP/D1 tests rather than only source-text assertions.

**A:** What is the highest-risk gap before real adapters?

**B:** Identity. A localStorage UUID can be copied or stolen and has neither
expiry nor revocation. Next are quotas/body limits, data retention, and a durable
event model. No real adapter may be enabled until all four are complete.

**A:** Is the current event timeline an audit trail?

**B:** It is useful observability, but not audit-grade evidence: the full JSON
array is overwritten at every transition, without actor, event id, event
sequence, plan hash, or idempotency key. Rename it honestly now; normalize it
before production use.

**A:** What quality issue affects the live portfolio today?

**B:** `/favicon.ico` returns 404 in production logs. It does not break the
workflow but creates needless operational noise and makes the experience feel
unfinished. Add the asset and post-deploy smoke coverage.

**A:** Do tests prove the workflow end to end?

**B:** No. Five unit/source-contract tests pass, lint and build pass, but there
is no runtime D1/API race test, no two-session isolation test, and no browser
test for approval, rejection, failure/retry, keyboard, or small screen behavior.

**A:** What should be fixed first?

**B:** First protect the public demo boundary and test actual endpoints. Then
introduce identity, abuse controls, migrations, retention, and append-only
events. Treat real integrations as a separate, gated release.

## Ambiguity ledger

| Topic | Assumption adopted | Confidence | Validation before implementation |
|---|---|---:|---|
| Public access | The demo stays public for portfolio review | High | Confirm if access policy changes are requested. |
| Real adapters | None will be activated in this change | High | Require explicit user authorization and provider scope. |
| Retention | Demo data should be short-lived | Medium | Select legal/product retention period before migration. |
| Identity provider | Hosting identity can support authenticated mode | Medium | Verify Sites runtime identity contract in a preview. |
| Rate-limit thresholds | Limits need load-informed values | Medium | Measure preview traffic/cost before selecting numbers. |
