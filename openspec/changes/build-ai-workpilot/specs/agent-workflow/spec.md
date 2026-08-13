# Agent Workflow Specification

## Requirements

### Requirement: Deterministic planning
The system SHALL convert supported Korean requests into a plan containing `goal`, `steps`, `tool`, `inputs`, `risk`, `requiresApproval`, and `expectedOutput`. Plans are immutable; a user creates a new run rather than mutating an approved plan.

#### Scenario: Repeatable demo
- GIVEN the same normalized request
- WHEN a plan is generated twice
- THEN its functional steps and risk classification are identical

### Requirement: Enforced approval
The system SHALL reject execution of a risky step unless the current plan version has been approved.

#### Scenario: Direct execution attempt
- GIVEN an awaiting-approval run
- WHEN execution is requested
- THEN the executor returns a blocked result and records no success event

#### Scenario: Concurrent execute attempt
- GIVEN an approved run
- WHEN two execution requests observe the same state concurrently
- THEN exactly one state transition succeeds and the other receives a conflict

### Requirement: Honest simulation
The system SHALL label every run and tool event as simulated and make no external business-tool request.

### Requirement: Durable isolated history
The system SHALL persist runs in D1 and return only rows owned by the supplied anonymous session token.

### Requirement: Observable recovery
The system SHALL display structured events and support a deterministic failure scenario that can be retried without duplicating completed steps.

## Acceptance criteria
- Three Korean fixture requests generate distinct plans.
- Approval is required for all high-risk steps.
- Reloading restores the current session's history.
- Another session cannot retrieve the run.
- Keyboard and 360px layouts retain the complete core flow.
- Lint, build, automated tests, and semantic review pass.
