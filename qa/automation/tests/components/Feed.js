// tests/components/Feed.js — feed cards + empty/loading states (frontend/src/Components/Feed.jsx).
// USE: `await dashboard.feed.expectLoaded()` after `open()`; `expectPostVisible({...})` after creating;
// `expectCount(n)` + `expectAllContainMood(m)` after filtering in DASH-F2.
import { expect } from '@playwright/test';

export class Feed {
  // USE: wires the 3 feed states once — loading spinner, post cards (scoped by time label), empty branch.
  constructor(page) {
    this.page = page;
    this.cards = page.locator('.glass-card').filter({ hasText: /h ago|Just now/ });
    this.emptyState = page.getByText('No thoughts yet');
    this.loadingSpinner = page.getByText('Loading thoughts...');
  }

  // USE: call right after `dashboard.open()`. Waits out the spinner, then asserts cards exist —
  // or the empty state when the DB is clean. Returns the card count.
  async expectLoaded() {
    await this.loadingSpinner.waitFor({ state: 'detached' }).catch(() => {});
    const count = await this.cards.count();
    if (count === 0) {
      await expect(this.emptyState).toBeVisible();
    }
    return count;
  }

  // USE: assert exact visible count after a filter, e.g. `expectCount(1)` in DASH-F2.
  async expectCount(n) {
    await expect(this.cards).toHaveCount(n);
  }

  // USE: assert every visible card carries the mood pill, e.g. `expectAllContainMood('Happy')`.
  async expectAllContainMood(mood) {
    const count = await this.cards.count();
    for (let i = 0; i < count; i++) {
      await expect(this.cards.nth(i)).toContainText(mood);
    }
  }

  // USE: build a scoped locator for one post. Name+text+mood must all match (avoids duplicate-name hits).
  postCard({ name, text, mood }) {
    return this.cards
      .filter({ hasText: name })
      .filter({ hasText: text })
      .filter({ hasText: mood });
  }

  // USE: assert a just-created post appears. Used for verifying DASH-P1/P2 creation results.
  // Generous timeout: creation needs a full server roundtrip before the card renders.
  async expectPostVisible({ name, text, mood }) {
    await expect(this.postCard({ name, text, mood })).toBeVisible({ timeout: 15000 });
  }
}
