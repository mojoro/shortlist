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

  test("shows notes preview or empty placeholder on cards", async ({
    page,
  }) => {
    const hasPreview = (await page.getByTestId("card-notes-preview").count()) > 0;
    const hasEmpty = (await page.getByTestId("card-notes-empty").count()) > 0;

    // Every card should have one or the other
    expect(hasPreview || hasEmpty).toBeTruthy();

    if (hasPreview) {
      const preview = page.getByTestId("card-notes-preview").first();
      await expect(preview).toBeVisible();
      await expect(preview).toHaveCSS("-webkit-line-clamp", "2");
    }

    if (hasEmpty) {
      const placeholder = page.getByTestId("card-notes-empty").first();
      await expect(placeholder).toBeVisible();
      await expect(placeholder).toHaveText(/Add notes/);
    }
  });

  test("clicking empty placeholder opens editor directly", async ({
    page,
  }) => {
    const placeholder = page.getByTestId("card-notes-empty").first();
    // Skip if all cards have notes (no empty placeholder)
    if ((await page.getByTestId("card-notes-empty").count()) === 0) return;

    await placeholder.click();
    const editor = page.getByTestId("card-notes-editor").first();
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
  });

  test("typing in editor and pressing Escape saves and collapses", async ({
    page,
  }) => {
    // Open editor via empty placeholder or preview
    const hasEmpty = (await page.getByTestId("card-notes-empty").count()) > 0;
    const hasPreview = (await page.getByTestId("card-notes-preview").count()) > 0;

    if (hasEmpty) {
      await page.getByTestId("card-notes-empty").first().click();
    } else if (hasPreview) {
      await page.getByTestId("card-notes-preview").first().click();
      await page.getByTestId("card-notes-expanded").first().click();
    } else {
      return; // No cards to test
    }

    const editor = page.getByTestId("card-notes-editor").first();
    await expect(editor).toBeVisible();

    // Type something
    await editor.fill("Test note from Playwright");
    await expect(editor).toHaveValue("Test note from Playwright");

    // Escape should dismiss the editor
    await page.keyboard.press("Escape");
    await expect(editor).toBeHidden();

    // The notes preview should now show the typed text
    const preview = page.getByTestId("card-notes-preview").first();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("Test note from Playwright");
  });

  test("clicking preview expands to show full notes then editing works", async ({
    page,
  }) => {
    // This test needs a card with existing notes — create one first if needed
    const hasPreview = (await page.getByTestId("card-notes-preview").count()) > 0;

    if (!hasPreview) {
      // Seed a note via the empty placeholder first
      const hasEmpty = (await page.getByTestId("card-notes-empty").count()) > 0;
      if (!hasEmpty) return;
      await page.getByTestId("card-notes-empty").first().click();
      const editor = page.getByTestId("card-notes-editor").first();
      await editor.fill("Seeded note for expand test");
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("card-notes-preview").first()).toBeVisible();
    }

    // Now test the expand flow
    const preview = page.getByTestId("card-notes-preview").first();
    await preview.click();

    const expanded = page.getByTestId("card-notes-expanded").first();
    await expect(expanded).toBeVisible();

    // Click expanded to edit
    await expanded.click();
    const editor = page.getByTestId("card-notes-editor").first();
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();

    const value = await editor.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});
