import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import postsRouter from './routes/posts.js';
import postcardsRouter from './routes/postcards.js';
import metaRouter from './routes/meta.js';
import mapRouter from './routes/map.js';
import { supabase } from './supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── AUTO-GENERATE ADMIN PASSWORDS (first run only) ──────────────────────────
// ADMIN_PASSWORD        = primary, rotates on logout (copied to clipboard).
// ADMIN_BACKUP_PASSWORD = static fallback, NEVER auto-rotated — your 2nd option
//                         when clipboard copy fails. Read it straight from .env.
function randomAdminPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars[crypto.randomInt(chars.length)];
  }
  return password;
}

function upsertEnvPassword(envContent, key, password) {
  const lines = envContent.split('\n').filter(l => !l.startsWith(`${key}=`));
  lines.push(`${key}="${password}"`);
  return lines.join('\n') + '\n';
}

function ensureAdminPassword() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  let envContent = '';
  try { envContent = fs.readFileSync(envPath, 'utf-8'); } catch { }
  let dirty = false;

  if (!process.env.ADMIN_PASSWORD) {
    const password = randomAdminPassword();
    envContent = upsertEnvPassword(envContent, 'ADMIN_PASSWORD', password);
    process.env.ADMIN_PASSWORD = password;
    dirty = true;

    // Copy to clipboard (best-effort, server machine only — see /admin/copy-password
    // which returns the password so the BROWSER can copy it client-side).
    try { execSync('clip', { input: password }); } catch { }

    console.log('');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│  🔐  ADMIN PASSWORD GENERATED               │');
    console.log(`│  ${password.padEnd(41)}│`);
    console.log('│                                             │');
    console.log('│  ✅ Copied to clipboard — paste it somewhere│');
    console.log('│  Written to .env — never shown again.       │');
    console.log('└─────────────────────────────────────────────┘');
    console.log('');
  }

  // 2nd option: static backup password for when clipboard copy fails.
  if (!process.env.ADMIN_BACKUP_PASSWORD) {
    const backup = randomAdminPassword();
    envContent = upsertEnvPassword(envContent, 'ADMIN_BACKUP_PASSWORD', backup);
    process.env.ADMIN_BACKUP_PASSWORD = backup;
    dirty = true;
    console.log('[admin] ADMIN_BACKUP_PASSWORD generated — use it from .env when clipboard fails.');
  }

  if (dirty) fs.writeFileSync(envPath, envContent);
}

ensureAdminPassword();
const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);            // correct client IPs behind Vercel/proxies
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── ⏱️ RATE LIMITING (per IP, on top of per-device limits in routes) ────────
// E2E_DISABLE_RATE_LIMIT=1 bypasses the IP limiters entirely. It is set ONLY
// for the throwaway server Playwright boots in CI/local e2e runs (see
// qa/automation/playwright.config.js webServer env). Production (`npm start`)
// never sets it, so real deployments stay protected. Per-device limits inside
// the routes (5 posts/device, 1 name lock, …) still apply — tests rely on them.
const BYPASS_RATE_LIMIT = process.env.E2E_DISABLE_RATE_LIMIT === '1';
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,                             // generous; device limits are tighter
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many writes. Try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                             // higher limit since password resets on logout
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

if (BYPASS_RATE_LIMIT) {
  console.log('[rate-limit] DISABLED via E2E_DISABLE_RATE_LIMIT=1 (test server only)');
} else {
  app.use('/api', globalLimiter);
  app.use(['/api/posts', '/api/postcards', '/api/bug-reports', '/api/reports', '/api/identity', '/api/map'],
    (req, res, next) => (req.method === 'GET' ? next() : writeLimiter(req, res, next)));
  app.use('/api/admin/login', loginLimiter);
}

// ── API ROUTES ──
app.use('/api/posts', postsRouter);
app.use('/api/postcards', postcardsRouter);
app.use('/api/map', mapRouter);
app.use('/api', metaRouter);

// ── HEALTH CHECK ──
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── 🗑️ AUTOMATIC EXPIRATION ─────────────────────────────────────────────────
// Server-side safety net: purges expired posts AND map notes every 15 minutes.
// (The feed/map also hide anything past expiry; this reclaims the rows.)
async function runPurge() {
  try {
    const { error } = await supabase.rpc('purge_expired_posts');
    if (error) console.error('[purge] posts failed:', error.message);

    const { error: mapErr } = await supabase.rpc('purge_expired_map_notes');
    if (mapErr) console.error('[purge] map notes failed:', mapErr.message);
    else console.log(`[purge] ok @ ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[purge] crashed:', err.message);
  }
}
runPurge();                                    // once on boot
setInterval(runPurge, 15 * 60 * 1000);         // then every 15 min

// ── SERVE BUILT FRONTEND (production) ──
const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distDir, 'index.html'));
});

// ── ERROR HANDLER ──
app.use((err, req, res) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`VentSpace API server running on http://localhost:${PORT}`);
});
