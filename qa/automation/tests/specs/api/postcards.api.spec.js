// tests/specs/api/postcards.api.spec.js — P3 postcards API coverage.
// Serial and ordered: validation first, limit in the middle, deletes last (admin token via helper).
// Rate cap: 5 shares per 24h per device — every seed uses its own device except the limit test.
// Write budget ~17: happy(1) + negatives(6) + limit(6) + stickers(1) + deletes(3).
import { test, expect } from '@playwright/test';
import { sharePostcard, getPostcards, validPostcard } from '../../api/postcardsApi.js';
import { loginAdminToken, adminHeaders } from '../../helpers/auth.js';
import { uniqueName } from '../../fixtures/testData.js';
import { newDeviceId } from '../../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

// One happy-path card shared by read/delete tests (deleted last).
let cardId;
test.beforeAll(async ({ request }) => {
  const { status, body } = await sharePostcard(request, { to: uniqueName('qa-to'), from: 'qa-from', message: 'api card' });
  expect(status).toBe(201);
  cardId = body.id;
});

test.describe('Postcards API @api', () => {
  // API-POSTCARDS-GET: wall lists newest-first with the full style shape.
  // Covers: array, desc created_at, style columns present (bg_type/font/align/stickers).
  test('API-POSTCARDS-GET lists newest-first with style shape', async ({ request }) => {
    const rows = await getPostcards(request);
    expect(rows.length).toBeGreaterThan(0);
    const times = rows.map((c) => new Date(c.created_at).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(rows[0]).toEqual(expect.objectContaining({ bg_type: expect.any(String), font: expect.any(String), align: expect.any(String) }));
  });

  // API-POSTCARDS-NEGATIVES: whitelist violations are rejected with 400 (nothing stored).
  // Covers: bad bgType/align/border/font, non-hex color, bad gradient, bad uuid → 400 each.
  // NOTE: 61-char To is NOT rejected — sanitize-then-max truncates to 60 and stores (capped case below).
  test('API-POSTCARDS-NEGATIVES bad payloads get 400', async ({ request }) => {
    const base = validPostcard({ deviceId: newDeviceId() });
    const cases = [
      { ...base, bgType: 'radial' },
      { ...base, align: 'justify' },
      { ...base, borderStyle: 'dotted' },
      { ...base, font: 'Comic Sans' },
      { ...base, bgColor: 'red' },
      { ...base, bgType: 'gradient', bgGradient: 'linear-gradient(0deg,#fff,#000)' },
      { ...base, deviceId: 'nope' },
    ];
    for (const body of cases) {
      const res = await request.post('/api/postcards', { data: body });
      expect(res.status()).toBe(400);
    }
    const long = await request.post('/api/postcards', { data: { ...base, to: 't'.repeat(61) } });
    expect(long.status()).toBe(201);
    expect((await long.json()).to).toHaveLength(60);
  });

  // API-POSTCARDS-LIMIT: the 6th share within 24h on one device is rejected.
  // Covers: 5 seeds → 6th 429 LIMIT_REACHED.
  test('API-POSTCARDS-LIMIT sixth share gets 429', async ({ request }) => {
    const deviceId = newDeviceId();
    for (let i = 0; i < 5; i++) {
      const { status } = await sharePostcard(request, { to: `qa-limit-${i}`, deviceId });
      expect(status).toBe(201);
    }
    const { status, body } = await sharePostcard(request, { to: 'qa-over', deviceId });
    expect(status).toBe(429);
    expect(body.error).toBe('LIMIT_REACHED');
  });

  // API-POSTCARDS-STICKERS: oversized sticker arrays are trimmed to 20, positions clamped 0-100.
  // Covers: 25 stickers + out-of-range x/y → stored 20, all coords within bounds.
  test('API-POSTCARDS-STICKERS trimmed to 20 and clamped', async ({ request }) => {
    const stickers = Array.from({ length: 25 }, (_, i) => ({ emoji: '🌸', x: i * 10 - 50, y: i * 10 + 200 }));
    const { status, body } = await sharePostcard(request, { to: uniqueName('qa-st'), stickers });
    expect(status).toBe(201);
    expect(body.stickers).toHaveLength(20);
    for (const s of body.stickers) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(100);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(100);
    }
    const token = await loginAdminToken(request);
    await request.delete(`/api/postcards/${body.id}`, { headers: adminHeaders(token) });
  });

  // API-POSTCARDS-DELETE: admin singles + batches delete; strangers get 401. Shared card dies here.
  // Covers: no-token 401 → batch of [shared, extra] 200 → both gone from GET.
  test('API-POSTCARDS-DELETE admin batch removes rows', async ({ request }) => {
    const naked = await request.delete(`/api/postcards/${cardId}`);
    expect(naked.status()).toBe(401);
    const extra = await sharePostcard(request, { to: uniqueName('qa-batch') });
    expect(extra.status).toBe(201);
    const token = await loginAdminToken(request);
    const batch = await request.post('/api/postcards/delete-batch', { headers: adminHeaders(token), data: { ids: [cardId, extra.body.id] } });
    expect(batch.ok()).toBeTruthy();
    const ids = (await getPostcards(request)).map((c) => c.id);
    expect(ids).not.toContain(cardId);
    expect(ids).not.toContain(extra.body.id);
  });
});
