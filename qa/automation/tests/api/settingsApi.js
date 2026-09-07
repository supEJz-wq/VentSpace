// tests/api/settingsApi.js — admin settings access for blacklist tests (mirrors backend/routes/meta.js).
// USE: `await setBlacklistedWords(request, ['word'])` then reload the page; restore with `[]`.
import { loginAdminToken, adminHeaders } from '../helpers/auth.js';

// Replaces the whole blacklisted_words list. Returns after the PUT succeeds.
export async function setBlacklistedWords(request, words) {
  const token = await loginAdminToken(request);
  const res = await request.put('/api/settings/blacklisted_words', {
    headers: adminHeaders(token),
    data: { value: words },
  });
  if (!res.ok()) throw new Error(`setBlacklistedWords failed: ${res.status()} ${await res.text()}`);
}

// Reads current settings (used to restore state after blacklist tests).
export async function getSettings(request) {
  const res = await request.get('/api/settings');
  if (!res.ok()) throw new Error(`getSettings failed: ${res.status()}`);
  return res.json();
}

const DIRECT_API = 'http://localhost:3001';

// Plain-fetch variants for beforeAll hooks (no `request` fixture available there).
async function adminTokenFetch() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD env is required');
  const res = await fetch(`${DIRECT_API}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`admin login failed: ${res.status}`);
  return (await res.json()).token;
}

// Reads current settings via fetch. Used in F7 to save/restore the blacklist.
export async function getSettingsFetch() {
  const res = await fetch(`${DIRECT_API}/api/settings`);
  if (!res.ok) throw new Error(`getSettingsFetch failed: ${res.status}`);
  return res.json();
}

// Replaces the whole blacklisted_words list via fetch. Used in F7 setup/teardown.
export async function setBlacklistedWordsFetch(words) {  const token = await adminTokenFetch();
  const res = await fetch(`${DIRECT_API}/api/settings/blacklisted_words`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ value: words }),
  });
  if (!res.ok) throw new Error(`setBlacklistedWordsFetch failed: ${res.status} ${await res.text()}`);
}
