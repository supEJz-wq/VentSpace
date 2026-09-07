// tests/specs/postcard-wall.spec.js — P2-F wall coverage (WALL-1..WALL-6).
// POM used: PostcardWallPage (search/grid/modal). API used: postcardsApi dataset + totals + realtime seed.
// Serial mode: one file-level dataset (13 rows over 3 devices); totals are read live via API so
// creator-suite rows never break counts. Quadratic search quirk asserted: To/From match, messages don't.
import { test, expect } from '@playwright/test';
import { PostcardWallPage } from '../pages/PostcardWallPage.js';
import { seedWallDatasetFetch, getPostcards, sharePostcard } from '../api/postcardsApi.js';
import { globalReset } from '../helpers/cleanup.js';
import { uniqueName, uniqueText } from '../fixtures/testData.js';

test.describe.configure({ mode: 'serial' });

// Shared dataset: reset once, seed 13 rows (12/page → 2 pages guaranteed).
// Runs once for the file — creator suites may add rows later, totals stay live-read.
let TAG;
test.beforeAll(async () => {
  TAG = Date.now().toString(36);
  await globalReset();
  await seedWallDatasetFetch(TAG);
});

test.describe('Wall grid and search @regression', () => {
  // WALL-1: grid count matches the API total; page 1 fills to 12.
  // Covers: open → `N postcards` count → min(12, N) minis visible.
  test('WALL-1 Grid count matches API total', async ({ page, request }) => {
    const total = (await getPostcards(request)).length;
    expect(total).toBeGreaterThanOrEqual(13);
    const wall = new PostcardWallPage(page);
    await wall.open();
    await expect(page.getByText(`${total} postcards`)).toBeVisible({ timeout: 15000 });
    await expect(wall.minis).toHaveCount(Math.min(12, total));
  });

  // WALL-2: search filters To/From only — a verbatim message term matches nothing.
  // Covers: exact To → 1 mini + matching text; existing message text → 0 minis + empty state; clear restores.
  test('WALL-2 Search matches To/From, not messages', async ({ page, request }) => {
    const total = (await getPostcards(request)).length;
    const wall = new PostcardWallPage(page);
    await wall.open();
    await wall.search(`qa-wall-seed-3-${TAG}`);
    await expect(wall.minis).toHaveCount(1);
    await expect(page.getByText(/matching/).first()).toBeVisible();
    await wall.search(`wall seed message 7 ${TAG}`);
    await expect(wall.minis).toHaveCount(0);
    await expect(page.getByText('No postcards found')).toBeVisible();
    await wall.clearSearch();
    await expect(wall.minis).toHaveCount(Math.min(12, total));
  });
});

test.describe('Wall pagination and modal @regression', () => {
  // WALL-3: numbered pages split the wall at 12 per page.
  // Covers: totals live-read → page 2 holds total-12 → back to page 1 holds 12.
  test('WALL-3 Pagination splits wall at 12 per page', async ({ page, request }) => {
    const total = (await getPostcards(request)).length;
    expect(total).toBeGreaterThan(12);
    const wall = new PostcardWallPage(page);
    await wall.open();
    await expect(wall.minis).toHaveCount(12);
    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect(wall.minis).toHaveCount(total - 12);
    await page.getByRole('button', { name: '1', exact: true }).click();
    await expect(wall.minis).toHaveCount(12);
  });

  // WALL-4: minis open the full card with posted date; X and backdrop both close it.
  // Covers: click mini → `Posted on` + full To → X closes → reopen → backdrop closes.
  test('WALL-4 Full modal opens and closes', async ({ page }) => {
    const wall = new PostcardWallPage(page);
    await wall.open();
    await wall.search(`qa-wall-seed-0-${TAG}`);
    const to = `qa-wall-seed-0-${TAG}`;
    await wall.openMini(to);
    await expect(wall.modal).toContainText('Posted on');
    await expect(wall.modal).toContainText(to);
    await wall.closeModal();
    await expect(wall.modal).toBeHidden();
    await wall.openMini(to);
    await wall.dismissModalByBackdrop();
    await expect(wall.modal).toBeHidden();
  });
});

test.describe('Wall realtime and truncation @regression', () => {
  // WALL-5: a share elsewhere appears without reload via the realtime channel.
  // Covers: B on wall → API share unique To → B shows it within 20s, no reload.
  test('WALL-5 New share appears live on a second tab', async ({ browser, request }) => {
    test.setTimeout(60000);
    const to = uniqueName('qa-live-to');
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const wallB = new PostcardWallPage(pageB);
    await wallB.open();
    const { status } = await sharePostcard(request, { to, from: 'qa-live-from', message: 'live card' });
    expect(status).toBe(201);
    await expect(wallB.minis.filter({ hasText: to }).first()).toBeVisible({ timeout: 20000 });
    await ctxB.close();
  });

  // WALL-6: long messages truncate in minis (`…`) and read full in the modal.
  // Covers: 200-char seed → mini cut at 140 + `…` → modal shows the whole text.
  test('WALL-6 Long message truncates in mini, full in modal', async ({ page, request }) => {
    const to = uniqueName('qa-long-to');
    const message = `${uniqueText('longcard')} ${'y'.repeat(180)}`;
    const { status } = await sharePostcard(request, { to, from: 'qa-long-from', message });
    expect(status).toBe(201);
    const wall = new PostcardWallPage(page);
    await wall.open();
    await wall.search(to);
    const mini = wall.minis.filter({ hasText: to }).first();
    await expect(mini).toBeVisible({ timeout: 15000 });
    await expect(mini).toContainText('…');
    await expect(mini).not.toContainText(message);
    await wall.openMini(to);
    await expect(wall.modal).toContainText(message);
  });
});
