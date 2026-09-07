// tests/api/postcardsApi.js — seeding + reads for postcards (mirrors backend/routes/postcards.js).
// USE: `sharePostcard()` for wall datasets and limit tests; `getPostcards()` to assert totals.
// Rate cap: 5 shares per 24h per device — spread seeds across devices via newDeviceId().
import { newDeviceId } from '../fixtures/devices.js';

// Minimal valid payload satisfying every server whitelist (font/align/border/hex).
export function validPostcard(overrides = {}) {
  return {
    to: 'qa-to',
    from: 'qa-from',
    message: 'qa message',
    bgType: 'solid',
    bgColor: '#fce7f3',
    bgGradient: '',
    textColor: '#1f2937',
    font: "'Georgia', serif",
    align: 'center',
    stickers: [],
    borderStyle: 'elegant',
    deviceId: newDeviceId(),
    ...overrides,
  };
}

// Shares one postcard via POST /api/postcards. Returns { status, body } for limit asserts.
export async function sharePostcard(request, payload = {}) {
  const res = await request.post('/api/postcards', { data: validPostcard(payload) });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

// Reads the whole wall, newest first. Used for totals and realtime asserts.
export async function getPostcards(request) {
  const res = await request.get('/api/postcards');
  if (!res.ok()) throw new Error(`getPostcards failed: ${res.status()}`);
  return res.json();
}

// Seeds the shared wall dataset: 13 postcards across 3 devices (5+5+3, under the 5/24h cap).
// Returns the seed rows. One file-level dataset keeps write counts predictable.
export async function seedWallDataset(request, tag) {
  const devices = [newDeviceId(), newDeviceId(), newDeviceId()];
  const rows = [];
  for (let i = 0; i < 13; i++) {
    const { status, body } = await sharePostcard(request, {
      to: `qa-wall-seed-${i}-${tag}`.slice(0, 50),
      from: `qa-wall-from-${tag}`.slice(0, 50),
      message: `wall seed message ${i} ${tag}`,
      deviceId: devices[Math.min(Math.floor(i / 5), 2)],
    });
    if (status !== 201) throw new Error(`seedWallDataset failed at ${i}: ${status} ${JSON.stringify(body)}`);
    rows.push(body);
  }
  return rows;
}

const DIRECT_API = 'http://localhost:3001';

// Plain-fetch share for beforeAll hooks (no `request` fixture available there).
async function sharePostcardFetch(payload) {
  const res = await fetch(`${DIRECT_API}/api/postcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPostcard(payload)),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// Fetch-based wall dataset for beforeAll: 13 rows over 3 fresh devices.
export async function seedWallDatasetFetch(tag) {
  const devices = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const rows = [];
  for (let i = 0; i < 13; i++) {
    const { status, body } = await sharePostcardFetch({
      to: `qa-wall-seed-${i}-${tag}`.slice(0, 50),
      from: `qa-wall-from-${tag}`.slice(0, 50),
      message: `wall seed message ${i} ${tag}`,
      deviceId: devices[Math.min(Math.floor(i / 5), 2)],
    });
    if (status !== 201) throw new Error(`seedWallDatasetFetch failed at ${i}: ${status} ${JSON.stringify(body)}`);
    rows.push(body);
  }
  return rows;
}
