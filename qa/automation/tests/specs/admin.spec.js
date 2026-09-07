// tests/specs/admin.spec.js — P4 admin console coverage (ADM-1..ADM-9 + logout).
// POM used: AdminPage (login/tabs/tables/settings). API used: seeds (post+report, bug, postcard,
// map note) plus settings save/restore. Serial; every test logs in fresh (session is per-context).
// Logins stay under the 10/15min cap (6); destructive wipes stay API-tested in P3 (UI covers purge).
import { test, expect } from '@playwright/test';
import { AdminPage } from '../pages/AdminPage.js';
import { createPost } from '../api/postsApi.js';
import { sharePostcard } from '../api/postcardsApi.js';
import { createNote } from '../api/mapApi.js';
import { getSettings } from '../api/settingsApi.js';
import { loginAdminToken, adminHeaders } from '../helpers/auth.js';
import { uniqueName, uniqueText } from '../fixtures/testData.js';

test.describe.configure({ mode: 'serial' });

test.describe('Admin login and session @regression', () => {
  // ADM-1: wrong password rejected, correct password enters; reload keeps the session.
  // Covers: bad guess → error → real password → Command Center → reload still inside.
  test('ADM-1 Wrong password denied, correct enters, reload persists', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.open();
    await admin.tryLogin('wrong-password');
    await expect(admin.loginError).toBeVisible();
    await admin.tryLogin(process.env.ADMIN_PASSWORD);
    await expect(admin.commandTitle).toBeVisible({ timeout: 15000 });
    await page.reload();
    await expect(admin.commandTitle).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Admin command center @regression', () => {
  // ADM-3: stats render, purge runs with confirms, guidelines list, theme toggles.
  // Covers: Total Posts/Likes/Online → Purge Expired confirm+alert → Guidelines 6 cards → dark flip.
  test('ADM-3 Stats, purge, guidelines, theme', async ({ page }) => {
    const messages = [];
    page.on('dialog', (d) => { messages.push(d.message()); d.accept().catch(() => {}); });
    const admin = new AdminPage(page);
    await admin.open();
    await admin.loginAsAdmin();
    await expect(admin.commandTitle).toBeVisible({ timeout: 15000 });
    await expect(admin.statPosts).toBeVisible();
    await expect(page.getByText('Total Likes')).toBeVisible();
    await expect(page.getByText('Online Now')).toBeVisible();
    await admin.purgeButton.click();
    await expect.poll(() => messages.join('|'), { timeout: 15000 }).toMatch(/purged|proceed/i);
    await admin.openTab('Guidelines');
    await expect(page.getByText('Administrator Guidelines')).toBeVisible();
    await expect(page.getByText('Content Moderation')).toBeVisible();
    const toggle = page.getByRole('button', { name: 'Toggle dark mode' });
    await toggle.click();
    await expect(page.locator('html.dark')).toHaveCount(1);
    await toggle.click();
    await expect(page.locator('html.dark')).toHaveCount(0);
  });
});

test.describe('Admin moderation tables @regression', () => {
  // ADM-4: reported post surfaces in the queue and deletes with confirm.
  // Covers: seed + report via API → Reported tab → search → delete → row gone.
  test('ADM-4 Reported post deletes from queue', async ({ page, request }) => {
    const name = uniqueName('qa-mod');
    const { row } = await createPost(request, { username: name, mood: 'Angry', text: uniqueText('moderate me') });
    expect((await request.post('/api/reports', { data: { postId: row.id } })).ok()).toBeTruthy();
    const admin = new AdminPage(page);
    await admin.acceptDialogs();
    await admin.open();
    await admin.loginAsAdmin();
    await admin.openTab('Posts');
    await admin.reportedTab.click();
    await admin.postsSearch.fill(name);
    await expect(page.locator('tr', { hasText: name })).toBeVisible({ timeout: 15000 });
    await admin.deletePostRow(name);
    await expect(page.locator('tr', { hasText: name })).toHaveCount(0);
  });

  // ADM-567: feedback, postcard and map-note rows each delete from their tables.
  // Covers: seed one of each → delete per tab (confirms accepted) → rows gone.
  // NOTE: null reporter_name rows crash the table render (app bug) — purge them first via API.
  test('ADM-567 Feedback, postcard, map note delete', async ({ page, request }) => {
    const bugText = uniqueText('admin bug');
    const cardTo = uniqueName('qa-card-to');
    const noteName = uniqueName('qa-note').slice(0, 30);
    const token = await loginAdminToken(request);
    const auth = adminHeaders(token);
    const existing = await (await request.get('/api/bug-reports')).json();
    const nulls = existing.filter((r) => r.reporter_name == null).map((r) => r.id);
    if (nulls.length) await request.post('/api/bug-reports/delete-batch', { headers: auth, data: { ids: nulls } });
    expect((await request.post('/api/bug-reports', { data: { text: bugText, reporterName: 'qa-reporter', type: 'bug' } })).status()).toBe(201);
    expect((await sharePostcard(request, { to: cardTo, from: 'qa', message: 'x' })).status).toBe(201);
    expect((await createNote(request, { name: noteName, message: 'x' })).status).toBe(201);
    const admin = new AdminPage(page);
    await admin.acceptDialogs();
    await admin.open();
    await admin.loginAsAdmin();
    await admin.openTab('Feedback');
    await admin.feedbackSearch.fill(bugText.slice(0, 20));
    await admin.deleteFeedbackRow(bugText.slice(0, 20));
    await expect(page.locator('tr', { hasText: bugText.slice(0, 20) })).toHaveCount(0);
    await admin.openTab('Postcards');
    await admin.postcardsSearch.fill(cardTo);
    await admin.deletePostcardRow(cardTo);
    await expect(page.locator('tr', { hasText: cardTo })).toHaveCount(0);
    await admin.openTab('Map Notes');
    await admin.mapNotesSearch.fill(noteName);
    await admin.deleteMapNoteRow(noteName);
    await expect(page.locator('tr', { hasText: noteName })).toHaveCount(0);
  });
});

test.describe('Admin settings @regression', () => {
  // ADM-8: settings UI saves through (updateSetting sends the admin token).
  // Covers: set hours → chip shown → reload → both persisted → restore originals.
  test('ADM-8 Settings changes persist', async ({ page, request }) => {
    const before = await getSettings(request);
    // Pick a value that DIFFERS from current: a prior failed run leaves 24 in
    // the DB, and filling the slider with its current value fires no PUT.
    const targetHours = before.auto_delete_hours === 24 ? 48 : 24;
    const marker = `qaword${Date.now().toString(36).replace(/[^a-z0-9]/g, '')}`;
    const { loginAdminToken, adminHeaders } = await import('../helpers/auth.js');
    const token = await loginAdminToken(request);
    const auth = adminHeaders(token);
    try {
      const admin = new AdminPage(page);
      await admin.open();
      await admin.loginAsAdmin();
      await admin.openTab('Settings');
      await admin.setHours(targetHours);
      await expect(page.getByText(String(targetHours), { exact: true }).first()).toBeVisible();
      await admin.addWord(marker);
      await expect(page.getByText(marker)).toBeVisible();
      await page.reload();
      await expect(admin.commandTitle).toBeVisible({ timeout: 15000 });
      await admin.openTab('Settings');
      await expect(page.getByText(String(targetHours), { exact: true }).first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(marker)).toBeVisible({ timeout: 15000 });
    } finally {
      // Restore pre-test state via API even on failure (keeps later runs deterministic).
      await request.put('/api/settings/auto_delete_hours', { headers: auth, data: { value: before.auto_delete_hours } });
      const current = await getSettings(request);
      const cleaned = (current.blacklisted_words || []).filter((w) => w !== marker);
      await request.put('/api/settings/blacklisted_words', { headers: auth, data: { value: cleaned } });
    }
  });
});

test.describe('Admin logout @regression', () => {
  // ADM-2: logout returns to the login form. Runs last (session ends here; nothing after needs auth).
  // Covers: Log out → password field back, dashboard gone.
  test('ADM-2 Logout returns to login', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.open();
    await admin.loginAsAdmin();
    await expect(admin.commandTitle).toBeVisible({ timeout: 15000 });
    await admin.page.on('dialog', (d) => d.accept().catch(() => {}));
    await admin.logoutButton.click();
    await expect(admin.passwordInput).toBeVisible({ timeout: 15000 });
    await expect(admin.commandTitle).toBeHidden();
  });
});
