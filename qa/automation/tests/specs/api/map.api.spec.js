// tests/specs/api/map.api.spec.js — P3 map API coverage.
// Serial and ordered: validation first, limit in the middle, admin reads/deletes last.
// Rate cap: 10 pins per rolling hour per device — limit test owns one device, rest use fresh ones.
// Write budget ~18: happy(1) + negatives(4) + limit(11) + admin delete(2).
import { test, expect } from '@playwright/test';
import { createNote, getNotes, MANILA } from '../../api/mapApi.js';
import { loginAdminToken, adminHeaders } from '../../helpers/auth.js';
import { uniqueName, uniqueText } from '../../fixtures/testData.js';
import { newDeviceId } from '../../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

// One happy-path pin shared by read/admin tests (deleted last by the admin).
let noteId;
test.beforeAll(async ({ request }) => {
  const { status, body } = await createNote(request, { name: uniqueName('qa-pin'), message: uniqueText('api pin') });
  expect(status).toBe(201);
  noteId = body.id;
  expect(new Date(body.expires_at).getTime() - Date.now()).toBeGreaterThan(4 * 3600 * 1000);
});

test.describe('Map API @api', () => {
  // API-MAP-GET: only active pins, newest-first, capped shape.
  // Covers: array, every expires_at in the future, desc created_at, our pin present.
  test('API-MAP-GET lists active pins newest-first', async ({ request }) => {
    const rows = await getNotes(request);
    expect(rows.length).toBeGreaterThan(0);
    for (const n of rows) {
      expect(new Date(n.expires_at).getTime()).toBeGreaterThan(Date.now());
    }
    const times = rows.map((n) => new Date(n.created_at).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(rows.map((n) => n.id)).toContain(noteId);
  });

  // API-MAP-NEGATIVES: bounds, required fields, identity and blacklist rejected with 400.
  // Covers: ocean coords, empty name, bad uuid, `spam` name → 400 each.
  test('API-MAP-NEGATIVES bad pins get 400', async ({ request }) => {
    const deviceId = newDeviceId();
    const outside = await createNote(request, { name: 'qa', message: 'ocean', latitude: 0, longitude: 0, deviceId });
    expect(outside.status).toBe(400);
    const empty = await createNote(request, { name: '', message: 'x', deviceId });
    expect(empty.status).toBe(400);
    const badUuid = await createNote(request, { name: 'qa', message: 'x', deviceId: 'nope' });
    expect(badUuid.status).toBe(400);
    const banned = await createNote(request, { name: 'spam fan', message: 'x', deviceId });
    expect(banned.status).toBe(400);
  });

  // API-MAP-LIMIT: the 11th pin within an hour on one device is rejected.
  // Covers: 10 seeds → 11th 429 mentioning the cooldown.
  test('API-MAP-LIMIT eleventh pin gets 429', async ({ request }) => {
    const deviceId = newDeviceId();
    for (let i = 0; i < 10; i++) {
      const { status } = await createNote(request, { name: `qa-rl-${i}`, message: uniqueText(`rl ${i}`), deviceId });
      expect(status).toBe(201);
    }
    const over = await createNote(request, { name: 'qa-over', message: 'one too many', deviceId });
    expect(over.status).toBe(429);
    expect(over.body.error).toMatch(/take a break/i);
  });

  // API-MAP-ADMIN: all-notes needs a token and exposes device ids; admin delete removes the pin.
  // Covers: no-token 401 → authed list contains our pin with device_id → delete 200 → gone.
  test('API-MAP-ADMIN all-notes and delete need token', async ({ request }) => {
    const naked = await request.get('/api/map/all-notes');
    expect(naked.status()).toBe(401);
    const token = await loginAdminToken(request);
    const all = await request.get('/api/map/all-notes', { headers: adminHeaders(token) });
    expect(all.ok()).toBeTruthy();
    expect(await all.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: noteId, device_id: expect.any(String) })]));
    const del = await request.delete(`/api/map/notes/${noteId}`, { headers: adminHeaders(token) });
    expect(del.ok()).toBeTruthy();
    expect((await getNotes(request)).map((n) => n.id)).not.toContain(noteId);
  });

  // API-MAP-PH-WINDOW: Manila coordinates used across suites sit inside the enforced bbox.
  // Covers: documented guard pinning the shared MANILA fixture to the server bbox.
  test('API-MAP-PH-WINDOW manila fixture inside bbox', async () => {
    expect(MANILA.latitude).toBeGreaterThanOrEqual(4.4);
    expect(MANILA.latitude).toBeLessThanOrEqual(21.2);
    expect(MANILA.longitude).toBeGreaterThanOrEqual(115.0);
    expect(MANILA.longitude).toBeLessThanOrEqual(131.0);
  });
});
