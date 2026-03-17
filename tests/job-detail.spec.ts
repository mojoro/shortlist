import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("Job detail (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("navigating from dashboard to job detail", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });

    // Get the job title for later verification
    const titleText = await firstCard
      .getByRole("heading", { level: 2 })
      .textContent();

    // Click the card to navigate
    await firstCard.click();

    // Should navigate to /jobs/[id]
    await page.waitForURL(/\/jobs\//, { timeout: 10_000 });

    // Job detail should show the title
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      titleText!.split("@")[0].trim()
    );
  });

  test("job detail shows score badge", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.waitForURL(/\/jobs\//, { timeout: 10_000 });

    // Should have a score badge with a label (Strong/Good/Weak match)
    const scoreSection = page.locator("text=/Strong match|Good match|Weak match/i");
    await expect(scoreSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test("job detail shows match and gap points", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.waitForURL(/\/jobs\//, { timeout: 10_000 });

    // Match points section uses heading "Why it fits" and gap section uses "Gaps to address"
    const matchSection = page.getByText(/why it fits|gaps to address/i).first();
    await expect(matchSection).toBeVisible({ timeout: 10_000 });
  });

  test("tailor button links to tailor page", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.waitForURL(/\/jobs\//, { timeout: 10_000 });

    const tailorLink = page.getByRole("link", { name: /tailor/i });
    await expect(tailorLink).toBeVisible({ timeout: 10_000 });
    const href = await tailorLink.getAttribute("href");
    expect(href).toMatch(/\/tailor\//);
  });

  test("back navigation returns to dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.waitForURL(/\/jobs\//, { timeout: 10_000 });

    await page.goBack();
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("article").first()).toBeVisible({ timeout: 15_000 });
  });
});
