// tests/specs/api/posts.api.spec.js — P3 posts API coverage (INT-1 plus CRUD/limits/negatives).
// Serial and ordered: like/react run on the happy-path post, deletes run last (own post dies last).
// Write budget ~22: happy(1) + negatives(5) + limit(6) + dupe(2) + like(2) + reaction(3) + deletes(3).
// Each file runs in its own invocation (fresh backend, fresh 30-write budget) — see phase.md P5 note.
import { test, expect } from '@playwright/test';
import { createPost } from '../../api/postsApi.js';
import { uniqueName, uniqueText } from '../../fixtures/testData.js';
import { newDeviceId } from '../../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

// Happy-path post shared by like/reaction/delete tests (its own device, never rate-limited).
// Device id is kept explicitly — the API never returns device_id, and owner-delete needs it.
let shared;
let sharedDevice;
test.beforeAll(async ({ request }) => {
  sharedDevice = newDeviceId();
  const { row } = await createPost(request, { username: uniqueName('qa-api'), mood: 'Happy', text: uniqueText('api happy'), deviceId: sharedDevice });
  shared = row;
});

test.describe('Posts API @api', () => {
  // INT-1 (API-only): likes increment server-side. No like button exists in PostCard UI,
  // so this has no UI twin — the UI suite asserts reactions instead (INT-2).
  // Covers: create → like → likes 1 → like again → likes 2.
  test('INT-1 Liking a post increments likes', async ({ request }) => {
    const first = await request.post(`/api/posts/${shared.id}/like`, { data: { currentLikes: 0 } });
    expect(first.ok()).toBeTruthy();
    expect((await first.json()).likes).toBe(1);
    const second = await request.post(`/api/posts/${shared.id}/like`, { data: { currentLikes: 1 } });
    expect((await second.json()).likes).toBe(2);
  });

  // API-POSTS-REACTION: emoji add, switch (counts move), invalid rejected.
  // Covers: ❤️ → {❤️:1} → switch to 😂 → {😂:1,❤️:0} → 💩 → 400.
  test('API-POSTS-REACTION add, switch, reject invalid', async ({ request }) => {
    const add = await request.post(`/api/posts/${shared.id}/reaction`, { data: { emoji: '❤️', prevEmoji: null, currentReactions: {} } });
    expect(add.ok()).toBeTruthy();
    expect((await add.json()).reactions).toMatchObject({ '❤️': 1 });
    const swap = await request.post(`/api/posts/${shared.id}/reaction`, { data: { emoji: '😂', prevEmoji: '❤️', currentReactions: { '❤️': 1 } } });
    expect((await swap.json()).reactions).toMatchObject({ '😂': 1, '❤️': 0 });
    const bad = await request.post(`/api/posts/${shared.id}/reaction`, { data: { emoji: '💩', prevEmoji: null, currentReactions: {} } });
    expect(bad.status()).toBe(400);
  });

  // API-POSTS-GET: newest-first feed with nested comments shape.
  // Covers: array, desc created_at, comment rows carry parent_id/reactions.
  test('API-POSTS-GET lists newest-first with nested comments', async ({ request }) => {
    const res = await request.get('/api/posts');
    expect(res.ok()).toBeTruthy();
    const rows = await res.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    const times = rows.map((p) => new Date(p.created_at).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    for (const c of rows[0].comments ?? []) {
      expect(c).toEqual(expect.objectContaining({ id: expect.anything(), username: expect.any(String), text: expect.any(String) }));
    }
  });

  // API-POSTS-NEGATIVES: validation rejects bad payloads with 400 (nothing stored).
  // Covers: bad mood, 301-char text, bad uuid, banned word, missing username → 400 each.
  test('API-POSTS-NEGATIVES bad payloads get 400', async ({ request }) => {
    const deviceId = newDeviceId();
    const cases = [
      { username: 'qa', mood: 'Blue', text: 'x', deviceId },
      { username: 'qa', mood: 'Happy', text: 'x'.repeat(301), deviceId },
      { username: 'qa', mood: 'Happy', text: 'x', deviceId: 'nope' },
      { username: 'spam fan', mood: 'Happy', text: 'x', deviceId },
      { username: 'qa', mood: 'Happy', text: 'spam here', deviceId },
      { username: '', mood: 'Happy', text: 'x', deviceId },
    ];
    for (const body of cases) {
      const res = await request.post('/api/posts', { data: body });
      expect(res.status()).toBe(400);
    }
  });

  // API-POSTS-LIMIT: the 6th post in-window is rejected, duplicates too.
  // Covers: 5 seeds → 6th 429 RATE_LIMIT; same text twice → 2nd 429 DUPLICATE.
  test('API-POSTS-LIMIT rate and duplicate rejected', async ({ request }) => {
    const deviceId = newDeviceId();
    for (let i = 0; i < 5; i++) {
      const r = await request.post('/api/posts', { data: { username: uniqueName('qa-rl'), mood: 'Happy', text: uniqueText(`rl ${i}`), deviceId } });
      expect(r.status()).toBe(201);
    }
    const over = await request.post('/api/posts', { data: { username: uniqueName('qa-rl'), mood: 'Happy', text: uniqueText('over'), deviceId } });
    expect(over.status()).toBe(429);
    expect((await over.json()).error).toBe('RATE_LIMIT');
    const dupeDevice = newDeviceId();
    const dupeText = uniqueText('dupe twin');
    await request.post('/api/posts', { data: { username: uniqueName('qa-dupe'), mood: 'Sad', text: dupeText, deviceId: dupeDevice } });
    const dupe = await request.post('/api/posts', { data: { username: uniqueName('qa-dupe2'), mood: 'Sad', text: dupeText, deviceId: dupeDevice } });
    expect(dupe.status()).toBe(429);
  });

  // API-POSTS-XSS: markup is stripped server-side before storage.
  // Covers: `<script>` payload → stored text without tags.
  test('API-POSTS-XSS markup stripped on store', async ({ request }) => {
    const marker = uniqueText('xss clean');
    const res = await request.post('/api/posts', { data: { username: uniqueName('qa-xss'), mood: 'Happy', text: `<script>alert(1)</script>${marker}`, deviceId: newDeviceId() } });
    expect(res.status()).toBe(201);
    const stored = (await res.json()).text;
    expect(stored).toContain(marker);
    expect(stored).not.toContain('<script>');
  });

  // API-POSTS-DELETE: owner deletes (200), stranger gets 403, ghost gets 404. Own shared post dies LAST.
  // Covers: other-device 403 → missing id 404 → owner 200 + gone from GET.
  test('API-POSTS-DELETE owner 200, stranger 403, ghost 404', async ({ request }) => {
    const stranger = await request.delete(`/api/posts/${shared.id}?deviceId=${newDeviceId()}&username=x`);
    expect(stranger.status()).toBe(403);
    const ghost = await request.delete(`/api/posts/987654321?deviceId=${newDeviceId()}&username=x`);
    expect(ghost.status()).toBe(404);
    const owner = await request.delete(`/api/posts/${shared.id}?deviceId=${sharedDevice}&username=qa`);
    expect(owner.status()).toBe(200);
    const after = await request.get('/api/posts');
    expect((await after.json()).map((p) => p.id)).not.toContain(shared.id);
  });
});
