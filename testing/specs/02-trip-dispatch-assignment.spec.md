# Spec 02 — Trip Dispatch & Resource Assignment

**Branch:** `test/trip-dispatch-assignment`
**Depends on:** Wave 0; reuses fixtures from Spec 01 (a `PENDING`/`ACCEPTED` request produces a trip)
**Layers:** unit (status-order logic) · integration · RLS

## Workflow summary

Trips move `ASSIGNED` → `IN_PROGRESS` → `DELIVERED` → `COMPLETED` (`CANCELLED` exists in the enum
but nothing sets it — see gap below). A dispatcher assigns a truck/driver/helper; `IN_PROGRESS`
requires all three; truck availability toggles automatically; a driver/helper already on an active
trip (`ASSIGNED` or `IN_PROGRESS`) can't be assigned to another.

## Confirmed business rules

- Status only moves forward: `ASSIGNED`(0) → `IN_PROGRESS`(1) → `DELIVERED`(2) → `COMPLETED`(3).
  Backward moves are rejected.
- `IN_PROGRESS` requires `truck_id`, `driver_id`, `helper_id` all set.
- Reaching `DELIVERED` or `COMPLETED` with a truck assigned sets `trucks.is_available = true`.
- Reaching `IN_PROGRESS` sets the parent request's status to `DISPATCHED`. Reaching `COMPLETED`
  sets it to `COMPLETED`. **`DELIVERED` intentionally does not change the parent request's status**
  (confirmed 2026-08-28 — `DELIVERED` is a trip-side checkpoint only).
- A driver or helper already on another `ASSIGNED`/`IN_PROGRESS` trip cannot be assigned to a new one.
- **New intended rule, currently unenforced — write as a failing/red test (confirmed 2026-08-28):**
  once a trip is `IN_PROGRESS` or later, its truck/driver/helper assignment should be locked.
  Today's `updateTripAssignmentAction` only checks double-booking, not trip stage.

## Known gap — document, don't test as a bug

`CANCELLED` is in the `TripStatus` enum, but `STATUS_ORDER` in `trips/actions.ts` doesn't include
it — so any attempt to move a trip to `CANCELLED` via `updateTripStatusAction` is unconditionally
rejected as "moving backwards" (`STATUS_ORDER['CANCELLED'] ?? -1` is always less than the current
status's order). There is no other action that sets `CANCELLED`. Add a test asserting today's
actual behavior: calling `updateTripStatusAction(tripId, 'CANCELLED')` always returns
`{success:false, error:'Cannot move a trip backwards.'}` regardless of current status — with a
comment pointing at the missing feature, not as a red/bug test (there's no "correct" behavior to
assert yet without a product decision on what trip cancellation should even do).

## Assumed schema (confirm once Wave 0 lands)

- `trips`: id, request_id, truck_id, driver_id, helper_id, dispatcher_id, status, dispatched_at,
  started_at, completed_at, created_at
- `trucks`: id, plate_number, truck_type, is_available, `trucking`(?), created_at — confirm the
  `trucking` column's purpose during Wave 0

## Test cases

### Unit

| ID | Description | Expected |
|---|---|---|
| U-TRIP-01 | Rejects any transition where target order < current order | rejected |
| U-TRIP-02 | Allows target order >= current order (including same-status no-op) | allowed |
| U-TRIP-03 | Moving to `CANCELLED` from any status is rejected by current logic (documents the gap) | rejected, `'Cannot move a trip backwards.'` |

### Integration
> **Status (2026-08-28): cut.** This Integration tier was implemented (see `testing/README.md`'s "Cut: dedicated integration-test layer" section) then removed as a deliberate scope call -- the DB/Docker setup cost wasn't worth it for a base app. The test cases below are kept as a record of intended coverage, not as work still to do. Some of this logic may come back as pure unit tests if it gets extracted into `packages/shared`.


| ID | Description | Expected |
|---|---|---|
| I-TRIP-01 | `ASSIGNED` → `IN_PROGRESS` without truck/driver/helper set | rejected, "Assign a truck, driver, and helper before starting this trip." |
| I-TRIP-02 | Same, with all three set | allowed, request.status → `DISPATCHED` |
| I-TRIP-03 | `IN_PROGRESS` → `DELIVERED` | allowed, truck.is_available → true, **request.status unchanged** |
| I-TRIP-04 | `DELIVERED` → `COMPLETED` | allowed, request.status → `COMPLETED` |
| I-TRIP-05 | `COMPLETED` → `IN_PROGRESS` (backwards) | rejected |
| I-TRIP-06 | Assigning a driver already `ASSIGNED`/`IN_PROGRESS` on another trip | rejected, "This driver is already assigned to another active trip." |
| I-TRIP-07 | Same for helper | rejected |
| I-TRIP-08 | Assigning a truck already assigned elsewhere | **note:** current code has no truck double-booking check at all (only driver/helper) — test and document today's actual behavior; flag as a possible second gap alongside the reassignment-lock one |
| I-TRIP-09 | Reassigning truck flips old truck → available, new truck → unavailable | as described |
| I-TRIP-10 | **(intended-behavior / red test)** reassignment on a trip with status `IN_PROGRESS`+ is rejected | should reject; will fail today — spec for `bugfix/lock-trip-reassignment` |
| I-TRIP-11 | `getResourcesForAssignmentAction` correctly flags busy vs free drivers/helpers/trucks | matches active-trip state |

### RLS

| ID | Description | Expected |
|---|---|---|
| R-TRIP-01 | DISPATCHER full CRUD on trips | allowed |
| R-TRIP-02 | DRIVER can SELECT trips where they are `driver_id` | allowed |
| R-TRIP-03 | DRIVER cannot SELECT trips they're not assigned to | denied |
| R-TRIP-04 | HELPER equivalent of R-TRIP-02/03 | allowed / denied |
| R-TRIP-05 | CLIENT cannot SELECT trips at all (only their own requests) | likely denied — confirm intent during Wave 0 |
| R-TRIP-06 | DRIVER/HELPER cannot UPDATE trips | denied — see open question below before assuming this is final |

## Open questions to resolve during implementation

- **I-TRIP-08:** should truck assignment get the same double-booking guard as driver/helper?
  Recommend flagging as a second `bugfix/` candidate once confirmed with Ahmer.
- **R-TRIP-06:** the project brief has drivers/helpers accepting/declining/starting/completing
  trips from the (not-yet-built) mobile app. It's unclear whether the intended RLS already allows
  DRIVER/HELPER to UPDATE their own trip's status (for when the mobile app arrives) or whether
  that's strictly dispatcher-only today. Recommend confirming with Ahmer directly rather than
  assuming, since it affects how the mobile app's eventual RLS needs will be pre-provisioned.
