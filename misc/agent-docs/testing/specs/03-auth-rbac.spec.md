# Spec 03 — Auth & RBAC

**Branch:** `test/auth-rbac`
**Depends on:** Wave 0 (seeded users per role)
**Layers:** integration (middleware + server actions) · E2E (a couple of flows, see also Spec 06)

## Workflow summary

Two separate login surfaces: `/login` (dispatcher) and `/portal/login` (client). Role is read from
`auth.jwt().app_metadata.user_role`. Middleware gates every route; server actions additionally
re-check role at sign-in (defense in depth).

## Confirmed business rules (read directly from code)

- `/portal/login`: public. An authenticated CLIENT visiting it is redirected to `/portal/requests`.
- `/portal/*` (other than login): requires auth; non-CLIENT is signed out and redirected to
  `/portal/login?error=unauthorized`.
- `/login`, `/auth/*`: public. Authenticated DISPATCHER → redirected to `/dashboard`. Authenticated
  CLIENT → redirected to `/portal/requests`.
- All other routes (`/dashboard/*` and anything else): requires auth; non-DISPATCHER is signed out
  and redirected to `/login?error=unauthorized`.
- `login()` action re-checks `role === 'DISPATCHER'` after sign-in.
- `portalLogin()` action re-checks `role === 'CLIENT'` after sign-in.
- DRIVER/HELPER have no web destination at all — either of them authenticating on either login
  surface gets signed out and bounced with `?error=unauthorized`, since they're mobile-only.

## Test cases

### Integration (middleware + server actions, against local Supabase auth)

| ID | Description | Expected |
|---|---|---|
| I-AUTH-01 | Unauthenticated request to `/dashboard` | redirect → `/login` |
| I-AUTH-02 | Unauthenticated request to `/portal/requests` | redirect → `/portal/login` |
| I-AUTH-03 | DISPATCHER hitting `/dashboard` | passes through |
| I-AUTH-04 | DISPATCHER hitting `/portal/requests` | signed out, redirect → `/portal/login?error=unauthorized` |
| I-AUTH-05 | CLIENT hitting `/portal/requests` | passes through |
| I-AUTH-06 | CLIENT hitting `/dashboard` | signed out, redirect → `/login?error=unauthorized` |
| I-AUTH-07 | DRIVER (or HELPER) hitting `/dashboard` or `/portal/*` | signed out, redirect with `?error=unauthorized` on the relevant login page |
| I-AUTH-08 | Authenticated DISPATCHER visiting `/login` | redirect → `/dashboard` |
| I-AUTH-09 | Authenticated CLIENT visiting `/portal/login` | redirect → `/portal/requests` |
| I-AUTH-10 | `login()` with wrong password | redirect → `/login?error=<message>`, no session |
| I-AUTH-11 | `login()` with correct credentials but CLIENT role | signed out, redirect → `/login?error=unauthorized` |
| I-AUTH-12 | `portalLogin()` mirror of I-AUTH-11 for a DISPATCHER logging into the portal | signed out, redirect → `/portal/login?error=unauthorized` |
| I-AUTH-13 | `signOut()` / `portalSignOut()` clear the session and redirect appropriately | as described |

### E2E (Playwright) — see also Spec 06

| ID | Flow |
|---|---|
| E-AUTH-01 | Dispatcher logs in at `/login`, lands on `/dashboard`, sees KPI cards |
| E-AUTH-02 | Client logs in at `/portal/login`, lands on `/portal/requests` |
| E-AUTH-03 | Client visiting `/dashboard` directly via URL gets bounced to `/portal/login?error=unauthorized` |

## Open item to resolve during implementation

Middleware logs `console.log` on every single request (pathname, user id, role), and `login()`
logs email + role on every attempt. Recommend a quick `bugfix/remove-debug-logging` branch before
or alongside this test wave — not a test itself, but it will otherwise spam test output and (more
importantly) is logging user identifiers in what may become a shared/CI log stream.
