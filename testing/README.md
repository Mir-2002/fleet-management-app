# FleetMan Test Plan — Wave 1

**Status (2026-08-28 update):** Wave 0 infrastructure and all six specs now have test code written
(by Codex, then continued by Claude after Codex's token budget ran out on the same session). See
"Implementation status" at the bottom of this file for exactly what's done, what's authored-but-unrun,
and what still needs a human/CI to actually execute.
**This branch:** `test/wave-1-tests` — in practice everything landed on one branch rather than the
one-branch-per-spec split originally suggested below; splitting it up after the fact would cost more
than it'd help at this point. Treat the "suggested branch sequence" section as historical intent, not
what actually happened.
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

## Running the tests locally

**Safety first: never point these at your live project.** `apps/web/.env.local` and `supabase/.env`
hold real credentials for the hosted project -- these tests do real inserts/deletes and must only
ever use the keys printed by `supabase status` for the *local* stack below.

1. `npm install` in the repo root (a normal terminal on your machine -- not through any sandboxed
   bridge; that environment lacked Docker and was too slow to finish a full install).
2. Install Docker Desktop if you don't have it (required for `supabase start`). On Windows: Docker
   Desktop with the WSL2 backend.
3. `npx supabase start` (first run pulls images, can take several minutes), then `npx supabase status`
   to get the local API URL, anon key, and service_role key.
4. Export `SUPABASE_URL` (`http://127.0.0.1:54321`), `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from step 3 in the terminal you'll run tests from.
5. `npm run db:test:reset` -- applies every migration and seeds the fixture users/trucks from
   `testing/fixtures.mjs`.
6. `npm run test:integration` (covers `testing/integration/**` and `testing/rls/**` -- one vitest
   config) and `npm run test:unit`.
7. For E2E: temporarily point `apps/web/.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at the local stack (back up the real values first --
   Next.js only reads `.env.local`, and Playwright launches `next dev` from it), then
   `npm run test:e2e:install` once, then `npm run test:e2e`. Restore your real `.env.local` after.

This has never actually been run end to end -- see "Implementation status" below for why. Expect to
fix a small thing or two on first run.

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


## Implementation status (2026-08-28 update)

**What Codex built (uncommitted work found already in the working tree when Claude picked this up):**
- Wave 0 infra: `supabase/config.toml`, `vitest.unit.config.ts`, `vitest.integration.config.ts`,
  `package.json` test scripts, `@playwright/test`/`vitest` devDependencies, a reconstructed baseline
  core-schema migration (`supabase/migrations/20260827084137_baseline_core_schema.sql`), and the
  finance migration renumbered to apply after it.
- Refactors to make business logic independently testable: `canTransitionTripStatus()` extracted into
  `trip.schema.ts`, `calculateNetPay()` into `payroll.schema.ts`, `CreateInvoiceFormSchema` hoisted
  from `invoices/actions.ts` into `invoice.schema.ts`.
- Unit tests: `testing/unit/request.schema.test.ts`, `trip-status.test.ts`, `finance.schema.test.ts`.
- Integration tests: `testing/integration/auth-middleware.test.ts`, `auth-actions.test.ts` (spec 03,
  fully mocked — no DB needed).
- Did **not** implement the two intended-behavior bugfixes (invoice SENT-lock, trip reassignment
  lock) — only the refactors above, no red/`it.fails` tests for them yet.

**What Claude added on top:**
- Fixed a real bug in the reconstructed baseline migration: `request_status` had `expense_status`'s
  `'REJECTED'` instead of `'DISPATCHED'`/`'COMPLETED'`, and `trip_status` had an extra `'DISPATCHED'`
  that's actually a request status. Values now match `packages/shared/src/schemas/{request,trip}.schema.ts`
  exactly. **This was not re-verified against the live hosted project** (no DB/network access from the
  authoring environment) — worth a direct check next time someone has live access.
- Deleted `packages/shared/src/types/index.ts` (confirmed unused everywhere; its `TripStatus` was the
  stale duplicate missing `DELIVERED`).
- Added `testing/fixtures.mjs` (shared seed-user/truck constants) and `supabase/seed.test.mjs` (was
  referenced by the `db:test:reset` script but didn't exist).
- Added `testing/rls/_helpers.ts` (role-authenticated client harness, deliberately never falls back to
  `apps/web/.env.local` since that may point at the live project).
- Integration tests: `testing/integration/request-lifecycle.test.ts` (spec 01),
  `trip-dispatch.test.ts` (spec 02, includes the `it.fails` red test for the reassignment-lock gap),
  `finance.test.ts` (spec 04, includes the `it.fails` red test for the SENT-lock gap).
- RLS tests: `testing/rls/request-rls.test.ts`, `trip-rls.test.ts`, `finance-rls.test.ts`.
- Spec 05 (policy matrix): `supabase/migrations/20260828000000_test_policy_introspection.sql` (adds a
  service-role-only `list_rls_policies()` RPC), `testing/rls/policy-snapshot.json` (hand-derived
  expected policies), `testing/rls/policy-matrix.test.ts`.
- Spec 06 (E2E): `playwright.config.ts`, `testing/e2e/auth.spec.ts` (solid — selectors verified against
  source), `testing/e2e/request-dispatch.spec.ts` (E2E-01 solid; E2E-02 has two TODOs — the exact
  accessible names for the truck/driver/helper Selects, and the Kanban drag-and-drop interaction,
  whose underlying library was never confirmed — see that file's header comment).

**What could NOT be executed or verified from the authoring environment, and why:**
- No Docker available, so `supabase start` (the local Postgres/Auth stack every integration/RLS/E2E
  test depends on) cannot run there.
- The `supabase` CLI itself fails on that environment (`No matching Supabase CLI binary package found
  for linux-x64`), so not even `supabase status` works.
- No outbound network access to the live Supabase project from that shell, so the enum-swap fix above
  couldn't be cross-checked against the real hosted schema either.
- **Only the unit tests (`npm run test:unit`) were actually run and confirmed passing.** Everything in
  `testing/integration/`, `testing/rls/`, and `testing/e2e/` is authored against the spec and the real
  code paths, but genuinely unverified — run `npm run db:test:reset` then `npm run test:integration`
  and `npm run test:e2e` yourself (or in CI) before trusting them, and expect to fix a few things on
  first run (typos, a selector, a fixture ordering issue) the way you would with any new test suite.

**Two `it.fails` red tests are in the suite by design** (`I-TRIP-10` in `trip-dispatch.test.ts`,
`I-FIN-07` in `finance.test.ts`) — they document known gaps and will start failing loudly (Vitest
flags an unexpected pass) the moment someone fixes the underlying bug, which is the signal to flip
them to a plain `it`.
