// tests/components/MoodFilter.js — 7 moods from frontend/src/Data/mockData.js.
// USE: `await dashboard.moodFilter.select('Happy')` to filter; `countFor('Happy')` to read the sidebar badge.

export class MoodFilter {
  // USE: wires the 7 sidebar buttons once — specs pick them via `select()` / `countFor()` below.
  // Scoped to the Mood Filter card: bare /happy/i matches sidebar + card pills elsewhere.
  constructor(page) {
    this.page = page;
    this.root = page.locator('div.glass-card').filter({ hasText: 'Mood Filter' });
    this.allThoughts = this.root.getByRole('button', { name: /all thoughts/i });
    this.myPosts = this.root.getByRole('button', { name: /my posts/i });
    this.happy = this.root.getByRole('button', { name: /happy/i });
    this.sad = this.root.getByRole('button', { name: /sad/i });
    this.angry = this.root.getByRole('button', { name: /angry/i });
    this.hopeful = this.root.getByRole('button', { name: /hopeful/i });
    this.anxious = this.root.getByRole('button', { name: /anxious/i });
  }

  // USE: click one mood by key, e.g. `select('sad')`. Keys: all/mine/happy/sad/angry/hopeful/anxious.
  async select(mood) {
    await this.buttonFor(mood).click();
  }

  // USE: read the sidebar count badge before clicking, e.g. `const n = await countFor('Happy')`.
  // Returns 0 when no badge is rendered (no posts for that mood).
  async countFor(mood) {
    const btn = this.buttonFor(mood);
    await btn.waitFor({ state: 'visible' });
    const text = await btn.innerText();
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // Resolves a mood key to its sidebar button locator.
  buttonFor(mood) {
    const map = {
      all: this.allThoughts,
      mine: this.myPosts,
      happy: this.happy,
      sad: this.sad,
      angry: this.angry,
      hopeful: this.hopeful,
      anxious: this.anxious,
    };
    const btn = map[mood.toLowerCase()];
    if (!btn) throw new Error(`Unknown mood key: ${mood}`);
    return btn;
  }
}

export { MoodFilter as moodFilter };
