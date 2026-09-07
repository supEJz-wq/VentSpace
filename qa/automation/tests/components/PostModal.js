// tests/components/PostModal.js — split out of old posting.js. Mirrors frontend/src/Components/PostModal.jsx.
// USE: `await dashboard.header.openPostModal()` first, then `await dashboard.postModal.createPost({ name, text, mood })`.
// For negative tests (DASH-P3/P4/P5) use the error locators directly.
export class PostModal {
  // USE: wires all modal controls + error states once — specs reuse them per test.
  // Scoped to the modal root: bare /happy/i would also match the sidebar filter button.
  constructor(page) {
    this.page = page;
    this.root = page.locator('div.fixed.inset-0').filter({ hasText: 'Share your thoughts' });
    this.nameInput = this.root.getByPlaceholder('Your name (Required)');
    this.textarea = this.root.getByPlaceholder("What's on your mind?");
    this.moodButton = (mood) => this.root.getByRole('button', { name: new RegExp(mood, 'i') });
    this.submitButton = this.root.getByRole('button', { name: /post anonymously/i });
    this.nameError = this.root.getByText('Your name is required.');
    this.rateLimitError = this.root.getByText(/rate limit reached/i);
    this.lockedBadge = this.root.getByText('Locked');
    this.charCounter = this.root.getByText(/\/300/);
    this.settledState = this.root.getByText(/name locks for 5 hours/i).or(this.root.getByText('Locked'));
  }

  // USE: call after opening the modal, before filling. Waits out the late settings round-trip
  // (autoDeleteHours 10 → 5 refires loadIdentity, which wipes a typed name when no identity exists),
  // then drains duplicate identity fetches (StrictMode double-fires the effect in dev and a late
  // second response resets the name field — real dev-only app flake, harmless in prod builds).
  async waitForSettled() {
    await this.settledState.first().waitFor({ state: 'visible' });
    for (let i = 0; i < 5; i++) {
      const resp = await this.page.waitForResponse(
        (r) => r.url().includes('/api/identity'),
        { timeout: 1000 },
      ).catch(() => null);
      if (!resp) break;
    }
  }

  // USE: full happy-path creation in one call (settle → focus → human-like typing → mood → submit). Default mood Happy.
  async createPost({ name, text, mood = 'Happy' }) {
    await this.waitForSettled();
    await this.nameInput.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(300);
    await this.nameInput.click();
    await this.nameInput.pressSequentially(name, { delay: 20 });
    await this.textarea.fill(text);
    await this.moodButton(mood).click();
    await this.submitButton.click();
  }
}

// Backwards-compatible alias for old `posting` import shape.
export { PostModal as posting };
