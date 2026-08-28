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
| `npm run dev` target | Local Supabase stack, not the hosted project | Confirmed 2026-08-28 — `apps/web/.env.local` now holds local-stack URL/keys so dev and Playwright E2E exercise the same DB the fixture users/trucks are seeded into. Original live-project credentials are backed up at `apps/web/.env.local.live` (gitignored) — swap the two files if you need to point dev at the hosted project again. `supabase/.env` (used by `supabase/seed.mjs`, the hosted-project seed script) is untouched and still points at the live project on purpose. |

## Running the tests locally

**Safety first: never point these at your live project.** `apps/web/.env.local` and `supabase/.env`
hold real credentials for the hosted project -- these tests do real inserts/deletes and must only
ever use the keys printed by `supabase status` for the *local* stack below.

1. `npm install` in the repo root (a normal terminal on your machine -- not through any sandboxed
   bridge; that environment lacked Docker and was too slow to finish a full install).
2. Install Docker Desktop if you don't have it (required for `supabase start`). On Windows: Docker
   Desktop with the WSL2 backend.
3. `npx supabase start` (first run pulls images, can take several minutes), then `npx supabase status`
   to get the local API URL, publishable key, and secret key (older CLI versions label these anon key
   and service_role key -- same thing, just renamed).
4. Export `SUPABASE_URL` (`http://127.0.0.1:54321`), `SUPABASE_PUBLISHABLE_KEY`, and
   `SUPABASE_SECRET_KEY` from step 3 in the terminal you'll run tests from (`testing/rls/_helpers.ts`
   and `supabase/seed.test.mjs` also accept the legacy `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`
   names as a fallback, but the publishable/secret names are preferred). These are local-stack-only
   credentials -- ignore the storage access key / storage secret key some CLI versions also print,
   those are unrelated S3-protocol credentials for the Storage bucket.
   Optional: instead of re-exporting these every session, put them in a gitignored
   `.env.test.local` at the repo root (the `.env.*.local` pattern is already in `.gitignore`) and
   source it before running tests -- just keep it separate from `apps/web/.env.local`, which holds
   the live project's credentials, not the local stack's.
5. `npm run db:test:reset` -- applies every migration and seeds the fixture users/trucks from
   `testing/fixtures.mjs`.
6. `npm run test:unit` (no DB needed) and `npm run test:integration` (covers `testing/rls/**` only --
   the name is legacy from before the 2026-08-28 cut, see "Cut: dedicated integration-test layer"
   above; it needs the local stack from steps 3-5).
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


## Cut: dedicated integration-test layer (2026-08-28)

Per Ahmer's call: the DB-backed `testing/integration/**` tests (request lifecycle, trip dispatch,
finance) added real setup complexity -- Docker, a local Supabase stack, seeded fixtures, env vars --
for what's still a base app. Removed `request-lifecycle.test.ts`, `trip-dispatch.test.ts`, and
`finance.test.ts`. The two tests that were filed under "integration" but never actually needed a
database (`auth-middleware.test.ts`, `auth-actions.test.ts` -- both fully mocked) moved to
`testing/unit/` instead, since they don't have the complexity problem being solved for.

`vitest.integration.config.ts` now only covers `testing/rls/**` -- RLS tests weren't part of this
decision (Ahmer didn't ask to cut those, and a plain-text question about them is still open, see
below), but they share the exact same Docker/local-stack dependency, so worth a deliberate call
rather than assuming either way. The E2E suite (`testing/e2e/**`) needs that same local stack
regardless of how the RLS question resolves -- cutting DB-tier unit-of-work tests doesn't remove the
Docker requirement, since Playwright has to run against something.

**Coverage given up by cutting the integration layer** (not automatically recovered by unit + E2E):
double-booking prevention on trip assignment, the invoice-totals and payroll-net-pay DB triggers
doing their math correctly, and the unique constraints (one payroll record per employee per period,
etc.) actually rejecting duplicates. Some of this could still be covered as pure unit tests if more
of that logic gets extracted into `packages/shared` the way `canTransitionTripStatus()` and
`calculateNetPay()` already were -- worth doing opportunistically, not a blocker.

## Implementation status (2026-08-28 update, reconciled after the integration-test cut)

