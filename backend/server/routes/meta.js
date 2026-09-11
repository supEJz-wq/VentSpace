import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { supabase } from '../supabase.js';
import { check, sanitizeText } from '../lib/validate.js';
import { verifyPassword, issueToken, requireAdmin, revokeToken, normalizePassword } from '../lib/adminAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

// ══════════ ADMIN AUTH ══════════

// ── POST login: password checked SERVER-SIDE (never shipped to browser) ──
router.post('/admin/login', async (req, res) => {
  const raw = typeof req.body?.password === 'string' ? req.body.password : '';
  // Trim pasted clipboard artifacts (clip.exe appends CRLF) + strip quotes.
  const password = normalizePassword(raw);
  if (!verifyPassword(password)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  res.json({ token: issueToken() });   // 1-hour bearer token
});

// ── POST logout: revoke caller token + rotate PRIMARY password ──
// The BACKUP password (ADMIN_BACKUP_PASSWORD) never rotates — it stays valid
// so you always have a 2nd option when clipboard copy fails. Read it from .env.
router.post('/admin/logout', requireAdmin, async (req, res) => {
  try {
    revokeToken(req);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars[crypto.randomInt(chars.length)];
    }

    const envPath = path.join(__dirname, '..', '..', '..', '.env');
    let envContent = '';
    try { envContent = fs.readFileSync(envPath, 'utf-8'); } catch { }
    const lines = envContent.split('\n').filter(l => !l.startsWith('ADMIN_PASSWORD='));
    lines.push(`ADMIN_PASSWORD="${password}"`);
    fs.writeFileSync(envPath, lines.join('\n') + '\n');

    process.env.ADMIN_PASSWORD = password;

    // Best-effort server clipboard (only helps when server == your machine).
    // The client ALSO copies via navigator.clipboard from the `password` field below.
    // Windows-only: elsewhere `clip` doesn't exist (log noise on Linux hosts).
    if (process.platform === 'win32') {
      try { execSync('clip', { input: password }); } catch { }
    }

    console.log('[admin] Primary password reset — backup password unchanged (still in .env)');
    res.json({ ok: true, password });
  } catch (err) {
    console.error('[admin/logout]', err);
    res.status(500).json({ error: 'Could not reset password.' });
  }
});

// ── POST /api/admin/copy-password — return current password so the BROWSER ──
// can copy it with navigator.clipboard. (Server-side `clip` alone only touches
// the server machine's clipboard — that's why paste used to fail.)
// 🔒 admin only. Query ?which=backup for the static fallback password.
router.post('/admin/copy-password', requireAdmin, async (req, res) => {
  const which = req.query?.which === 'backup' ? 'backup' : 'primary';
  const pw = which === 'backup' ? process.env.ADMIN_BACKUP_PASSWORD : process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(500).json({ error: 'No password set.' });
  if (process.platform === 'win32') {
    try { execSync('clip', { input: pw, stdio: ['pipe', 'ignore', 'ignore'] }); } catch { }
  }
  console.log(`[admin] ${which} password requested for client clipboard`);
  res.json({ ok: true, password: pw, which });
});

// ══════════ SETTINGS ══════════

// ── GET all settings (world-readable) ──
router.get('/settings', async (req, res) => {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) return res.status(500).json({ error: error.message });
  res.json(Object.fromEntries(data.map(r => [r.key, r.value])));
});

// ── PUT upsert a setting 🔒 admin only ──
router.put('/settings/:key', requireAdmin, async (req, res) => {
  // 🛡️ Only known setting keys may be modified
  const ALLOWED_KEYS = ['blacklisted_words', 'auto_delete_hours'];
  if (!ALLOWED_KEYS.includes(req.params.key)) {
    return res.status(400).json({ error: 'Unknown setting key.' });
  }

  const { value } = req.body || {};
  if (value === undefined || value === null) {
    return res.status(400).json({ error: 'value is required' });
  }
  if (req.params.key === 'auto_delete_hours') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 168) {
      return res.status(400).json({ error: 'auto_delete_hours must be between 1 and 168.' });
    }
  }
  if (req.params.key === 'blacklisted_words') {
    if (!Array.isArray(value) || value.some(w => typeof w !== 'string')) {
      return res.status(400).json({ error: 'blacklisted_words must be an array of strings.' });
    }
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ key: req.params.key, value });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ══════════ DEVICE IDENTITY ══════════

