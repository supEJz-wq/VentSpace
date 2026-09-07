// tests/pages/AdminPage.js — admin console at /admin (frontend/src/Pages/Admin.jsx + Components/Admin/*).
// USE: `loginAsAdmin()` first (password from ADMIN_PASSWORD env), then `openTab()` + section helpers.
// Destructive quick actions (nuclear, delete-alls) stay API-tested in P3 — UI covers purge + tables + settings.
// Dialogs: every confirm/alert/prompt needs `page.on('dialog', accept)` before the click (auto-accept helper below).
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class AdminPage extends BasePage {
  // Wires login form, nav tabs, stats, quick actions, tables and settings controls.
  constructor(page) {
    super(page);
    this.page = page;
    this.passwordInput = page.locator('input[type="password"]');
    this.enterButton = page.getByRole('button', { name: /enter dashboard|verifying/i });
    this.loginError = page.getByText('Incorrect password. Access denied.');
    this.commandTitle = page.getByRole('heading', { name: 'Command Center' });
    this.statPosts = page.getByText('Total Posts');
    this.purgeButton = page.getByRole('button', { name: 'Purge Expired' });
    this.postsSearch = page.getByPlaceholder('Search name or content...');
    this.reportedTab = page.getByRole('button', { name: /reported/i });
    this.feedbackSearch = page.getByPlaceholder('Search by name or content...');
    this.postcardsSearch = page.getByPlaceholder('Search To, From, Message...');
    this.mapNotesSearch = page.getByPlaceholder('Search name, message, coords...');
    this.hoursSlider = page.locator('input[type="range"]');
    this.wordInput = page.getByPlaceholder('Add word...');
    this.logoutButton = page.getByRole('button', { name: 'Log out' });
  }

  // Opens the console. Every admin test starts here.
  async open() {
    await this.goto('/admin');
  }

  // Logs in with the env password (dotenv-loaded). Waits for the console — the token roundtrip
  // takes a beat, and tab clicks before it land on the login form. Used by every authenticated test.
  async loginAsAdmin() {
    await this.passwordInput.fill(process.env.ADMIN_PASSWORD);
    await this.enterButton.click();
    await expect(this.commandTitle).toBeVisible({ timeout: 15000 });
  }

  // Attempts login with a guess. Used for the wrong-password check (ADM-1).
  async tryLogin(password) {
    await this.passwordInput.fill(password);
    await this.enterButton.click();
  }

  // Accepts all dialogs (confirm/alert/prompt) for destructive admin clicks. Call before clicking.
  async acceptDialogs() {
    await this.page.on('dialog', (d) => d.accept().catch(() => {}));
  }

  // Opens a console tab: Dashboard/Posts/Map Notes/Postcards/Feedback/Settings/Guidelines.
  // Prefix match: tabs carry count badges (`Posts 12`), so exact names never hit.
  async openTab(name) {
    await this.page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
  }

  // Deletes the first post row matching text (confirm auto-accepted). Used for moderation tests.
  async deletePostRow(text) {
    const row = this.page.locator('tr', { hasText: text }).first();
    await row.getByTitle('Delete Post').click();
  }

  // Deletes the first feedback row matching text (confirm auto-accepted).
  async deleteFeedbackRow(text) {
    const row = this.page.locator('tr', { hasText: text }).first();
    await row.getByTitle('Delete report').click();
  }

  // Deletes the first postcard row matching text (confirm auto-accepted).
  async deletePostcardRow(text) {
    const row = this.page.locator('tr', { hasText: text }).first();
    await row.getByTitle('Delete Postcard').click();
  }

  // Deletes the first map-note row matching text (no confirm on single delete).
  async deleteMapNoteRow(text) {
    const row = this.page.locator('tr', { hasText: text }).first();
    await row.getByTitle('Delete Note').click();
  }

  // Sets auto-delete hours via the slider (1-72 UI range; API allows to 168).
  async setHours(value) {
    await this.hoursSlider.fill(String(value));
  }

  // Adds a blacklist word chip (Plus submits the inline form).
  async addWord(word) {
    await this.wordInput.fill(word);
    await this.wordInput.press('Enter');
  }
}
