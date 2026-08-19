# Change: Harden AI WorkPilot Demo and Production Readiness

## Why

AI WorkPilot is a public portfolio demo with a sound safety core, but its current
anonymous-session and JSON-event design is intentionally demo-only. This change
defines the minimum boundary between a credible public demo and any future
production adapter integration.

## What Changes

- Make the demo boundary, data retention, and public access model explicit.
- Add request-size, rate-limit, and abuse-resilience controls before database work.
- Replace client-controlled anonymous ownership with server-authenticated identity
  before real integrations are enabled.
- Move schema initialization into migrations and define append-only audit events.
- Add API integration, browser E2E, accessibility, migration, and live smoke tests.
- Fix the missing favicon response and add deploy-time health verification.

## Non-goals

- Enabling real mail, calendar, or Slack actions in this change.
- Claiming LLM accuracy, autonomy, or productivity metrics.
- Migrating existing demo data without an approved data-retention decision.
