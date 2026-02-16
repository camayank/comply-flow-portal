/**
 * Health Check E2E Tests
 *
 * Verifies system health endpoints are working
 */

import { test, expect } from '@playwright/test';

test.describe('Health Checks', () => {
  test('basic health check returns ok', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('detailed health check returns system info', async ({ request }) => {
    const response = await request.get('/health/detailed');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toMatch(/ok|degraded/);
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
    expect(body.checks.memory).toBeDefined();
  });

  test('ready endpoint confirms system is ready', async ({ request }) => {
    const response = await request.get('/ready');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.ready).toBe(true);
  });

  test('live endpoint confirms system is alive', async ({ request }) => {
    const response = await request.get('/live');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.alive).toBe(true);
  });
});
