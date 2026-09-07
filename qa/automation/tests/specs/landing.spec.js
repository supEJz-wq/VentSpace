// tests/specs/landing.spec.js — LAN-1 smoke. Replaces old landingPage.spec.js (assert was commented out).
// POM used: LandingPage.open() for opening, continueToRules() for opening modal, acceptRules() for accepting.
import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage.js';

test.describe('Landing page @smoke', () => {
  // LAN-1 (smoke): entry flow gates on rules then lands on feed.
  // Covers: Continue opens RulesModal (Community Guidelines) → Agree → URL becomes /home.
  test('LAN-1 Continue opens rules and accepts to /home', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.open();
    await landing.continueToRules();
    await expect(landing.rulesModal).toBeVisible();
    await landing.acceptRules();
    await expect(page).toHaveURL(/\/home/);
  });
});
