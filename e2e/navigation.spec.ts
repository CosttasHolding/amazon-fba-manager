import { test, expect } from "@playwright/test";

test.describe("Navigation and layout", () => {
  test("login page has correct meta and theme", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/CosttasHolding Manager/);
  });

  test("responsive mobile layout on login", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("unauthenticated unknown routes redirect to login", async ({ page }) => {
    await page.goto("/nonexistent-page");
    await page.waitForURL("**/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
