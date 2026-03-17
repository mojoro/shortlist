import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("Navigation (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("dashboard to pipeline via nav", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for the filter group which renders immediately from cached stats,
    // rather than waiting for Suspense-streamed job cards
    await page.waitForSelector("[aria-label='Filter jobs']", { timeout: 30_000 });

    await page.getByRole("link", { name: "Pipeline" }).click();
    await page.waitForURL(/\/pipeline/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Your pipeline" })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("pipeline to dashboard via nav", async ({ page }) => {
    await page.goto("/pipeline");
    await expect(
      page.getByRole("heading", { name: "Your pipeline" })
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("link", { name: "Feed", exact: true }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
  });

  test("dashboard to tailor via card link", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });

    const tailorLink = firstCard.getByRole("link", { name: /tailor/i });
    if (await tailorLink.isVisible()) {
      await tailorLink.click();
      await page.waitForURL(/\/tailor\//, { timeout: 10_000 });
      // Tailor page should show generate or editor state
      await expect(
        page.getByText(/generate|tailoring|editor/i).first()
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("dashboard to job detail and back", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await firstCard.click();
    await page.waitForURL(/\/jobs\//, { timeout: 10_000 });

    // Navigate back via AppNav (exact: true avoids matching "Back to feed" on job-not-found state)
    await page.getByRole("link", { name: "Feed", exact: true }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
  });
});