// ── GET identity for a device (validated uuid param) ──
router.get('/identity/:deviceId', async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.deviceId)) {
    return res.json(null);            // invalid id → simply no identity
  }
  const { data, error } = await supabase
    .from('device_identities')
    .select('*')
    .eq('device_id', req.params.deviceId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST lock a name to a device (validated) ──
router.post('/identity', async (req, res) => {
  const deviceId = req.body?.deviceId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(deviceId))) {
    return res.status(400).json({ error: 'Valid deviceId is required.' });
  }

  const username = check(req.body?.username, 'username').sanitize(50).required(2).max(50).done();
  if (!username.ok) return res.status(400).json({ error: username.error });

  // 🚨 Banned words never get locked into identities
  const blacklistRaw = await supabase.from('settings').select('value').eq('key', 'blacklisted_words').maybeSingle();
  const words = Array.isArray(blacklistRaw.data?.value) ? blacklistRaw.data.value : [];
  const lower = username.value.toLowerCase();
  if (words.some(w => typeof w === 'string' && w.trim() && lower.includes(w.trim().toLowerCase()))) {
    return res.status(400).json({ error: 'Banned words are not allowed in names.' });
  }

  // Re-anchor created_at on every lock: without it an upsert-conflict keeps the
  // ORIGINAL timestamp, so a name locked again after expiry would instantly
  // read as expired (5-hour window never restarts).
  const { error } = await supabase
    .from('device_identities')
    .upsert({ device_id: deviceId, username: username.value, created_at: new Date().toISOString() });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── DELETE identity (unlock name) 🔒 admin only ──
router.delete('/identity/:deviceId', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('device_identities')
    .delete()
    .eq('device_id', req.params.deviceId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ══════════ REPORTED POSTS ══════════

// ── GET all reported post ids ──
router.get('/reports', async (req, res) => {
  const { data, error } = await supabase.from('reported_posts').select('post_id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST report a post (validated id) ──
router.post('/reports', async (req, res) => {
  const postId = Number(req.body?.postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: 'postId is required' });
  }

  const { error } = await supabase.from('reported_posts').upsert([{ post_id: postId }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── DELETE un-report a post ──
router.delete('/reports/:postId', async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: 'Invalid postId.' });
  }

  const { error } = await supabase
    .from('reported_posts')
    .delete()
    .eq('post_id', postId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ══════════ BUG REPORTS / IDEAS ══════════

// ── GET all bug reports (newest first) ──
router.get('/bug-reports', async (req, res) => {
  const { data, error } = await supabase
    .from('bug_reports')
    .select('id, text, reporter_name, device_id, type, created_at, image_url')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST submit a bug report / idea (validated + sanitized) ──
router.post('/bug-reports', async (req, res) => {
  const type = check(req.body?.type ?? 'bug', 'type')
    .oneOf(['bug', 'suggestion']).done();
  if (!type.ok) return res.status(400).json({ error: type.error });

  const text = check(req.body?.text, 'text').sanitize(1000).required(1).max(1000).done();
  if (!text.ok) return res.status(400).json({ error: text.error });

  const reporterName = sanitizeText(req.body?.reporterName ?? '', 50) || null;
  const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.slice(0, 64) : null;

  // Optional screenshot: base64 payload capped at ~2 MB
  let image = null;
  const rawImage = req.body?.image;
  if (rawImage?.base64 && rawImage?.fileName) {
    if (typeof rawImage.base64 !== 'string' || rawImage.base64.length > 3_000_000) {
      return res.status(400).json({ error: 'Screenshot too large (max ~2MB).' });
    }
    image = {
      fileName: String(rawImage.fileName).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80),
      contentType: /^image\/(png|jpe?g|webp|gif)$/i.test(String(rawImage.contentType))
        ? rawImage.contentType : 'image/png',
      base64: rawImage.base64,
    };
  }

  let imageUrl = null;
  if (image) {
    try {
      const buffer = Buffer.from(image.base64, 'base64');
      const fileName = `${deviceId || 'anon'}-${Date.now()}-${image.fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('bug_reports')
        .upload(fileName, buffer, { contentType: image.contentType });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('bug_reports').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      } else {
        console.error('Image upload failed:', uploadError.message);
      }
    } catch (err) {
      console.error('Image processing failed:', err.message);
    }
  }

  const { data, error } = await supabase
    .from('bug_reports')
    .insert([{
      text: text.value,
      reporter_name: reporterName,
      device_id: deviceId,
      type: type.value,
      image_url: imageUrl,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── DELETE single bug report 🔒 admin only ──
router.delete('/bug-reports/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('bug_reports')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── DELETE multiple bug reports 🔒 admin only ──
router.post('/bug-reports/delete-batch', requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.filter(id => typeof id === 'string' && id.length <= 40)
    : [];
  if (!ids.length) return res.status(400).json({ error: 'ids array is required' });

  const { error } = await supabase.from('bug_reports').delete().in('id', ids);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ══════════ ADMIN / DEV TOOLS 🔒 ══════════

// ── POST unlock ALL names 🔒 admin only ──
// Clears every device identity → all name locks reset, anyone can pick a new name.
router.post('/admin/unlock-all-names', requireAdmin, async (_req, res) => {
  const { error } = await supabase
    .from('device_identities')
    .delete()
    .neq('created_at', '1970-01-01');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST delete ALL feed posts 🔒 admin only ──
// Comments + reports cascade-delete with their posts (FK ON DELETE CASCADE).
router.post('/admin/delete-all-posts', requireAdmin, async (_req, res) => {
  const { error } = await supabase.from('posts').delete().neq('id', 0);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST delete ALL map notes 🔒 admin only ──
router.post('/admin/delete-all-map-notes', requireAdmin, async (_req, res) => {
  const { error } = await supabase
    .from('map_notes')
    .delete()
    .neq('created_at', '1970-01-01');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST hard reset — wipe posts, identities, postcards, map notes (DEV ONLY) ──
router.post('/admin/hard-reset', requireAdmin, async (req, res) => {
  const [err1, err2, err3, err4] = await Promise.all([
    supabase.from('posts').delete().neq('id', 0),
    supabase.from('device_identities').delete().neq('created_at', '1970-01-01'),
    supabase.from('postcards').delete().neq('id', 0),
    supabase.from('map_notes').delete().neq('created_at', '1970-01-01'),
  ].map(p => p.then(r => r.error)));

  if (err1 || err2 || err3 || err4) {
    return res.status(500).json({ error: err1?.message || err2?.message || err3?.message || err4?.message });
  }
  res.json({ ok: true });
});

export default router;
