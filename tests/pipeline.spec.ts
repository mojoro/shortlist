import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("Pipeline (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("loads with heading and stats", async ({ page }) => {
    await page.goto("/pipeline");
    await expect(
      page.getByRole("heading", { name: "Your pipeline" })
    ).toBeVisible({ timeout: 15_000 });

    // Stats row — each stat is a <p> label inside a StatCard div.
    // Use exact match to avoid colliding with tab buttons and heading text.
    await expect(page.locator("p", { hasText: /^Active$/ })).toBeVisible();
    await expect(page.locator("p", { hasText: /^Applied$/ })).toBeVisible();
    await expect(page.locator("p", { hasText: /^Interviewing$/ })).toBeVisible();
  });

  test("application table renders with job titles", async ({ page }) => {
    await page.goto("/pipeline");
    const table = page.getByRole("table");
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Table should have column headers
    await expect(table.getByRole("columnheader", { name: "Job" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Status" })).toBeVisible();

    // Should have at least one row with a job title
    const rows = table.getByRole("row");
    // First row is header, so at least 2 rows means we have data
    expect(await rows.count()).toBeGreaterThan(1);
  });

  test("status select has expected options", async ({ page }) => {
    await page.goto("/pipeline");
    // Wait for either the table or the empty state to render
    await page.waitForSelector("table, [id='pipeline-table']", { timeout: 15_000 });

    const firstSelect = page.getByRole("combobox").first();
    // If there are no active applications, there won't be a select
    if (await firstSelect.isVisible().catch(() => false)) {
      const options = firstSelect.getByRole("option");
      const optionTexts = await options.allTextContents();
      expect(optionTexts).toContain("Interested");
      expect(optionTexts).toContain("Applied");
      expect(optionTexts).toContain("Interviewing");
      expect(optionTexts).toContain("Offer");
      expect(optionTexts).toContain("Rejected");
    }
  });

  test("active/closed tab toggle works", async ({ page }) => {
    await page.goto("/pipeline");
    // Wait for the pipeline table container (always renders, even with empty state)
    await page.waitForSelector("[id='pipeline-table']", { timeout: 15_000 });

    const activeTab = page.getByRole("button", { name: /Active/i });
    const closedTab = page.getByRole("button", { name: /Closed/i });

    await expect(activeTab).toBeVisible();
    await expect(closedTab).toBeVisible();

    // Click Closed tab — content should change
    await closedTab.click();
    // If there are closed applications, a table appears; otherwise an empty state message.
    // Just verify the page didn't error out and the tab switched successfully.
    const hasTable = await page.getByRole("table").isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no closed applications/i).isVisible().catch(() => false);
    expect(hasTable || hasEmptyState).toBeTruthy();
  });
});
