// tests/components/Header.js — fixed locators verified against frontend/src/Components/Header.jsx.
// Old header.js used input[placeholder="Search"] (stale) and "Post Card" (wrong).
// USE: `dashboard.header.search('...')` for filtering, `clearSearch()` to reset, `openPostModal()` to start creating.
export class Header {
  // USE: wires search + nav buttons once — covers desktop + mobile search rows.
  constructor(page) {
    this.page = page;
    this.searchInputs = page.getByPlaceholder(/search thoughts, moods, or topics/i);
    this.postcardButton = page.getByRole('button', { name: 'Postcard' });
    this.wallButton = page.getByRole('button', { name: 'Wall' });
    this.mapButton = page.getByRole('button', { name: 'Map' });
    this.postSomethingButton = page.getByRole('button', { name: /post something|^post$/i });
  }

  // USE: filter the feed, e.g. `await header.search('happy')`. Types into the first (desktop) search row.
  async search(term) {
    await this.searchInputs.first().fill(term);
  }

  // USE: reset an active search filter. Clicks ✕ when present, else clears the input.
  async clearSearch() {
    const clear = this.page.getByRole('button', { name: /clear search/i });
    if (await clear.first().isVisible().catch(() => false)) {
      await clear.first().click();
    } else {
      await this.searchInputs.first().fill('');
    }
  }

  // USE: begin the create-post flow. Opens PostModal from the header.
  async openPostModal() {
    await this.postSomethingButton.click();
  }
}

// Backwards-compatible lowercase alias.
export { Header as header };
