// tests/specs/feedback.spec.js — P2-H feedback coverage (FB-1..FB-3).
// POM used: DashboardPage.feedback (openers, tabs, submit, success). API used: bug-reports list to
// confirm rows (admin Feedback tab asserts come in P4). Unique texts isolate parallel-safe runs.
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { BugReportModal } from '../components/BugReportModal.js';
import { uniqueText } from '../fixtures/testData.js';

test.describe('Feedback modal @regression', () => {
  // FB-1: both flavors open with the right copy and the mode switcher flips between them.
  // Covers: Got a Bug? → `Report a Bug`; switch → `Share an Idea`; back → bug copy again.
  test('FB-1 Bug and idea modes open and switch', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feedback.openBug();
    await expect(page.getByText('Report a Bug')).toBeVisible();
    await dashboard.feedback.suggestionTab.click();
    await expect(page.getByText('Share an Idea')).toBeVisible();
    await dashboard.feedback.bugTab.click();
    await expect(page.getByText('Report a Bug')).toBeVisible();
  });

  // FB-2: bug report with screenshot submits, succeeds, auto-closes, and persists server-side.
  // Covers: fill + PNG → Submit Bug Report → Success! → modal gone → row in GET /api/bug-reports.
  test('FB-2 Bug report with screenshot persists', async ({ page, request }) => {
    const text = uniqueText('bug report');
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feedback.openBug();
    await dashboard.feedback.submitReport({ text, screenshot: BugReportModal.pngShot() });
    await expect(dashboard.feedback.successHeading).toBeVisible({ timeout: 15000 });
    await expect(dashboard.feedback.successHeading).toBeHidden({ timeout: 10000 });
    const rows = await (await request.get('/api/bug-reports')).json();
    expect(rows.map((r) => r.text)).toContain(text);
  });

  // FB-2b: suggestion submits the same path under the idea type.
  // Covers: Have an Idea? → fill → Submit Idea → Success! → row with type suggestion.
  test('FB-2b Suggestion persists as idea type', async ({ page, request }) => {
    const text = uniqueText('bright idea');
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feedback.openIdea();
    await dashboard.feedback.submitReport({ text });
    await expect(dashboard.feedback.successHeading).toBeVisible({ timeout: 15000 });
    const rows = await (await request.get('/api/bug-reports')).json();
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ text, type: 'suggestion' })]));
  });

  // FB-3: empty text blocks submit in UI and is rejected by API.
  // Covers: blank → submit disabled; POST empty text → 400.
  test('FB-3 Empty report blocked in UI and API', async ({ page, request }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feedback.openBug();
    await expect(dashboard.feedback.submitButton).toBeDisabled();
    const res = await request.post('/api/bug-reports', { data: { text: '', type: 'bug' } });
    expect(res.status()).toBe(400);
  });
});
