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

  test("view toggle is visible and switches between table and board", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForSelector("[data-testid='view-toggle-table']", { timeout: 15_000 });

    // Table toggle and board toggle both visible
    await expect(page.getByTestId("view-toggle-table")).toBeVisible();
    await expect(page.getByTestId("view-toggle-board")).toBeVisible();

    // Switch to board view
    await page.getByTestId("view-toggle-board").click();
    await expect(page.getByTestId("kanban-board")).toBeVisible();
    // Table should be gone
    await expect(page.getByRole("table")).toBeHidden();

    // Switch back to table view
    await page.getByTestId("view-toggle-table").click();
    await expect(page.getByRole("table")).toBeVisible({ timeout: 5_000 });
  });

  test("board view shows kanban columns with status headers", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForSelector("[data-testid='view-toggle-board']", { timeout: 15_000 });
    await page.getByTestId("view-toggle-board").click();
    await expect(page.getByTestId("kanban-board")).toBeVisible();

    // Verify column headers exist (desktop only — hidden on mobile)
    // Check for status labels within the board
    const board = page.getByTestId("kanban-board");
    await expect(board.getByText("Interested")).toBeVisible();
    await expect(board.getByText("Applied")).toBeVisible();
    await expect(board.getByText("Screening")).toBeVisible();
    await expect(board.getByText("Interviewing")).toBeVisible();
    await expect(board.getByText("Offer")).toBeVisible();
  });

  test("clicking a kanban card opens the application drawer", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForSelector("[data-testid='view-toggle-board']", { timeout: 15_000 });
    await page.getByTestId("view-toggle-board").click();
    await expect(page.getByTestId("kanban-board")).toBeVisible();

    // Find and click a draggable card
    const card = page.locator("[draggable='true']").first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await expect(
        page.locator("aside[aria-label='Application details']")
      ).toBeVisible({ timeout: 5_000 });
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
