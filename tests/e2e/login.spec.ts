/**
 * Login Flow E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Staff Login', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"], input[type="text"]', 'invalid_user');
    await page.fill('input[type="password"]', 'wrong_password');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"], input[type="text"]', 'admin_test');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard|portal|admin|role)/, { timeout: 10000 });
  });

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/admin');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
