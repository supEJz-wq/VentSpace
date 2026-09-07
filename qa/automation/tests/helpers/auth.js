// tests/helpers/auth.js — admin login via API (never scrape the password from UI).
// USE: `const token = await loginAdminToken(request)` then pass `adminHeaders(token)` to admin API calls.
let cachedToken = null;
let cachedExp = 0;

// Returns the cached token when still fresh — avoids bursting the 10-login/15min rate limit.
export async function loginAdminToken(request) {
  // USE: call once per cleanup/setup needing admin rights — needs ADMIN_PASSWORD env set.
  // This is for getting the 1-hour `x-admin-token` without touching the login form.
  if (cachedToken && Date.now() < cachedExp) return cachedToken;
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD env is required for admin API helpers');
  const res = await request.post('/api/admin/login', { data: { password } });
  if (!res.ok()) throw new Error(`admin login failed: ${res.status()}`);
  const { token } = await res.json();
  cachedToken = token;
  cachedExp = Date.now() + 50 * 60 * 1000;
  return token;
}

// Builds the `x-admin-token` header the backend requires for all admin routes.
export function adminHeaders(token) {
  return { 'x-admin-token': token };
}

// Drops the cached token (call after logout rotation — old tokens die with the password).
// USE: `clearAuthCache()` right after re-syncing ADMIN_PASSWORD from disk.
export function clearAuthCache() {
  cachedToken = null;
  cachedExp = 0;
}

// Re-reads ADMIN_PASSWORD from the repo-root .env into process.env (logout rewrites that file).
// USE: after the logout test, so later files keep logging in. Returns the fresh password.
export async function resyncAdminPassword() {
  // USE: call once after logout rotation — never during normal suites (it hits the disk).
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const raw = await readFile(join(process.cwd(), '.env'), 'utf-8');
  const line = raw.split('\n').find((l) => l.startsWith('ADMIN_PASSWORD='));
  if (!line) throw new Error('ADMIN_PASSWORD missing from .env after logout');
  const fresh = line.split('=').slice(1).join('=').replace(/^"(.*)"$/, '$1');
  process.env.ADMIN_PASSWORD = fresh;
  clearAuthCache();
  return fresh;
}
