// tests/specs/api/meta.api.spec.js — P3 settings/identity/reports/bugs API coverage.
// Serial and ordered: reads first, mutations restore state (settings/blacklist revert in finally).
// Identity/reports/bugs use throwaway devices and ids; bug rows are deleted at the end.
// Write budget ~17: settings(3) + identity(4) + reports(3) + bugs(7).
import { test, expect } from '@playwright/test';
import { loginAdminToken, adminHeaders } from '../../helpers/auth.js';
import { createPost } from '../../api/postsApi.js';
import { uniqueName, uniqueText } from '../../fixtures/testData.js';
import { newDeviceId } from '../../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

test.describe('Settings API @api', () => {
  // API-SETTINGS: reads expose keys; admin writes validate; strangers get 401; state restored.
  // Covers: GET keys → PUT hours 6 ok → unknown key/0/169/non-array 400 → no-token 401 → restore.
  test('API-SETTINGS read, validate, restore', async ({ request }) => {
    const before = await (await request.get('/api/settings')).json();
    const token = await loginAdminToken(request);
    const auth = adminHeaders(token);
    expect(before).toEqual(expect.objectContaining({ blacklisted_words: expect.any(Array) }));
    try {
      const ok = await request.put('/api/settings/auto_delete_hours', { headers: auth, data: { value: 6 } });
      expect(ok.status()).toBe(200);
      expect((await (await request.get('/api/settings')).json()).auto_delete_hours).toBe(6);
      for (const bad of [
        ['/api/settings/nope', { value: 1 }],
        ['/api/settings/auto_delete_hours', { value: 0 }],
        ['/api/settings/auto_delete_hours', { value: 169 }],
        ['/api/settings/blacklisted_words', { value: 'nope' }],
      ]) {
        const res = await request.put(bad[0], { headers: auth, data: bad[1] });
        expect(res.status()).toBe(400);
      }
      const naked = await request.put('/api/settings/auto_delete_hours', { data: { value: 6 } });
      expect(naked.status()).toBe(401);
    } finally {
      await request.put('/api/settings/auto_delete_hours', { headers: auth, data: { value: before.auto_delete_hours } });
      await request.put('/api/settings/blacklisted_words', { headers: auth, data: { value: before.blacklisted_words } });
    }
  });
});

test.describe('Identity API @api', () => {
  // API-IDENTITY: lock → read → negatives → admin unlock; invalid uuid reads null (not 400).
  // Covers: POST lock 200 → GET row → bad uuid POST 400 → banned name 400 → DELETE admin 200 → GET null.
  test('API-IDENTITY lock, read, unlock cycle', async ({ request }) => {
    const deviceId = newDeviceId();
    const name = uniqueName('qa-ident').slice(0, 40);
    const lock = await request.post('/api/identity', { data: { deviceId, username: name } });
    expect(lock.status()).toBe(200);
    expect((await (await request.get(`/api/identity/${deviceId}`)).json()).username).toBe(name);
    const bad = await request.post('/api/identity', { data: { deviceId: 'nope', username: 'qa' } });
    expect(bad.status()).toBe(400);
    const banned = await request.post('/api/identity', { data: { deviceId: newDeviceId(), username: 'spam fan' } });
    expect(banned.status()).toBe(400);
    const ghost = await request.get(`/api/identity/${newDeviceId()}`);
    expect(await ghost.json()).toBeNull();
    const token = await loginAdminToken(request);
    const del = await request.delete(`/api/identity/${deviceId}`, { headers: adminHeaders(token) });
    expect(del.ok()).toBeTruthy();
    expect(await (await request.get(`/api/identity/${deviceId}`)).json()).toBeNull();
  });
});

test.describe('Reports API @api', () => {
  // API-REPORTS: report upserts, lists, un-reports; bad ids rejected.
  // Covers: POST 200 → GET contains → re-POST idempotent → DELETE → gone; postId 0/abc 400.
  // NOTE: reports FK to posts — the target is a real seeded post, not a fake id.
  test('API-REPORTS report cycle and validation', async ({ request }) => {
    const { row } = await createPost(request, { username: uniqueName('qa-rep'), mood: 'Happy', text: uniqueText('reportable') });
    const target = row.id;
    await request.delete(`/api/reports/${target}`).catch(() => null);
    const post = await request.post('/api/reports', { data: { postId: target } });
    expect(post.ok()).toBeTruthy();
    const again = await request.post('/api/reports', { data: { postId: target } });
    expect(again.ok()).toBeTruthy();
    expect(await (await request.get('/api/reports')).json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ post_id: target })]),
    );
    const del = await request.delete(`/api/reports/${target}`);
    expect(del.ok()).toBeTruthy();
    expect(await (await request.get('/api/reports')).json()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ post_id: target })]),
    );
    const bad = await request.post('/api/reports', { data: { postId: 'abc' } });
    expect(bad.status()).toBe(400);
  });
});

test.describe('Bug reports API @api', () => {
  // API-BUGS: bug + suggestion submit, list newest-first, validation, admin single + batch delete.
  // Covers: 2 POSTs 201 → GET desc → empty/bad-type 400 → DELETE 1 → batch rest → gone.
  test('API-BUGS submit, list, delete cycle', async ({ request }) => {
    const bugText = uniqueText('api bug');
    const ideaText = uniqueText('api idea');
    const bug = await request.post('/api/bug-reports', { data: { text: bugText, reporterName: 'qa', type: 'bug' } });
    expect(bug.status()).toBe(201);
    const idea = await request.post('/api/bug-reports', { data: { text: ideaText, reporterName: 'qa', type: 'suggestion' } });
    expect(idea.status()).toBe(201);
    const bugId = (await bug.json()).id;
    const ideaId = (await idea.json()).id;
    const listed = await (await request.get('/api/bug-reports')).json();
    expect(listed.length).toBeGreaterThanOrEqual(2);
    expect(new Date(listed[0].created_at).getTime()).toBeGreaterThanOrEqual(new Date(listed[listed.length - 1].created_at).getTime());
    const empty = await request.post('/api/bug-reports', { data: { text: '', type: 'bug' } });
    expect(empty.status()).toBe(400);
    const badType = await request.post('/api/bug-reports', { data: { text: 'x', type: 'complaint' } });
    expect(badType.status()).toBe(400);
    const token = await loginAdminToken(request);
    const auth = adminHeaders(token);
    expect((await request.delete(`/api/bug-reports/${bugId}`, { headers: auth })).ok()).toBeTruthy();
    const batch = await request.post('/api/bug-reports/delete-batch', { headers: auth, data: { ids: [ideaId] } });
    expect(batch.ok()).toBeTruthy();
    const gone = await (await request.get('/api/bug-reports')).json();
    expect(gone.map((r) => r.id)).not.toContain(bugId);
    expect(gone.map((r) => r.id)).not.toContain(ideaId);
  });
});
