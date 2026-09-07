// tests/specs/api/health.api.spec.js — API-HEALTH. Runs in the `api` project (no browser).
// Fixture used: Playwright `request` (backend http://localhost:3001 via webServer).
import { test, expect } from '@playwright/test';

test.describe('API health @api @smoke', () => {
  // API-HEALTH (smoke): backend liveness probe. Gate test — if this fails, no UI/API suite is meaningful.
  // Covers: GET /api/health → HTTP 2xx → body { ok:true, uptime:number }.
  test('API-HEALTH GET /api/health returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
