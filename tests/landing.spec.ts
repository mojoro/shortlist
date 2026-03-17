import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("Landing page (public)", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("renders headline", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Get on the"
    );
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "shortlist"
    );
  });

  test("shows sign-up and sign-in CTAs", async ({ page }) => {
    await page.goto("/");
    const getStarted = page.getByRole("link", { name: "Get started free" });
    const signIn = page.getByRole("link", { name: "Sign in" });

    await expect(getStarted.first()).toBeVisible();
    await expect(signIn.first()).toBeVisible();
    await expect(getStarted.first()).toHaveAttribute("href", "/sign-up");
    await expect(signIn.first()).toHaveAttribute("href", "/sign-in");
  });

  test("renders feature sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Matched.")).toBeVisible();
    await expect(page.getByText("Analyzed.")).toBeVisible();
    await expect(page.getByText("Tailored.")).toBeVisible();
    await expect(page.getByText("Tracked.")).toBeVisible();
  });

  test("renders bottom CTA", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Start your search/i })
    ).toBeVisible();
  });

  test("renders footer with app name", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Shortlist");
  });
});
