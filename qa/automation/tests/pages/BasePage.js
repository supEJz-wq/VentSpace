// tests/pages/BasePage.js — parent for all page objects. Specs never call page.goto with full URLs.
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   * USE: pass the spec's `page` fixture — stores it for all child pages.
   */
  constructor(page) {
    this.page = page;
  }

  // USE: open any route, e.g. `await landing.open()` calls `goto('/')`.
  // Navigates baseURL-relative (never hardcode localhost) and waits for async data.
  async goto(path) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  // USE: reset browser state between tests needing fresh locks/devices.
  // Clears localStorage (device id, my posts, theme).
  async clearAppStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }
}
