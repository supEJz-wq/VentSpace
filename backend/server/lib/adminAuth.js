// ─── ADMIN AUTH (server-side password + short-lived tokens) ────────────────
// The password NEVER ships to the browser bundle. Client logs in once,
// receives a 1-hour token, and sends it as x-admin-token on admin calls.

import crypto from 'crypto';

// Server-only: never use VITE_ prefix (Vite embeds those into the client bundle)

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const tokens = new Map();            // token -> expiresAt

function prune() {
  const now = Date.now();
  for (const [t, exp] of tokens) if (exp < now) tokens.delete(t);
}

/** Strip surrounding quotes/dotenv artifacts + trailing clipboard newlines. */
export function normalizePassword(pw) {
  let s = String(pw ?? '');
  s = s.trim();
  // dotenv already strips quotes, but pasted values may keep them
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

/** Constant-time password comparison against primary OR backup password. */
export function verifyPassword(pw) {
  const input = normalizePassword(pw);
  if (!input) return false;
  const candidates = [process.env.ADMIN_PASSWORD, process.env.ADMIN_BACKUP_PASSWORD]
    .map((c) => normalizePassword(c))
    .filter(Boolean);
  if (!candidates.length) return false;
  const a = Buffer.from(input);
  return candidates.some((secret) => {
    const b = Buffer.from(secret);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

/** Issue a fresh admin token. */
export function issueToken() {
  prune();
  const token = crypto.randomUUID();
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

/** True if request carries a valid admin token. */
export function isAdmin(req) {
  const raw = req.headers['x-admin-token'];
  if (!raw || typeof raw !== 'string') return false;
  const token = raw.trim();
  const exp = tokens.get(token);
  if (!exp || exp < Date.now()) { tokens.delete(token); return false; }
  return true;
}

/** Invalidate one token (used on logout so the calling session dies). */
export function revokeToken(req) {
  const token = req.headers['x-admin-token'];
  if (typeof token === 'string') tokens.delete(token.trim());
}

/** Express middleware — reject unless valid admin token. */
export function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'Admin authentication required.' });
}
