# FleetMan Test Plan — Wave 1

**Status:** Planning complete, ready for implementation by Codex on the branches listed below.
**This branch:** `test/wave-1-test-plan` (plan + specs only — no test code lands here).
**Decisions confirmed with Ahmer:** 2026-08-28.

## Why this exists

The FleetMan codebase currently has TypeScript passing and a working production build, but zero
automated tests — no unit, integration, RLS, or end-to-end coverage. This folder is the plan for
closing that gap in a first wave, split into branch-sized chunks so each can be implemented,
reviewed, and merged independently under the `feature/`, `bugfix/`, `test/` branching convention.

Nothing in this folder is test code. It's the spec Codex should implement against.

## How this folder is organized

- `00-INFRASTRUCTURE.md` — the prerequisite work (schema baseline + tooling) that has to land
  before most specs below can actually run against a real database.
- `specs/01-request-lifecycle.spec.md`
- `specs/02-trip-dispatch-assignment.spec.md`
- `specs/03-auth-rbac.spec.md`
- `specs/04-finance-invoices-expenses-payroll.spec.md`
- `specs/05-rls-policy-matrix.spec.md`
- `specs/06-e2e-critical-flows.spec.md`

Each spec is meant to become its own `test/` branch (named in the spec's header).

## Decisions made (with rationale)

| Decision | Choice | Why |
|---|---|---|
| Core schema source | Pull the live schema via `supabase db pull` into a baseline migration + generated types | `profiles`, `requests`, `trips`, `stops`, `trucks` currently exist only on the live Supabase project — no local migration, no `config.toml`. Tests need a real, versioned schema to run against. |
| Unit/integration runner | Vitest | Fast, native ESM/TS, low-friction with Next.js 14 and the existing Zod-heavy code. |
| RLS test method | Local Supabase stack (Docker via `supabase start`) + `supabase-js`, one seeded user per role | Tests real Postgres + real policies through the same client the app actually uses. |
| E2E scope | Small Playwright slice in wave 1 (1-2 critical full-stack flows) | Enough to catch cross-layer regressions without building a full suite before the unit/integration layer even exists. |
| Finance timing | Included in wave 1, tested locally | The finance migration (invoices/expenses/payroll) is written but not yet applied anywhere — testing it locally before it's ever pushed to prod catches issues early. |
| Trip/request cancellation | Documented as a known gap, not tested as a bug | No server action anywhere sets a request or trip to `CANCELLED` despite the status existing in every enum and UI badge. Confirmed: not built yet. Wave 1 tests document this; a `feature/` or `bugfix/` branch should add it later. |
| Bug-handling philosophy | Test *intended* behavior where a design intent is clearly documented in code comments but unenforced | Two cases qualify this wave: invoices should lock once `status != DRAFT` (migration comment says so, nothing enforces it); trip resource reassignment should lock once `IN_PROGRESS+` (confirmed 2026-08-28). These tests will fail today by design — that failure is the spec for a follow-up `bugfix/` branch. |
| Request edit ownership | CLIENT: own `PENDING` requests only. DISPATCHER: any `PENDING` request. | Confirmed 2026-08-28 — determines the RLS assertions in spec 01. |
| DELIVERED → request status | Intentionally no effect | Confirmed 2026-08-28 — `DELIVERED` is a trip-side checkpoint only; only `IN_PROGRESS` (→ `DISPATCHED`) and `COMPLETED` (→ `COMPLETED`) touch the parent request. |

## Suggested branch sequence

0. `test/schema-baseline-and-tooling` — **blocking.** See `00-INFRASTRUCTURE.md`. Nothing else can run for real without this.
1. `test/request-lifecycle` — spec 01
2. `test/trip-dispatch-assignment` — spec 02
3. `test/auth-rbac` — spec 03
4. `test/finance-invoices-expenses-payroll` — spec 04
5. `test/rls-policy-matrix` — spec 05 (cross-cutting audit; do after 1-4, can start once 0 lands)
6. `test/e2e-critical-flows` — spec 06 (after 1-3 land, since it drives those flows through real UI)

## Known bugs this wave will surface as failing (red) tests, by design

- Invoices don't actually lock once `status != 'DRAFT'`, despite the migration's own comment saying SENT should lock the record. See spec 04, `I-FIN-07`.
- Trip resource (truck/driver/helper) reassignment isn't locked once a trip is `IN_PROGRESS` or later — only double-booking is checked, not trip stage. See spec 02, `I-TRIP-10`.

Each of these should get its own `bugfix/` branch once its red test lands.

## Known non-goals for wave 1

- No test for a cancellation feature — there's nothing to test against; it's a gap, not a bug (see above).
- No test for the `OVERDUE` invoice sweep — the design notes call for a `pg_cron` nightly job that doesn't exist in the repo. Candidate for a later `feature/` branch.
- No mobile app tests — the React Native/PowerSync app described in the project brief isn't in this repo yet.
- `console.log` debug statements left in `middleware.ts` and `login/actions.ts` (logging user id/role/email on every request/attempt) aren't a test target, but will spam test output. Recommend a quick `bugfix/remove-debug-logging` branch before or alongside this wave.
- CI (GitHub Actions) wiring is deferred — flagged in `00-INFRASTRUCTURE.md` as a follow-up, not required for wave 1 to land.
