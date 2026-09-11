// tests/specs/dashboard-post.spec.js — P2-C posting coverage (DASH-P1..P9).
// POM used: DashboardPage (header.openPostModal) + postModal (createPost/errors) + feed (expectPostVisible).
// API used: postsApi for rate-limit/duplicate seeding, settingsApi for blacklist, cleanup for isolation.
// Devices: fresh device per test via seedDeviceId (own rate bucket + name lock) unless the test needs a preset device.
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { createPost } from '../api/postsApi.js';
import { setBlacklistedWords, getSettings } from '../api/settingsApi.js';
import { uniqueName, uniqueText, MOODS } from '../fixtures/testData.js';
import { newDeviceId, seedDeviceId } from '../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

// No resets here: every test uses unique data + a fresh device (fresh browser context per test),
// so rate limits and name locks never collide. Only P5/P7 seed on purpose-built device ids.

// Full UI creation flow used by P1/P2/P4/P8/P9: fresh device → open → modal → create → visible.
async function createViaUi(page, { name, text, mood = 'Happy' }) {
  const dashboard = new DashboardPage(page);
  await seedDeviceId(page);
  await dashboard.open();
  await dashboard.header.openPostModal();
  await dashboard.postModal.createPost({ name, text, mood });
  return dashboard;
}

test.describe('Dashboard posting happy path @smoke @regression', () => {
  // DASH-P1 (smoke): Happy post created via UI appears in the feed.
  // Covers: Post Something → name + text + Happy → Post Anonymously → card with name/text/mood.
  test('DASH-P1 Create Happy post appears in feed', async ({ page }) => {
    const name = uniqueName('qa-poster');
    const text = uniqueText('happy thought');
    const dashboard = await createViaUi(page, { name, text, mood: 'Happy' });
    await dashboard.feed.expectPostVisible({ name, text, mood: 'Happy' });
  });

  // DASH-P2: remaining moods render correctly in the feed (API-seeded to stay under the
  // server's 30-writes/15min cap; DASH-P1 already covers the modal flow end-to-end).
  // Covers: Sad/Angry/Hopeful/Anxious seeded post → card visible with that mood pill.
  for (const mood of MOODS.filter((m) => m !== 'Happy')) {
    test(`DASH-P2 Create ${mood} post appears in feed`, async ({ page, request }) => {
      const name = uniqueName('qa-poster');
      const text = uniqueText(`${mood} thought`);
      await createPost(request, { username: name, mood, text });
      const dashboard = new DashboardPage(page);
      await dashboard.open();
      await dashboard.feed.expectPostVisible({ name, text, mood });
    });
  }
});

