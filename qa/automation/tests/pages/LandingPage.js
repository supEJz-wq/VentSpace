// tests/pages/LandingPage.js — replaces old Lpage.js (hardcoded URL removed, uses baseURL).
// USE: entry-point tests (LAN-*). Create with `new LandingPage(page)`, then `open()` → `continueToRules()` → `acceptRules()`.
import { BasePage } from './BasePage.js';

export class LandingPage extends BasePage {
  // USE: wires the 3 landing controls once — specs just call the async methods below.
  constructor(page) {
    super(page);
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.rulesModal = page.getByText('Community Guidelines');
    this.agreeButton = page.getByRole('button', { name: /i agree & continue/i });
  }

  // USE: start every landing test here. Opens `/` via baseURL.
  async open() {
    await this.goto('/');
  }

  // USE: first click in the entry flow. Opens the rules modal.
  async continueToRules() {
    await this.continueButton.click();
  }

  // USE: second click in the entry flow. Accepts rules → app navigates to /home.
  async acceptRules() {
    await this.agreeButton.click();
  }
}

// Backwards-compatible alias for the old spec import name.
export { LandingPage as LPage };
