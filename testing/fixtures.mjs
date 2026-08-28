// Shared wave-1 test fixtures — one source of truth for both the local-DB
// seed script (supabase/seed.test.mjs, plain Node ESM) and the RLS /
// integration test harness (testing/rls/_helpers.ts, TypeScript via Vitest).
// Plain JS on purpose so both can import it without a build step.

export const FIXTURE_PASSWORD = "Test1234!";

// Two of each non-dispatcher role so cross-user RLS isolation ("can't see
// someone else's record") has something real to assert against.
export const FIXTURE_USERS = {
  dispatcher: {
    email: "dispatcher@fleetman.test",
    password: FIXTURE_PASSWORD,
    fullName: "Dispatcher Dana",
    role: "DISPATCHER",
  },
  clientA: {
    email: "client-a@fleetman.test",
    password: FIXTURE_PASSWORD,
    fullName: "Client Alpha",
    role: "CLIENT",
  },
  clientB: {
    email: "client-b@fleetman.test",
    password: FIXTURE_PASSWORD,
    fullName: "Client Beta",
    role: "CLIENT",
  },
  driverA: {
    email: "driver-a@fleetman.test",
    password: FIXTURE_PASSWORD,
    fullName: "Driver Alpha",
    role: "DRIVER",
    licenseNumber: "DL-0001",
  },
  driverB: {
    email: "driver-b@fleetman.test",
    password: FIXTURE_PASSWORD,
    fullName: "Driver Beta",
    role: "DRIVER",
    licenseNumber: "DL-0002",
  },
  helperA: {
    email: "helper-a@fleetman.test",
    password: FIXTURE_PASSWORD,
    fullName: "Helper Alpha",
    role: "HELPER",
  },
  helperB: {
    email: "helper-b@fleetman.test",
    password: FIXTURE_PASSWORD,
    fullName: "Helper Beta",
    role: "HELPER",
  },
};

export const FIXTURE_TRUCKS = [
  { plateNumber: "TEST-AVAIL-01", truckType: "LIGHT_TRUCK", isAvailable: true },
  { plateNumber: "TEST-AVAIL-02", truckType: "HEAVY_TRUCK", isAvailable: true },
  { plateNumber: "TEST-BUSY-01", truckType: "LIGHT_TRUCK", isAvailable: false },
];
