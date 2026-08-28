# Spec 01 — Request Lifecycle

**Branch:** `test/request-lifecycle`
**Depends on:** Wave 0 (`test/schema-baseline-and-tooling`)
**Layers:** unit (Zod schemas) · integration (server actions against local Supabase) · RLS

## Workflow summary

A CLIENT (via the portal) or a DISPATCHER (via the dashboard, with an `autoAccept` option) creates
a request with 1+ stops (minimum 2: origin + destination). A dispatcher accepts a `PENDING`
request, which creates a matching trip. Only `PENDING` requests can be edited or deleted.

## Confirmed business rules

- A request needs at least 2 stops. No confirmed maximum.
- `scheduledDate` cannot be before today — this is a **date-only** comparison. Same-day requests
  are always allowed regardless of current time of day.
- All three cargo dimensions (length/width/height) must be provided together, or none at all.
- Requests are editable/deletable only while `status = 'PENDING'`.
- **Ownership (confirmed 2026-08-28):** a CLIENT may only edit/delete their *own* `PENDING`
  requests. A DISPATCHER may edit/delete *any* `PENDING` request.
- `acceptRequestAction`: `PENDING` → `ACCEPTED`, and creates a trip (`status = 'ASSIGNED'`).
- `autoAccept=true` (dashboard-only path): request is created directly as `ACCEPTED` and a trip is
  created in the same call.

## Known gap — document, don't test as a bug

No action anywhere transitions a request to `CANCELLED`. Add a test that documents this rather
than treating it as a red bug test — there is genuinely no code path to assert against yet.
Confirmed 2026-08-28: not built yet, tracked separately as a future `feature/`/`bugfix/` branch.

## Assumed schema (confirm once Wave 0 lands)

- `requests`: id, client_id, status, cargo_handling_tags[], cargo_weight, cargo_length,
  cargo_width, cargo_height, cargo_measurement_mode, truck_type_requested, scheduled_date,
  scheduled_time, notes, created_at
- `stops`: id, request_id, sequence, stop_type, address, contact_name, contact_phone, latitude,
  longitude, created_at

## Test cases

### Unit (Zod schema validation, no DB)

| ID | Description | Expected |
|---|---|---|
| U-REQ-01 | `CreateRequestSchema` rejects 0 handling tags | validation error |
| U-REQ-02 | `CreateRequestSchema` rejects `cargoWeight <= 0` | validation error |
| U-REQ-03 | `CreateRequestSchema` rejects 1 or 2 of 3 cargo dimensions provided | validation error, path `cargoLength` |
| U-REQ-04 | `CreateRequestSchema` accepts all 3 dimensions provided | passes |
| U-REQ-05 | `CreateRequestSchema` accepts 0 dimensions provided | passes |
| U-REQ-06 | `CreateRequestSchema` rejects fewer than 2 stops | validation error |
| U-REQ-07 | `CreateRequestSchema` rejects malformed `scheduledTime` (not `HH:MM`) | validation error |
| U-REQ-08 | `UpdateRequestSchema` mirrors the same dimension/stop/time rules | as above |

### Integration (server actions against local Supabase)
> **Status (2026-08-28): cut.** This Integration tier was implemented (see `testing/README.md`'s "Cut: dedicated integration-test layer" section) then removed as a deliberate scope call -- the DB/Docker setup cost wasn't worth it for a base app. The test cases below are kept as a record of intended coverage, not as work still to do. Some of this logic may come back as pure unit tests if it gets extracted into `packages/shared`.


| ID | Description | Expected |
|---|---|---|
| I-REQ-01 | `createRequestAction` (`autoAccept=false`) inserts request as `PENDING` + all stops in sequence order | request `PENDING`, stops match input order |
| I-REQ-02 | `createRequestAction` (`autoAccept=true`) inserts request `ACCEPTED` + creates a trip (`ASSIGNED`) in the same call | request `ACCEPTED`, exactly 1 trip row referencing it |
| I-REQ-03 | `createRequestAction` rejects `scheduledDate` in the past | `{success:false}`, no rows inserted |
| I-REQ-04 | `acceptRequestAction` on a `PENDING` request | status `ACCEPTED`, 1 trip (`ASSIGNED`) created |
| I-REQ-05 | `acceptRequestAction` on a non-`PENDING` request | current code has no guard here — test and document today's actual behavior; flag if it should be guarded |
| I-REQ-06 | `updateRequestAction` on a `PENDING` request | succeeds, fields updated |
| I-REQ-07 | `updateRequestAction` on a non-`PENDING` request | `{success:false, error:'Only pending requests can be edited.'}` |
| I-REQ-08 | `deleteRequestAction` on `PENDING` / non-`PENDING` | succeeds / rejected, mirroring I-REQ-06/07 |
| I-REQ-09 | `getStopsForRequestAction` returns stops ordered by `sequence` | ordered array |
| I-REQ-10 | No action sets status to `CANCELLED` (gap documentation) | structural/code-review check, not a runtime call — see "Known gap" above |

### RLS

| ID | Description | Expected |
|---|---|---|
| R-REQ-01 | CLIENT can INSERT a request with their own `client_id` | allowed |
| R-REQ-02 | CLIENT cannot INSERT a request with someone else's `client_id` | denied |
| R-REQ-03 | CLIENT can SELECT their own requests | allowed |
| R-REQ-04 | CLIENT cannot SELECT another client's requests | denied / empty result |
| R-REQ-05 | CLIENT can UPDATE their own `PENDING` request | allowed |
| R-REQ-06 | CLIENT cannot UPDATE another client's `PENDING` request | denied |
| R-REQ-07 | CLIENT cannot UPDATE their own request once it's not `PENDING` | depends on whether the PENDING gate is DB-enforced (RLS) or app-layer only — see "Open question" |
| R-REQ-08 | DISPATCHER can SELECT/UPDATE/DELETE any request regardless of client | allowed |
| R-REQ-09 | DRIVER/HELPER cannot SELECT/INSERT/UPDATE/DELETE requests at all | denied |

## Open question to resolve during implementation

R-REQ-07 depends on whether "only PENDING is editable" is enforced by an RLS `USING`/`WITH CHECK`
clause on `requests`, or purely by the `updateRequestAction` code. Wave 0's schema pull will answer
this. If it turns out to be app-layer-only, a client could bypass it by calling Supabase directly —
flag that as a candidate `bugfix/` ticket if confirmed.