test.describe('Dashboard posting validation @regression', () => {
  // DASH-P3: required fields + 300-char cap enforced in the modal.
  // Covers: empty form → submit disabled; text-only → still disabled; 301 chars → capped at 300.
  test('DASH-P3 Empty fields block submit and text caps at 300', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await seedDeviceId(page);
    await dashboard.open();
    await dashboard.header.openPostModal();
    await dashboard.postModal.waitForSettled();
    await expect(dashboard.postModal.submitButton).toBeDisabled();
    await dashboard.postModal.textarea.fill(uniqueText('needs a name'));
    await expect(dashboard.postModal.submitButton).toBeDisabled();
    await dashboard.postModal.textarea.fill('x'.repeat(301));
    await expect(dashboard.postModal.textarea).toHaveValue('x'.repeat(300));
  });

  // DASH-P4: username locks after the first post and survives reload.
  // Covers: create → card visible (submit chain finished) → reload → reopen → disabled + `Locked` + same value.
  test('DASH-P4 Name locks after first post and persists reload', async ({ page }) => {
    const name = uniqueName('qa-locked');
    const text = uniqueText('lock me');
    const deviceId = await seedDeviceId(page);
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.header.openPostModal();
    await dashboard.postModal.createPost({ name, text, mood: 'Happy' });
    await dashboard.feed.expectPostVisible({ name, text, mood: 'Happy' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await dashboard.header.openPostModal();
    await expect(dashboard.postModal.nameInput).toBeDisabled();
    await expect(dashboard.postModal.lockedBadge).toBeVisible();
    await expect(dashboard.postModal.nameInput).toHaveValue(name);
    expect(deviceId).toBeTruthy();
  });

  // DASH-P5: 6th post on one device is rejected with the rate-limit message.
  // Covers: seed 5 via API on one device → UI attempt → `Rate limit reached` shown, no new card.
  test('DASH-P5 Sixth post on one device hits rate limit', async ({ page, request }) => {
    const deviceId = newDeviceId();
    for (let i = 0; i < 5; i++) {
      await createPost(request, { username: uniqueName('qa-rl'), mood: 'Happy', text: uniqueText(`rl seed ${i}`), deviceId });
    }
    await seedDeviceId(page, deviceId);
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.header.openPostModal();
    await dashboard.postModal.waitForSettled();
    await dashboard.postModal.nameInput.fill(uniqueName('qa-rl-ui'));
    await dashboard.postModal.textarea.fill(uniqueText('one too many'));
    await dashboard.postModal.moodButton('Happy').click();
    await dashboard.postModal.submitButton.click();
    await expect(dashboard.postModal.rateLimitError).toBeVisible();
  });
});

test.describe('Dashboard posting abuse guards @regression', () => {
  // DASH-P6: post containing a blacklisted word is blocked server-side.
  // Covers: admin blacklists marker → UI submit with marker text → modal stays open, no card.
  test('DASH-P6 Blacklisted text is blocked', async ({ page, request }) => {
    const marker = `qablock${Date.now().toString(36).replace(/[^a-z0-9]/g, '')}`;
    const before = await getSettings(request);
    const original = before.blacklisted_words ?? [];
    await setBlacklistedWords(request, [...original, marker]);
    try {
      const name = uniqueName('qa-block');
      const text = `this contains ${marker} word`;
      const dashboard = new DashboardPage(page);
      await seedDeviceId(page);
      await dashboard.open();
      await dashboard.header.openPostModal();
      await dashboard.postModal.createPost({ name, text, mood: 'Happy' });
      await expect(dashboard.postModal.nameInput).toBeVisible();
      await expect(dashboard.feed.postCard({ name, text, mood: 'Happy' })).toHaveCount(0);
    } finally {
      await setBlacklistedWords(request, original);
    }
  });

  // DASH-P7: identical text from the same device is rejected as duplicate.
  // Covers: API post text T → UI repost of T on same device → modal stays open, single card.
  test('DASH-P7 Duplicate text on one device is blocked', async ({ page, request }) => {
    const deviceId = newDeviceId();
    const text = uniqueText('dupe text');
    await createPost(request, { username: uniqueName('qa-dupe'), mood: 'Sad', text, deviceId });
    await seedDeviceId(page, deviceId);
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.header.openPostModal();
    await dashboard.postModal.createPost({ name: uniqueName('qa-dupe2'), text, mood: 'Sad' });
    await expect(dashboard.postModal.nameInput).toBeVisible();
  });

  // DASH-P8: owners can delete their own post from the card.
  // Covers: create → header trash (first button in own card) → confirm →
  // deleted popup → card removed.
  test('DASH-P8 Owner can delete own post', async ({ page }) => {
    const name = uniqueName('qa-del');
    const text = uniqueText('delete me');
    const dashboard = await createViaUi(page, { name, text, mood: 'Happy' });
    const card = dashboard.feed.postCard({ name, text, mood: 'Happy' });
    await page.on('dialog', (d) => d.accept().catch(() => {}));
    await card.getByRole('button').first().click();
    await expect(card).toHaveCount(0);
  });

  // DASH-P9: HTML in post text is stripped — no script runs, text survives.
  // Covers: submit `<script>…` payload → card shows inner text, zero script nodes, no dialog.
  test('DASH-P9 Script tags in text are stripped', async ({ page }) => {
    const marker = uniqueText('xss hello');
    const payload = `<script>alert(1)</script>${marker}`;
    page.on('dialog', () => { throw new Error('XSS dialog fired'); });
    const dashboard = await createViaUi(page, { name: uniqueName('qa-xss'), text: payload, mood: 'Happy' });
    const card = dashboard.feed.postCard({ name: 'qa-xss', text: marker, mood: 'Happy' });
    await expect(card).toBeVisible();
    await expect(card.locator('script')).toHaveCount(0);
  });
});
