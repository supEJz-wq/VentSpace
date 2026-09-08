// tests/helpers/cleanup.js — isolate suites. NEVER run against non-localhost baseURL.
// USE: `await hardResetDatabase(request)` inside tests, or `await globalReset()` in beforeAll
// (beforeAll cannot use the test-scoped `request` fixture, so globalReset uses fetch instead).
const API = 'http://localhost:3001';

// Internal guard — refuses wipes against non-local envs. Called by both reset helpers.
function assertLocal() {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  if (!base.includes('localhost') && !base.includes('127.0.0.1')) {
    throw new Error(`Refusing hard-reset against non-local base: ${base}`);
  }
}

// Wipes posts+identities+postcards+map_notes via the Playwright request fixture. Use inside tests.
export async function hardResetDatabase(request) {
  assertLocal();
  const { loginAdminToken, adminHeaders } = await import('./auth.js');
  const token = await loginAdminToken(request);
  const res = await request.post('/api/admin/hard-reset', { headers: adminHeaders(token) });
  if (!res.ok()) throw new Error(`hard-reset failed: ${res.status()}`);
}

// Same wipe via plain fetch for beforeAll hooks (no fixtures available there).
export async function globalReset() {
  assertLocal();
  const doLogin = (password) => fetch(`${API}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  let password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD env is required for globalReset');
  let login = await doLogin(password);
  if (login.status === 401) {
    // Same rotation hazard as loginAdminToken (ADM-2/API-ADMIN-LOGOUT rewrite
    // .env) — re-sync from disk and retry exactly once.
    const { resyncAdminPassword } = await import('./auth.js');
    password = await resyncAdminPassword();
    login = await doLogin(password);
  }
  if (!login.ok) throw new Error(`globalReset login failed: ${login.status}`);
  const { token } = await login.json();
  const res = await fetch(`${API}/api/admin/hard-reset`, {
    method: 'POST',
    headers: { 'x-admin-token': token },
  });
  if (!res.ok) throw new Error(`globalReset failed: ${res.status}`);
}
