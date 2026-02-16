/**
 * Operations Flow E2E Tests
 */

import { test, expect } from '@playwright/test';

// Use ops authenticated state
test.use({ storageState: 'tests/e2e/.auth/ops.json' });

test.describe('Operations Work Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operations/work-queue');
  });

  test('work queue page loads', async ({ page }) => {
    // Check for work queue heading
    await expect(page.locator('text=/work queue|operations/i')).toBeVisible({ timeout: 10000 });
  });

  test('displays stats cards', async ({ page }) => {
    // Should have stats cards (Total, On Track, At Risk, etc.)
    const statsSection = page.locator('[class*="card"], [class*="stats"]').first();
    await expect(statsSection).toBeVisible({ timeout: 10000 });
  });

  test('work items table is visible', async ({ page }) => {
    // Should have a table or list of work items
    const table = page.locator('table, [role="table"], [class*="table"]');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('can filter by SLA status', async ({ page }) => {
    // Look for filter controls
    const filterControl = page.locator('select, [role="combobox"], [class*="filter"]').first();

    if (await filterControl.isVisible()) {
      await filterControl.click();
      // Should show filter options
      await expect(page.locator('text=/on track|at risk|breached/i')).toBeVisible();
    }
  });

  test('can view work item details', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr, [class*="work-item"]', { timeout: 10000 });

    // Click on first work item
    const firstItem = page.locator('table tbody tr, [class*="work-item"]').first();

    if (await firstItem.isVisible()) {
      // Find clickable element (button or link)
      const viewButton = firstItem.locator('button, a').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Should show detail view/modal
        await expect(page.locator('[role="dialog"], [class*="modal"], [class*="detail"]')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Operations Dashboard', () => {
  test('dashboard shows key metrics', async ({ page }) => {
    await page.goto('/operations');

    // Should have metrics/stats
    await expect(page.locator('text=/pending|in progress|completed|today/i')).toBeVisible({ timeout: 10000 });
  });
});
