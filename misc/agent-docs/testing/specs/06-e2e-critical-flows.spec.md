# Spec 06 — E2E Critical Flows (Playwright)

**Branch:** `test/e2e-critical-flows`
**Depends on:** Specs 01–03 landing first (this exercises those flows through real UI — writing E2E
against still-buggy integration logic just produces flaky tests for the wrong reasons)
**Layer:** E2E, browser-driven, against `next dev`/`next start` + the local Supabase stack

## Why only a small slice

Per the agreed scope, wave-1 E2E is deliberately narrow — 1–2 flows that exercise the full stack
(UI → server action → DB → RLS → UI update), not a comprehensive suite. Expand in a later wave once
these are stable.

## Candidate flows

| ID | Flow | Why this one |
|---|---|---|
| E2E-01 | Client submits a new request via the portal (multi-stop form) → dispatcher sees it as `PENDING` on the dashboard → dispatcher accepts it → a trip appears on the Kanban board in `ASSIGNED` | The single most important cross-role workflow in the app; would have surfaced the CANCELLED/STATUS_ORDER gap immediately if it existed |
| E2E-02 | Dispatcher assigns truck+driver+helper to a trip → moves it to `IN_PROGRESS` → verifies the truck shows unavailable in the Trucks resource table and the request shows `DISPATCHED` | Exercises the assignment guard plus the cross-table side effects (truck availability, request status) in one pass |

## Open question to resolve during implementation

Run these two flows headless in a fast local feedback loop, with headed/trace-on-failure reserved
for CI once that's set up — or is a single Playwright config fine for now given CI is deferred (per
`00-INFRASTRUCTURE.md`)?
