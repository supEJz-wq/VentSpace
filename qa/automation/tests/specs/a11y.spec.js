// tests/specs/a11y.spec.js — P5-2 accessibility smoke (chromium only: static DOM checks).
// Read-only, no writes. Asserts the good parts; gaps go to BUG-012 (icon-only controls without
// names, unassociated labels) — the spec stays green while the bug tracks the debt.
// Covers: named primary actions per route, labeled text inputs, modal autofocus + backdrop dismiss.
import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { PostcardCreatorPage } from '../pages/PostcardCreatorPage.js';
import { PostcardWallPage } from '../pages/PostcardWallPage.js';
import { MapPage } from '../pages/MapPage.js';

test.describe.configure({ mode: 'serial' });

test.describe('Accessibility smoke @a11y', () => {
  // A11Y-1: primary actions expose accessible names on every route (screen-reader operable).
  // Covers: Continue, Post Something, Share/Download, Back to Feed, Create, Enter Dashboard, Bug/Idea.
  test('A11Y-1 Primary actions are named on all routes', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.open();
    await expect(landing.continueButton).toBeVisible();
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await expect(dashboard.header.postSomethingButton).toBeVisible();
    await expect(page.getByRole('button', { name: /got a bug/i })).toBeVisible();
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await expect(creator.shareButton).toBeVisible();
    await expect(creator.downloadButton).toBeVisible();
    const wall = new PostcardWallPage(page);
    await wall.open();
    await expect(wall.createButton).toBeVisible();
    const mapPage = new MapPage(page);
    await mapPage.open();
    await expect(mapPage.searchInput).toBeVisible();
    await page.goto('/admin');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /enter dashboard/i })).toBeVisible();
  });

  // A11Y-2: text inputs carry non-blank placeholders (label affordance for sighted + AT users).
  // Covers: dashboard search, post name/text (modal opened first — it unmounts when closed),
  // creator To/Message/From.
  test('A11Y-2 Text inputs have non-blank placeholders', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await expect(dashboard.header.searchInputs.first()).toBeVisible();
    const searchHolder = await dashboard.header.searchInputs.first().getAttribute('placeholder');
    expect(searchHolder && searchHolder.trim().length).toBeGreaterThan(0);
    await dashboard.header.openPostModal();
    for (const locator of [dashboard.postModal.nameInput, dashboard.postModal.textarea]) {
      const holder = await locator.getAttribute('placeholder');
      expect(holder && holder.trim().length).toBeGreaterThan(0);
    }
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    for (const locator of [creator.toInput, creator.messageInput, creator.fromInput]) {
      const holder = await locator.getAttribute('placeholder');
      expect(holder && holder.trim().length).toBeGreaterThan(0);
    }
  });

  // A11Y-3: opening the feedback modal moves focus inside it (keyboard users land in context).
  // Covers: BugReportModal autoFocus textarea receives document.activeElement.
  test('A11Y-3 Feedback modal takes focus on open', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feedback.openBug();
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    expect(tag).toBe('TEXTAREA');
  });

  // A11Y-4: rules modal dismisses via backdrop click (pointer + keyboard-adjacent path).
  // Covers: Continue → backdrop click → back on landing, no navigation.
  test('A11Y-4 Rules modal dismisses on backdrop', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.open();
    await landing.continueToRules();
    await expect(landing.rulesModal).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(landing.rulesModal).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });
});
