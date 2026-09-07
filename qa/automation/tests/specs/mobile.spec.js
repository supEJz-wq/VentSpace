// tests/specs/mobile.spec.js — P5-1 mobile layout coverage (Pixel 5 / iPhone 12 projects only).
// Read-only: no writes, no seeds. Desktop projects ignore this file (see playwright.config.js).
// Covers: no horizontal overflow per route, sidebars collapse, mobile search rows show, modals fit.
import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { PostcardCreatorPage } from '../pages/PostcardCreatorPage.js';
import { MapPage } from '../pages/MapPage.js';

test.describe.configure({ mode: 'serial' });

// Fails on horizontal overflow — the classic small-screen breakage. 1px tolerance for subpixels.
async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('Mobile layout @mobile', () => {
  // MOB-1: landing fits 375px with the entry CTA reachable.
  // Covers: no overflow + Continue visible on a phone viewport.
  test('MOB-1 Landing fits small viewport', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.open();
    await expectNoOverflow(page);
    await expect(landing.continueButton).toBeVisible();
  });

  // MOB-2: dashboard collapses sidebars and shows the mobile search row.
  // Covers: Mood Filter/Recent Topics hidden + `div.sm:hidden` search input visible.
  test('MOB-2 Dashboard collapses sidebars, mobile search shows', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feed.expectLoaded();
    await expect(page.getByText('Mood Filter')).toBeHidden();
    await expect(page.getByText('Recent Topics')).toBeHidden();
    await expect(page.locator('div.sm\\:hidden input').first()).toBeVisible();
    await expectNoOverflow(page);
  });

  // MOB-3: post modal fits inside the phone viewport.
  // Covers: open PostModal → dialog box fully within viewport bounds.
  test('MOB-3 Post modal fits viewport', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.header.openPostModal();
    await expect(dashboard.postModal.nameInput).toBeVisible();
    const box = await dashboard.postModal.nameInput.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  });

  // MOB-4: map and creator stay usable at phone width.
  // Covers: map canvas + search visible; creator To input visible; no overflow on either.
  test('MOB-4 Map and creator usable at phone width', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.open();
    await expect(mapPage.canvas).toBeVisible();
    await expect(mapPage.searchInput).toBeVisible();
    await expectNoOverflow(page);
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await expect(creator.toInput).toBeVisible();
    await expectNoOverflow(page);
  });
});
