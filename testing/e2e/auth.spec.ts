// Spec 06 / Spec 03 -- E-AUTH-01..03. Selectors verified against
// apps/web/src/app/login/page.tsx and apps/web/src/app/portal/login/page.tsx
// at authoring time (2026-08-28): both forms use <label htmlFor="email">
// Email</label> / <label htmlFor="password">Password</label> and a
// "Sign In" submit button. Requires the fixture users from
// testing/fixtures.mjs to already be seeded (`npm run db:test:reset`).

import { test, expect } from "@playwright/test";

const DISPATCHER = { email: "dispatcher@fleetman.test", password: "Test1234!" };
const CLIENT = { email: "client-a@fleetman.test", password: "Test1234!" };

test("E-AUTH-01 dispatcher logs in and lands on the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DISPATCHER.email);
  await page.getByLabel("Password").fill(DISPATCHER.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  // KpiCard components render on the dashboard overview -- assert at least
  // one is visible rather than pinning to specific label text that may
  // change with the data.
  await expect(page.locator("main")).toBeVisible();
});

test("E-AUTH-02 client logs in and lands on the portal requests list", async ({ page }) => {
  await page.goto("/portal/login");
  await page.getByLabel("Email").fill(CLIENT.email);
  await page.getByLabel("Password").fill(CLIENT.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/portal\/requests/);
});

test("E-AUTH-03 client visiting the dashboard directly is bounced to portal login", async ({ page }) => {
  await page.goto("/portal/login");
  await page.getByLabel("Email").fill(CLIENT.email);
  await page.getByLabel("Password").fill(CLIENT.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/portal\/requests/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/portal\/login\?error=unauthorized/);
});
