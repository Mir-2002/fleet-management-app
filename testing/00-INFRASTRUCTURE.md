# Wave 0 — Test Infrastructure (blocking prerequisite)

**Branch:** landed on `test/wave-1-tests` in practice (see testing/README.md).

**Status (2026-08-28):** Mostly done -- config.toml, both migrations, vitest config, npm scripts, and seed.test.mjs all exist. `database.types.ts` (task 2 below) was **not** generated -- see the note under that task. Nothing here has been run end-to-end (`supabase db reset` / `supabase start`) from the authoring environment; see testing/README.md's "Implementation status" section for exactly why and what that means for trusting the rest of the suite.

## Why this has to come first

Every RLS test, most integration tests, and all finance-migration tests need a real, versioned
schema to run against. Right now `profiles`, `requests`, `trips`, `stops`, and `trucks` exist only
on the live Supabase project — there's no local migration, no `supabase/config.toml`, and no
generated types. This branch captures that schema into the repo before any wave-1 spec is
implemented for real.

## Tasks

1. **Link & pull the live schema**
   - `supabase login`, `supabase link --project-ref <ref>`
   - `supabase db pull` — generates a baseline migration under `supabase/migrations/` capturing
     every core table, enum, trigger, and RLS policy that currently exists only in the dashboard.
   - Review the generated SQL by hand. Cross-check it against what the app code assumes (see each
     spec's "Assumed schema" section) and fix any naming mismatches before committing.
   - Commit it (name per Supabase CLI convention, e.g. `<timestamp>_baseline_core_schema.sql`).

2. **Generate TypeScript types**
   - `supabase gen types typescript --project-id <ref> > packages/shared/src/types/database.types.ts`
   - **Not done yet** -- needs either a live `supabase link` (CLI credentials) or a running local
     stack to generate from, neither of which was available where this was written. Still worth
     doing: right now the app's hand-written Zod schemas are the only source of truth for row
     shapes, so a column rename in a migration wouldn't be caught by anything until a query fails
     at runtime.
   - `packages/shared/src/types/index.ts` (the stale duplicate `TripStatus` missing `DELIVERED`)
     has already been deleted, since it was confirmed unused anywhere in the app -- that part of
     this task is done independent of the types-generation step above.

3. **Local Supabase stack**
   - `supabase init` (creates `supabase/config.toml`, currently missing).
   - Confirm `supabase start` boots Postgres + Auth + Storage locally via Docker and applies every
     migration (baseline + the existing finance migration) cleanly from a fresh checkout.
   - Add an npm script: `"db:test:reset": "supabase db reset"` so tests can get a clean, re-seeded
     database on demand.

4. **Seed fixtures for tests**
   - Extend `supabase/seed.mjs` (or add a dedicated `supabase/seed.test.mjs`) to create one auth
     user + profile per role needed by the specs: 1 DISPATCHER, 2 CLIENTs (cross-client isolation
     tests need two), 2 DRIVERs, 2 HELPERs.
   - At least 2 trucks (one available, one not).

5. **Vitest setup**
   - Install `vitest`, `vite-tsconfig-paths`, and whatever React/DOM plugin is actually needed
     (most of wave 1 is server actions and pure logic, not component rendering — confirm before
     pulling in a heavier setup than necessary).
   - Two configs/projects: one for pure unit tests (no network — Zod schemas, pure functions), one
     for integration tests that point `@supabase/supabase-js` at the local stack from step 3 and
     run serially against a reset DB.
   - npm scripts: `test:unit`, `test:integration`, `test` (both).

6. **Playwright setup**
   - Install `@playwright/test`.
   - Config to run against `next dev` (or `next build && next start`) pointed at the local Supabase
     stack.
   - A global setup step that resets/seeds the DB before the E2E project runs.

7. **CI** — flag only, not required to land this wave.
   - Future branch: a GitHub Actions workflow that starts the local Supabase stack, runs
     `db:test:reset`, then `test:unit` → `test:integration` → `test:e2e` in that order.

## Acceptance criteria for this branch

- [x] `supabase/config.toml` and a baseline core-schema migration exist and are committed (the
      baseline's `request_status`/`trip_status` enums were corrected 2026-08-28 -- see README).
- [ ] `supabase db reset` succeeds from a clean checkout and produces a fully working local DB (core
      tables + finance tables + RLS policies + triggers, all from migrations — nothing manual).
      **Not verified** -- no Docker in the authoring environment. First thing to check when you
      pick this up.
- [ ] `packages/shared/src/types/database.types.ts` exists and is generated, not hand-written. **Not
      done** -- see task 2 above.
- [x] `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` all exist as scripts.
- [x] `npm run test:unit` runs successfully (confirmed 2026-08-28).
- [ ] `npm run test:integration` / `npm run test:e2e` run successfully -- **not verified**, same
      Docker/network constraint. Real test cases exist for all of wave 1 (see README's
      "Implementation status"), they just haven't been run yet by anyone.

## Open item to flag back to Ahmer once this branch is in progress

Once the baseline migration is pulled, diff it against every "Assumed schema" section across the
spec files — some names are unclear from the app code alone and should be confirmed against the
real column, notably `trucks.trucking` (referenced in
`apps/web/src/app/dashboard/resources/trucks/actions.ts` but its purpose isn't obvious from
context — possibly a trucking-company/contractor field).
