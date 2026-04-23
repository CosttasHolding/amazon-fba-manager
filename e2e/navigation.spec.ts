import { test, expect } from "@playwright/test";

test.describe("Navigation and layout", () => {
  test("login page has correct meta and theme", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/FBA Manager|Login/);
  });

  test("responsive mobile layout on login", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/nonexistent-page");
    await expect(page.locator("text=404").or(page.locator("text=Not Found")).or(page.locator("text=No se encontr"))).toBeVisible();
  });
});
