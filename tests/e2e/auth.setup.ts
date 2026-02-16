/**
 * Authentication Setup
 *
 * Creates authenticated sessions for different user roles
 */

import { test as setup, expect } from '@playwright/test';

const TEST_USERS = {
  admin: { username: 'admin_test', password: 'Test@123' },
  ops: { username: 'ops_exec_test', password: 'Test@123' },
  sales: { username: 'sales_mgr_test', password: 'Test@123' },
};

// Admin user auth state
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');

  // Fill login form
  await page.fill('input[name="username"], input[type="text"]', TEST_USERS.admin.username);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.admin.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard|portal|admin)/);

  // Save auth state
  await page.context().storageState({ path: 'tests/e2e/.auth/admin.json' });
});

// Ops user auth state
setup('authenticate as ops', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="username"], input[type="text"]', TEST_USERS.ops.username);
  await page.fill('input[name="password"], input[type="password"]', TEST_USERS.ops.password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/(dashboard|portal|operations)/);

  await page.context().storageState({ path: 'tests/e2e/.auth/ops.json' });
});
