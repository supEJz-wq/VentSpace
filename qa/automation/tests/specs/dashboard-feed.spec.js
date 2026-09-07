// tests/specs/dashboard-feed.spec.js — P2-B feed coverage (DASH-F1..F7 + DASH-V1).
// POM used: DashboardPage (open/banner/clear) + feed (counts) + moodFilter (badges) + sidebar (topics/contributors).
// API used: seedFeedDataset once in beforeAll (shared dataset, 5 writes), settingsApi for F7, no per-test resets.
// Serial mode: tests share one dataset, so they run in order within a single worker.
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { seedFeedDataset } from '../api/postsApi.js';
import { getSettingsFetch, setBlacklistedWordsFetch } from '../api/settingsApi.js';
import { globalReset } from '../helpers/cleanup.js';
import { uniqueName } from '../fixtures/testData.js';

test.describe.configure({ mode: 'serial' });

// Shared dataset: reset once, seed 1 post per mood (Happy carries the hashtag).
// Runs once for the file — keeps us under the 30-writes/15min server limit.
let DATA;
test.beforeAll(async () => {
  await globalReset();
  DATA = await seedFeedDataset(Date.now().toString(36));
});

test.describe('Dashboard feed @smoke', () => {
  // DASH-F1 (smoke): feed settles with no infinite spinner.
  // Covers: open /home → spinner detaches → 4 cards on page 1 (5 seeded, 4 per page).
  test('DASH-F1 Feed loads without errors', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feed.expectCount(4);
  });
});

test.describe('Dashboard mood filters @regression', () => {
  // DASH-F2: each mood badge count matches the filtered feed, and every card carries the mood pill.
  // Covers: all 5 moods in one test (one dataset) → badge 1 → click → 1 card → pill check → back to All.
  test('DASH-F2 Mood filters show matching posts only', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    for (const mood of ['Happy', 'Sad', 'Angry', 'Hopeful', 'Anxious']) {
      expect(await dashboard.moodFilter.countFor(mood)).toBe(1);
      await dashboard.moodFilter.select(mood);
      await dashboard.feed.expectCount(1);
      await dashboard.feed.expectAllContainMood(mood);
    }
    await dashboard.moodFilter.select('all');
    await dashboard.feed.expectCount(4);
  });
});

test.describe('Dashboard search/topics/contributors @regression', () => {
  // DASH-F3: header search narrows by author, and clearing restores page 1.
  // Covers: type Sad author → 1 card → clear → 4 cards.
  test('DASH-F3 Search narrows feed and clear restores it', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.header.search(DATA.sadAuthor);
    await dashboard.feed.expectCount(1);
    await dashboard.header.clearSearch();
    await dashboard.feed.expectCount(4);
  });

  // DASH-F4: hashtag chip filters to tagged posts with a banner; Clear Filter restores.
  // Covers: click topic → banner `Showing posts for #tag` → 1 card → clear → banner gone.
  test('DASH-F4 Hashtag topic filters feed with banner', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.sidebar.clickTopic(DATA.hashtag);
    await expect(dashboard.filterBanner).toContainText(DATA.hashtag.toLowerCase());
    await dashboard.feed.expectCount(1);
    await dashboard.clearFilter();
    await expect(dashboard.filterBanner).toBeHidden();
  });

  // DASH-F5: contributor row filters to that author with a banner.
  // Covers: click Sad author → banner `Showing posts by {name}` → 1 card → clear.
  test('DASH-F5 Contributor filters feed with banner', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.sidebar.clickContributor(DATA.sadAuthor);
    await expect(dashboard.filterBanner).toContainText(DATA.sadAuthor);
    await dashboard.feed.expectCount(1);
    await dashboard.clearFilter();
  });
});

test.describe('Dashboard pagination @regression', () => {
  // DASH-F6: feed pages at 4 per page with working number navigation.
  // Covers: 5 seeded → page 1 shows 4 → page 2 shows 1 → back to page 1 shows 4.
  test('DASH-F6 Pagination splits 5 posts into 4 + 1', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.feed.expectCount(4);
    await page.getByRole('button', { name: '2', exact: true }).click();
    await dashboard.feed.expectCount(1);
    await page.getByRole('button', { name: '1', exact: true }).click();
    await dashboard.feed.expectCount(4);
  });
});

test.describe('Dashboard vibe + censor @regression', () => {
  // DASH-V1: donut center shows total, legend bars show rounded percentages.
  // Covers: even 1-per-mood mix → `5 thoughts` → `20%` legend entries.
  test('DASH-V1 Vibe donut reflects seeded mood mix', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await expect(page.getByText('5 thoughts')).toBeVisible();
    await expect(page.getByText('20%').first()).toBeVisible();
  });

  // DASH-F7: blacklisted words render censored (`*`) in the feed after an admin adds the word.
  // Covers: seed post with marker (allowed) → blacklist it → reload → raw word gone, stars shown.
  // Asserts on feed cards (not raw `.glass-card` — the sidebar shares that class).
  // Runs last: adds a 6th post, no later test asserts global counts. Restores the list.
  test('DASH-F7 Blacklisted word is censored in feed', async ({ page, request }) => {
    const marker = `qablock${Date.now().toString(36).replace(/[^a-z0-9]/g, '')}`;
    const before = await getSettingsFetch();
    const original = before.blacklisted_words ?? [];
    const { createPost } = await import('../api/postsApi.js');
    await createPost(request, { username: uniqueName('qa-censor'), mood: 'Happy', text: `I really love ${marker} vibes` });
    await setBlacklistedWordsFetch([...original, marker]);
    try {
      const dashboard = new DashboardPage(page);
      await dashboard.open();
      const censored = dashboard.feed.cards.first();
      await expect(censored).toContainText('*'.repeat(marker.length));
      await expect(censored).not.toContainText(marker);
    } finally {
      await setBlacklistedWordsFetch(original);
    }
  });
});
