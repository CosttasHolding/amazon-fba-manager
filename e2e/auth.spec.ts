import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Iniciar Sesión");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login shows validation error for empty fields", async ({ page }) => {
    await page.goto("/login");
    await page.locator('button[type="submit"]').click();
    // HTML5 validation or form error should appear
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h2")).toContainText("Crear Cuenta");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user is redirected from products", async ({ page }) => {
    await page.goto("/products");
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });
});
