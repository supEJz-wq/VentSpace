// tests/api/mapApi.js — seeding + reads for map notes (mirrors backend/routes/map.js).
// USE: `createNote()` for pins (Manila default, inside PH); `getNotes()` for badge/presence asserts.
// Rate cap: 10 notes per rolling hour per device — spread seeds across devices.
import { newDeviceId } from '../fixtures/devices.js';

// Manila default — safely inside the PH bbox (4.4–21.2 / 115–131) the server enforces.
export const MANILA = { latitude: 14.5995, longitude: 120.9842 };

// Places one pin via POST /api/map/notes. Returns { status, body } for limit/validation asserts.
export async function createNote(request, { name, message, latitude = MANILA.latitude, longitude = MANILA.longitude, deviceId = newDeviceId() } = {}) {
  const res = await request.post('/api/map/notes', { data: { name, message, latitude, longitude, deviceId } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

// Reads active pins (expires_at > now, max 500, newest first).
export async function getNotes(request) {
  const res = await request.get('/api/map/notes');
  if (!res.ok()) throw new Error(`getNotes failed: ${res.status()}`);
  return res.json();
}

// Locks a username to a device for name-prefill tests (MAP-7). Thin wrapper over identity.
export async function lockName(request, deviceId, username) {
  const res = await request.post('/api/identity', { data: { deviceId, username } });
  if (!res.ok()) throw new Error(`lockName failed: ${res.status()} ${await res.text()}`);
}
