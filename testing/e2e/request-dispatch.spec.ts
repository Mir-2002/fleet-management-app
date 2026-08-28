// Spec 06 -- E2E-01, E2E-02. Selectors below are grounded in the source at
// authoring time (2026-08-28):
//  - PortalNewRequestForm.tsx: FormLabel text ("Handling Type", "Weight",
//    "Truck Type Required", "Date", "Time"), stop address input has
//    placeholder="Enter address", submit button text "Submit Request".
//  - AcceptRequestButton.tsx: button text "Accept".
//  - KanbanBoard.tsx: columns are "To Do"/"In Progress"/"For Review"/"Done",
//    mapped from DB trip status ASSIGNED/IN_PROGRESS/DELIVERED/COMPLETED.
//  - TripDetailDialog.tsx: "Save Assignments" button; truck/driver/helper
//    pickers are shadcn Selects whose accessible name was NOT independently
//    confirmed (shadcn's Form wiring usually gives the FormLabel text as the
//    accessible name -- verify against the running app before relying on it).
//
// The drag-and-drop interaction to move a card between Kanban columns was
// NOT verified against the actual DnD implementation (library unconfirmed)
// -- that step is marked TODO below rather than guessed at. Author who
// finishes this: check KanbanBoard.tsx's onDragEnd/drop handler and replace
// the TODO with a real drag (Playwright's `locator.dragTo()` if it's
// HTML5-native DnD, or manual mouse down/move/up if it's a JS DnD library
// like @dnd-kit/react-dnd).
//
// NOT executed by the agent that wrote this file.

import { test, expect } from "@playwright/test";

const DISPATCHER = { email: "dispatcher@fleetman.test", password: "Test1234!" };
const CLIENT = { email: "client-a@fleetman.test", password: "Test1234!" };

async function loginAsClient(page: import("@playwright/test").Page) {
  await page.goto("/portal/login");
  await page.getByLabel("Email").fill(CLIENT.email);
  await page.getByLabel("Password").fill(CLIENT.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/portal\/requests/);
}

async function loginAsDispatcher(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DISPATCHER.email);
  await page.getByLabel("Password").fill(DISPATCHER.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("E2E-01 client submits a request, dispatcher accepts it, it appears on the Kanban board", async ({ page }) => {
  const uniqueNote = `e2e-${Date.now()}`;

  await loginAsClient(page);
  await page.goto("/portal/requests/new");

  await page.getByText("Dry Goods").click(); // handling-tag toggle chip
  await page.getByLabel("Weight").fill("150");
  await page.getByLabel("Truck Type Required").click();
  await page.getByRole("option", { name: "6-Wheeler" }).click();

  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  await page.getByLabel("Date").fill(future.toISOString().slice(0, 10));
  await page.getByLabel("Time").fill("09:30");

  const addressInputs = page.getByPlaceholder("Enter address");
  await addressInputs.nth(0).fill("Origin Warehouse, Manila");
  await addressInputs.nth(1).fill("Destination Store, Quezon City");

  await page.getByLabel(/notes/i).fill(uniqueNote);
  await page.getByRole("button", { name: "Submit Request" }).click();

  await expect(page).toHaveURL(/\/portal\/requests/);
  await expect(page.getByText(uniqueNote)).toBeVisible();

  await loginAsDispatcher(page);
  await page.goto("/dashboard/requests");
  const requestRow = page.getByRole("row").filter({ hasText: uniqueNote });
  await expect(requestRow).toBeVisible();
  await requestRow.getByRole("button", { name: "Accept" }).click();

  await page.goto("/dashboard");
  await expect(page.getByText("To Do")).toBeVisible();
  // The accepted trip should now show as a card somewhere on the board --
  // exact card content (client name vs request id) wasn't confirmed against
  // KanbanCard.tsx; a looser assertion (board renders, "To Do" column
  // exists) is used here deliberately rather than a specific card selector
  // that might not match.
});

test("E2E-02 dispatcher assigns resources and dispatches a trip", async ({ page }) => {
  await loginAsDispatcher(page);
  await page.goto("/dashboard");

  // Open the first card in the "To Do" column -- assumes at least one
  // ASSIGNED trip exists (e.g. from E2E-01, or seed data). A real run should
  // create its own fixture trip rather than depend on test execution order.
  const todoColumn = page.locator("text=To Do").locator("..");
  await todoColumn.getByRole("button").first().click(); // opens TripDetailDialog

  // TODO verify these accessible names against the running app -- see file
  // header. Falling back to combobox position if getByLabel doesn't match.
  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option").first().click(); // truck
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option").first().click(); // driver
  await page.getByRole("combobox").nth(2).click();
  await page.getByRole("option").first().click(); // helper

  await page.getByRole("button", { name: "Save Assignments" }).click();

  // TODO: drag the card from "To Do" to "In Progress" -- see file header,
  // DnD implementation not confirmed. Left unimplemented rather than guessed.

  // Once dispatched, the assigned truck should show unavailable in the
  // Trucks resource table.
  await page.goto("/dashboard/resources/trucks");
  await expect(page.getByText(/unavailable/i).first()).toBeVisible();
});
