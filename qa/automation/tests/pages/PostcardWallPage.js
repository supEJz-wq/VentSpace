// tests/pages/PostcardWallPage.js — Postcard Wall at /postcard-wall (frontend/src/Pages/PostcardWallPage.jsx).
// USE: search To/From, open minis into the full modal, assert counts/pagination.
// NOTE: wall search covers To/From only (message bodies never match) — asserted in WALL-2.
import { BasePage } from './BasePage.js';

export class PostcardWallPage extends BasePage {
  // Wires search rows, count text, mini grid and the create button.
  constructor(page) {
    super(page);
    this.page = page;
    this.searchInputs = page.getByPlaceholder(/search by name/i);
    this.countText = page.getByText(/\d+ postcards?/);
    this.minis = page.locator('.postcard-tilt');
    this.createButton = page.getByRole('button', { name: /create postcard/i });
    this.modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Posted on' });
  }

  // Opens the wall. Every wall test starts here.
  async open() {
    await this.goto('/postcard-wall');
  }

  // Searches To/From names. Message bodies never match (page filters to/from only).
  async search(term) {
    await this.searchInputs.first().fill(term);
  }

  // Clears the search (X chip or empty fill). Resets the grid and page 1.
  async clearSearch() {
    await this.searchInputs.first().fill('');
  }

  // Opens a mini card into the full modal by its visible text.
  async openMini(text) {
    await this.minis.filter({ hasText: text }).first().click();
  }

  // Closes the full modal via its X button (first button, top-right, icon-only).
  async closeModal() {
    await this.modal.getByRole('button').first().click();
  }

  // Clicks the backdrop to dismiss the modal (outer padding, inner card stops propagation).
  async dismissModalByBackdrop() {
    await this.modal.click({ position: { x: 12, y: 12 } });
  }
}
