import { test, expect } from "@playwright/test";

const EMAIL = "admin@velearien.test";
const PASSWORD = "adminadmin";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/timer$/);
}

test.describe("auth", () => {
  test("rejects a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator(".auth-error")).toContainText("Wrong email or password");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("redirects an unauthenticated visitor to login", async ({ page }) => {
    await page.goto("/timer");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("study session flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("start, break, resume, stop, then see it in the study log", async ({ page }) => {
    // Idle state: only the Start button, no status pill visible.
    await expect(page.locator(".status-pill")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Start Timer" })).toBeVisible();

    // Start a session for a specific subject.
    await page.getByRole("button", { name: "Start Timer" }).click();
    await page.getByRole("button", { name: "Physics", exact: true }).click();

    await expect(page.locator(".status-pill")).toContainText("Studying");
    await expect(page.locator(".subject-name")).toContainText("Physics");
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();

    // Break -> card should flag itself visually and swap the pill/label.
    await page.getByRole("button", { name: "Break" }).click();
    await expect(page.locator(".status-pill")).toContainText("On Break");
    await expect(page.locator(".timer-card")).toHaveClass(/on-break/);

    // Resume.
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.locator(".status-pill")).toContainText("Studying");
    await expect(page.locator(".timer-card")).not.toHaveClass(/on-break/);

    // Stop requires confirmation before it actually finalizes.
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByText("Are you sure you're done")).toBeVisible();
    await page.getByRole("button", { name: "Keep studying" }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible(); // still running

    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByRole("button", { name: "Yes, I'm done" }).click();

    // Back to idle.
    await expect(page.getByRole("button", { name: "Start Timer" })).toBeVisible();
    await expect(page.locator(".status-pill")).not.toBeVisible();

    // Now check it landed in the Study Log.
    await page.getByRole("link", { name: "Study Log" }).click();
    await expect(page).toHaveURL(/\/log$/);

    const sessionCard = page.locator(".session-card", { hasText: "Physics" }).first();
    await expect(sessionCard).toBeVisible();
    await expect(sessionCard.locator(".stat-value")).toBeVisible();

    // Charts render (Chart.js draws into a <canvas>).
    await expect(page.locator(".chart-box canvas").first()).toBeVisible();
  });

  test("can add a brand new subject from the picker", async ({ page }) => {
    const uniqueName = `Test Subject ${Date.now()}`;
    await page.getByRole("button", { name: "Start Timer" }).click();
    await page.getByPlaceholder("Add new subject...").fill(uniqueName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByRole("button", { name: uniqueName, exact: true })).toBeVisible();

    await page.getByRole("button", { name: uniqueName, exact: true }).click();
    await expect(page.locator(".subject-name")).toContainText(uniqueName);

    // Clean up: stop the session so we don't leave an active timer for other tests.
    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByRole("button", { name: "Yes, I'm done" }).click();
  });

  test("study log filters narrow the session list", async ({ page }) => {
    await page.goto("/log");
    await page.locator(".filter-fab").click();
    await page.getByRole("button", { name: "Physics", exact: true }).click();
    await page.getByRole("button", { name: "Done" }).click();

    const cards = page.locator(".session-card");
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText("Physics");
    }
  });
});
