# Trustworthy Agent Demo Specification

## ADDED Requirements

### Requirement: Honest and bounded public demo

The system SHALL visibly identify itself as a simulated demo, SHALL state that
external business tools are not called, and SHALL provide a concise privacy and
retention notice before a user creates a run.

#### Scenario: Public visitor reviews scope

- GIVEN an unauthenticated visitor opens the public site
- WHEN the workspace loads
- THEN the simulation boundary, no-external-action claim, and demo-history
  retention behavior are visible without requiring a run

### Requirement: Protected request intake

The API SHALL reject requests exceeding a documented byte limit before JSON
parsing and SHALL enforce a documented per-session and per-IP request quota.

#### Scenario: Oversized request

- GIVEN a request body larger than the API byte limit
- WHEN it is sent to a run endpoint
- THEN the API returns 413 and performs no D1 write

#### Scenario: Quota exceeded

- GIVEN a subject has exhausted the allowed request budget
- WHEN it sends another state-changing request
- THEN the API returns 429 with `Retry-After` and performs no transition

### Requirement: Server-owned identity and data isolation

The system SHALL derive run ownership only from a server-verified authenticated
subject or an expiring server-issued demo session. Client JSON and custom headers
SHALL NOT be an ownership authority.

#### Scenario: Cross-owner lookup

- GIVEN run A belongs to subject A
- WHEN subject B reads or changes run A
- THEN the API returns a non-disclosing not-found response and no event is added

#### Scenario: Expired demo session

- GIVEN an anonymous demo session has expired
- WHEN it calls the run API
- THEN the API returns 401 and cannot access its old history

### Requirement: Enforced approval and exactly-once transition

The system SHALL regenerate the plan on the server, bind an approval to the
current plan hash and expiry, and permit only one transition for an observed run
version.

#### Scenario: Approval bypass attempt

- GIVEN a risky run is awaiting approval
- WHEN a caller requests execution directly
- THEN the API returns 409 and no executor work or completion event is created

#### Scenario: Concurrent state transition

- GIVEN two callers submit the same valid action for the same run version
- WHEN the database processes them concurrently
- THEN exactly one succeeds and the other receives 409

### Requirement: Durable, attributable event history

The system SHALL persist one immutable event row per state/action observation
with a run sequence, actor, request id, plan hash, timestamp, and payload.

#### Scenario: Malformed historical payload

- GIVEN one persisted event payload is malformed or cannot be decoded
- WHEN a user loads that run history
- THEN valid history remains available and the service records a diagnosable
  data-integrity failure without exposing raw sensitive content

### Requirement: Verification and deployment observability

The repository SHALL run unit, API/D1 integration, E2E accessibility, lint, and
production-build checks in CI. A deployment SHALL have a smoke test covering the
homepage, favicon, and demo API health/version endpoint.

#### Scenario: Deployment regression

- GIVEN a deployed build returns 404 for a required static asset or 5xx for the
  health endpoint
- WHEN the post-deploy smoke test runs
- THEN the deployment is marked failed for release review and the error is
  visible in release diagnostics
