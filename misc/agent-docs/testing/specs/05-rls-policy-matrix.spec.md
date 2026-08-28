# Spec 05 — RLS Policy Matrix (cross-cutting)

**Branch:** `test/rls-policy-matrix`
**Depends on:** Wave 0
**Layer:** RLS (integration-style, `supabase-js` clients authenticated as each seeded role)

## Purpose

Specs 01–04 already embed workflow-specific RLS assertions. This spec is the belt-and-suspenders
cross-check: one matrix, one row per (table × role × operation), run against the local stack, so a
policy change anywhere shows up as a single obvious diff instead of being buried across four spec
files. Implement this *after* 01–04 — it will mostly restate their RLS cases in one place. Treat it
as a coverage audit, not new discovery.

## Approach

1. Enumerate every table from the pulled baseline schema plus the finance migration.
2. For each table, for each role (DISPATCHER, CLIENT, DRIVER, HELPER, anonymous), for each
   operation (SELECT, INSERT, UPDATE, DELETE): one row, expected ALLOW/DENY, cross-referenced
   against the matching spec-01–04 test ID where one already covers it.
3. Any cell with no covering test elsewhere is new coverage this branch has to add.

## Deliverable

A generated (not hand-maintained) matrix — e.g. a small script that queries `pg_policies` for the
current DB and cross-references it against a checked-in YAML/JSON "expected" file, failing the test
if reality and expectation diverge. This turns future policy drift into a test failure instead of a
silent surprise — the exact class of gap that motivated this whole test-plan exercise (the core
schema/policies currently exist only on the live project, undocumented).

## Open question to resolve during implementation

Should the checked-in "expected" policy file be the source of truth (test fails if the DB doesn't
match the file — catches *any* policy change, intentional or not), or should the live DB be treated
as truth with the file just documenting a snapshot (test only fails on *accidental* drift from that
snapshot)? Recommend the latter for wave 1 — cheaper, and still catches accidental changes. Revisit
once the team is intentionally iterating on policies day to day.
