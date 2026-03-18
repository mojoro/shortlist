import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("Kanban CardNotes (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/pipeline");

    // Wait for pipeline to load, then switch to board view
    await page.waitForSelector("[data-testid='view-toggle-board']", {
      timeout: 15_000,
    });
    await page.getByTestId("view-toggle-board").click();

    // Wait for board to render
    await expect(page.getByTestId("kanban-board")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("shows 2-line clamped notes preview by default", async ({ page }) => {
    const preview = page.getByTestId("card-notes-preview").first();
    await expect(preview).toBeVisible();

    // The element should have line-clamp-2 applied (CSS truncation)
    await expect(preview).toHaveCSS("-webkit-line-clamp", "2");
  });

  test("clicking preview expands to show full notes", async ({ page }) => {
    const preview = page.getByTestId("card-notes-preview").first();
    await preview.click();

    const expanded = page.getByTestId("card-notes-expanded").first();
    await expect(expanded).toBeVisible();

    // Expanded text should not be clamped
    await expect(expanded).not.toHaveCSS("-webkit-line-clamp", "2");
  });

  test("clicking expanded notes body opens inline editor", async ({
    page,
  }) => {
    // Expand first
    const preview = page.getByTestId("card-notes-preview").first();
    await preview.click();
    await expect(page.getByTestId("card-notes-expanded").first()).toBeVisible();

    // Click the expanded text to edit
    await page.getByTestId("card-notes-expanded").first().click();

    const editor = page.getByTestId("card-notes-editor").first();
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();

    // Editor should be pre-filled with the notes content
    const value = await editor.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("typing in editor updates the textarea value", async ({ page }) => {
    const preview = page.getByTestId("card-notes-preview").first();
    await preview.click();
    await page.getByTestId("card-notes-expanded").first().click();

    const editor = page.getByTestId("card-notes-editor").first();
    await editor.fill("Updated notes content");
    await expect(editor).toHaveValue("Updated notes content");
  });

  test("Escape dismisses editor and collapses back to preview", async ({
    page,
  }) => {
    const preview = page.getByTestId("card-notes-preview").first();
    await preview.click();
    await page.getByTestId("card-notes-expanded").first().click();
    await expect(page.getByTestId("card-notes-editor").first()).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Editor and expanded view should be gone
    await expect(page.getByTestId("card-notes-editor").first()).toBeHidden();
    await expect(
      page.getByTestId("card-notes-expanded").first()
    ).toBeHidden();

    // Preview should be visible again
    await expect(
      page.getByTestId("card-notes-preview").first()
    ).toBeVisible();
  });

  test("empty notes show placeholder and open editor on click", async ({
    page,
  }) => {
    // Find a card with empty notes (placeholder text)
    const placeholder = page.getByTestId("card-notes-empty");
    // Skip if no empty-notes cards exist in seed data
    if ((await placeholder.count()) === 0) return;

    await expect(placeholder.first()).toBeVisible();
    await expect(placeholder.first()).toHaveText(/Add notes/);

    // Clicking placeholder should open editor directly
    await placeholder.first().click();
    await expect(page.getByTestId("card-notes-editor").first()).toBeVisible();
  });
});
