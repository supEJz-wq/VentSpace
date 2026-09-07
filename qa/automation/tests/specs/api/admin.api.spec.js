// tests/specs/api/admin.api.spec.js — P3 admin auth + wipe coverage. Runs LAST alphabetically-ish;
// keep logout LAST in-file: it rotates ADMIN_PASSWORD (server rewrites .env), then env re-syncs.
// Serial and ordered: auth checks → 401s → wipes (destructive) → logout rotation + re-sync.
// Login-burst and global/write flood limits are intentionally NOT triggered here (they would lock
// the backend for 15 minutes) — covered by design review in phase.md instead.
// Write budget ~15: auth(4) + 401 probes(4) + wipes(4) + purge/device(3).
import { test, expect } from '@playwright/test';
import { loginAdminToken, adminHeaders, resyncAdminPassword } from '../../helpers/auth.js';
import { createPost } from '../../api/postsApi.js';
import { uniqueName, uniqueText } from '../../fixtures/testData.js';
import { newDeviceId } from '../../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

test.describe('Admin auth API @api', () => {
  // API-ADMIN-AUTH: wrong password 401s, correct password issues a token, copy needs a token.
  // Covers: bad login 401 → good login token → authed copy-password 200 → bare copy-password 401.
  test('API-ADMIN-AUTH login and copy-password gates', async ({ request }) => {
    const bad = await request.post('/api/admin/login', { data: { password: 'wrong-password' } });
    expect(bad.status()).toBe(401);
    const token = await loginAdminToken(request);
    expect(typeof token).toBe('string');
    const copy = await request.post('/api/admin/copy-password', { headers: adminHeaders(token) });
    expect(copy.ok()).toBeTruthy();
    const naked = await request.post('/api/admin/copy-password');
    expect(naked.status()).toBe(401);
  });

  // API-ADMIN-401S: every destructive route rejects tokenless calls with 401 (no state harmed).
  // Covers: purge, device-wipe, unlock-all, delete-alls, hard-reset → 401 each, unauthenticated.
  test('API-ADMIN-401S destructive routes need token', async ({ request }) => {
    const deviceId = newDeviceId();
    const probes = [
      request.post('/api/posts/purge'),
      request.delete(`/api/posts/device/${deviceId}`),
      request.post('/api/admin/unlock-all-names'),
      request.post('/api/admin/delete-all-posts'),
      request.post('/api/admin/delete-all-map-notes'),
      request.post('/api/admin/hard-reset'),
    ];
    for (const p of probes) {
      expect((await p).status()).toBe(401);
    }
    const { row } = await createPost(request, { username: uniqueName('qa-wipe'), mood: 'Sad', text: uniqueText('wipe me') });
    const token = await loginAdminToken(request);
    const auth = adminHeaders(token);
    expect((await request.post('/api/posts/purge', { headers: auth })).ok()).toBeTruthy();
    expect((await request.post('/api/admin/unlock-all-names', { headers: auth })).ok()).toBeTruthy();
    expect((await request.delete(`/api/posts/device/${deviceId}`, { headers: auth })).ok()).toBeTruthy();
    void row;
  });

  // API-ADMIN-WIPE: bulk deletes clear their tables (scoped, then verified empty-ish for our rows).
  // Covers: delete-all-posts removes a seeded post (comments cascade by FK).
  test('API-ADMIN-WIPE delete-all-posts clears feed', async ({ request }) => {
    const marker = uniqueText('wipe marker');
    await createPost(request, { username: uniqueName('qa-wipe2'), mood: 'Angry', text: marker });
    const token = await loginAdminToken(request);
    const auth = adminHeaders(token);
    expect((await request.post('/api/admin/delete-all-posts', { headers: auth })).ok()).toBeTruthy();
    const feed = await (await request.get('/api/posts')).json();
    expect(JSON.stringify(feed)).not.toContain(marker);
  });

  // API-ADMIN-LOGOUT: logout rotates the PRIMARY password; old primary dies; backup survives;
  // fresh login works after re-sync.
  // Covers: logout → old password 401 → re-login with disk password 200. MUST stay last: it
  // rewrites .env, so the suite re-syncs process.env for any later files in the same run.
  // NOTE: other live tokens survive rotation until their 1h TTL (only the password changes) —
  // the calling token itself is revoked. ADMIN_BACKUP_PASSWORD never rotates — by design.
  // NOTE 2: the .env rewrite restarts the Vite dev server, which can hang up the in-flight logout
  // response itself — so rotation is proven by its effects (old 401 + fresh 200), retried past the gap.
  test('API-ADMIN-LOGOUT rotates password and re-syncs', async ({ request }) => {
    const stalePassword = process.env.ADMIN_PASSWORD;
    const token = await loginAdminToken(request);
    try {
      await request.post('/api/admin/logout', { headers: adminHeaders(token) });
    } catch {
      // Socket hang up here still means rotation landed (see asserts below) — the proxy died
      // with the dev-server restart that the .env rewrite triggered.
    }
    await expect(async () => {
      expect((await request.post('/api/admin/login', { data: { password: stalePassword } })).status()).toBe(401);
    }).toPass({ timeout: 30000 });
    const freshPassword = await resyncAdminPassword();
    expect(typeof freshPassword).toBe('string');
    await expect(async () => {
      const relogin = await request.post('/api/admin/login', { data: { password: freshPassword } });
      expect(relogin.ok()).toBeTruthy();
    }).toPass({ timeout: 30000 });
  });
});
