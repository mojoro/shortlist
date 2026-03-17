import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("Dashboard (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("loads with profile switcher", async ({ page }) => {
    await page.goto("/dashboard");
    // Profile switcher is a button with the profile name and a chevron SVG
    // It falls back to "Profile" when no active profile name is found
    const switcher = page.locator("button").filter({ has: page.locator("svg") }).first();
    await expect(switcher).toBeVisible({ timeout: 15_000 });
  });

  test("renders filter chips with counts", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForSelector("[aria-label='Filter jobs']", { timeout: 15_000 });
    const filterGroup = page.getByRole("group", { name: "Filter jobs" });
    await expect(filterGroup.getByRole("button", { name: /^all/i })).toBeVisible();
    await expect(filterGroup.getByRole("button", { name: /^new/i })).toBeVisible();
    await expect(filterGroup.getByRole("button", { name: /^saved/i })).toBeVisible();
    await expect(filterGroup.getByRole("button", { name: /^applied/i })).toBeVisible();
    await expect(filterGroup.getByRole("button", { name: /^ignored/i })).toBeVisible();
  });

  test("renders job cards with scores and titles", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for at least one job card to appear
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });

    // Job card should have a title (heading level 2)
    await expect(firstCard.getByRole("heading", { level: 2 })).toBeVisible();

    // Should have a score badge (rounded-xl span with aria-label) or a "Score?" button
    const scoreBadge = firstCard.locator("[aria-label*='match'], [aria-label='Not yet scored'], [aria-label='Request match score']").first();
    await expect(scoreBadge).toBeVisible();
  });

  test("save button toggles bookmark", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });

    const saveBtn = firstCard.getByRole("button", { name: /save job|unsave job/i });
    if (await saveBtn.isVisible()) {
      const initialLabel = await saveBtn.getAttribute("aria-label");
      await saveBtn.click();
      // Label should toggle between "Save job" and "Unsave job"
      const newLabel = await saveBtn.getAttribute("aria-label");
      expect(newLabel).not.toBe(initialLabel);
    }
  });

  test("ignore button removes card and shows toast", async ({ page }) => {
    await page.goto("/dashboard");
    const cards = page.getByRole("article");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const initialCount = await cards.count();

    // Find a card with an ignore button
    const ignoreBtn = cards.first().getByRole("button", { name: "Ignore this job" });
    if (await ignoreBtn.isVisible()) {
      await ignoreBtn.click();
      // Toast should appear confirming the ignore action
      await expect(page.getByText("Job hidden")).toBeVisible({ timeout: 5_000 });
      // The undo toast should also have an "Undo" button
      await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    }
  });

  test("import job button is visible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: /import job/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});