**What Codex built (uncommitted work found already in the working tree when Claude picked this up):**
- Wave 0 infra: `supabase/config.toml`, `vitest.unit.config.ts`, `vitest.integration.config.ts`,
  `package.json` test scripts, `@playwright/test`/`vitest` devDependencies, a reconstructed baseline
  core-schema migration (`supabase/migrations/20260827084137_baseline_core_schema.sql`), and the
  finance migration renumbered to apply after it.
- Refactors to make business logic independently testable: `canTransitionTripStatus()` extracted into
  `trip.schema.ts`, `calculateNetPay()` into `payroll.schema.ts`, `CreateInvoiceFormSchema` hoisted
  from `invoices/actions.ts` into `invoice.schema.ts`.
- Unit tests: `testing/unit/request.schema.test.ts`, `trip-status.test.ts`, `finance.schema.test.ts`.
- Two auth tests originally filed under `testing/integration/` (`auth-middleware.test.ts`,
  `auth-actions.test.ts`, spec 03) — fully mocked, never needed a DB. Since moved to `testing/unit/`
  (see "Cut" section above).
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
- Moved `auth-middleware.test.ts` and `auth-actions.test.ts` into `testing/unit/`; added the `@` path
  alias to `vitest.unit.config.ts` so their `@/lib/supabase/server` mock resolves.
- Authored, then deleted per the 2026-08-28 cut (see above): `testing/integration/request-lifecycle.test.ts`
  (spec 01), `trip-dispatch.test.ts` (spec 02, included the `it.fails` red test for the
  reassignment-lock gap), `finance.test.ts` (spec 04, included the `it.fails` red test for the
  SENT-lock gap). Their coverage is **not** currently replaced — see the "Cut" section above for what
  was given up and how some of it could come back as pure unit tests later.
- RLS tests (kept, not part of the cut): `testing/rls/request-rls.test.ts`, `trip-rls.test.ts`,
  `finance-rls.test.ts`.
- Spec 05 (policy matrix): `supabase/migrations/20260828000000_test_policy_introspection.sql` (adds a
  service-role-only `list_rls_policies()` RPC), `testing/rls/policy-snapshot.json` (hand-derived
  expected policies), `testing/rls/policy-matrix.test.ts`.
- Spec 06 (E2E): `playwright.config.ts`, `testing/e2e/auth.spec.ts` (solid — selectors verified against
  source), `testing/e2e/request-dispatch.spec.ts` (E2E-01 solid; E2E-02 has two TODOs — the exact
  accessible names for the truck/driver/helper Selects, and the Kanban drag-and-drop interaction,
  whose underlying library was never confirmed — see that file's header comment).

**What could NOT be executed or verified from the authoring environment, and why:**
- No Docker available in the authoring/bridge environment, so `supabase start` (the local Postgres/Auth
  stack every RLS/E2E test depends on) cannot run there.
- The `supabase` CLI itself fails on that environment (`No matching Supabase CLI binary package found
  for linux-x64`), so not even `supabase status` works from there.
- No outbound network access to the live Supabase project from that shell, so the enum-swap fix above
  couldn't be cross-checked against the real hosted schema either.
- A structural platform mismatch also blocks re-running `npm run test:unit` from the bridge after the
  file moves: the user's own `npm install` runs on their real Windows machine and installs
  Windows-native optional deps (e.g. `@rollup/rollup-win32-x64-msvc`), while the bridge is a separate
  Linux VM that needs Linux-native ones (`@rollup/rollup-linux-x64-gnu`) — these get pruned every time
  Windows `npm install` runs. **Only an earlier run of `npm run test:unit` (before the auth-test move)
  was actually confirmed passing from this side.** Run `npm run test:unit` yourself to confirm it still
  passes including the two newly-relocated auth tests, then `npm run db:test:reset` and
  `npm run test:e2e` (RLS tests run via `test:integration`, see the "Cut" section for what that now
  covers) before trusting any of it.

**Two `it.fails` red tests were part of the now-deleted integration suite by design**
(`I-TRIP-10` in `trip-dispatch.test.ts`, `I-FIN-07` in `finance.test.ts`) — they documented known gaps
(trip reassignment isn't locked once `IN_PROGRESS+`; invoices don't lock once sent) and would have
started failing loudly the moment someone fixed the underlying bug. With the integration layer cut,
those two bugs are undocumented in test form again — tracked only in "Known bugs" above. Worth
re-adding as unit-level `it.fails` tests once/if the relevant logic gets extracted into
`packages/shared` the way `canTransitionTripStatus()` was.
