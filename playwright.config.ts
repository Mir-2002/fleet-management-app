import { defineConfig, devices } from "@playwright/test";

// Spec 06 -- small, deliberate E2E slice. Points at a Next.js dev server
// that itself must be pointed at the LOCAL Supabase stack (apps/web/.env.local
// should be swapped to local URL/keys before running this against the local
// DB -- do NOT run E2E tests with .env.local pointed at the live project).
// Requires `npm run db:test:reset` first so the fixture users/trucks exist.
// NOT executed by the agent that wrote this file.

export default defineConfig({
  testDir: "./testing/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev --workspace=apps/web",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
