import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../lib/adminAuth.js';
import {
  sanitizeText,
  isUuid,
  getBlacklistedWords,
  containsBlacklisted,
} from '../lib/validate.js';

const router = Router();

// ── Philippines geographic bounds (server-side enforcement) ──────
// Rough bbox of the archipelago; DB CHECK constraint mirrors this.
const PH = { latMin: 4.4, latMax: 21.2, lngMin: 115.0, lngMax: 131.0 };

const NOTE_TTL_HOURS = 5;
const MAX_NOTES_PER_DEVICE_PER_HOUR = 10;

const inPhilippines = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= PH.latMin && lat <= PH.latMax &&
  lng >= PH.lngMin && lng <= PH.lngMax;

// ── GET /api/map/notes — all active pins ─────────────────────────
router.get('/notes', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('map_notes')
      .select('id, name, message, latitude, longitude, created_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ error: 'Failed to load notes.' });
    res.json(data || []);
  } catch (err) {
    console.error('[map/notes GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/map/notes — place a pin ────────────────────────────
router.post('/notes', async (req, res) => {
  try {
    const deviceId = req.body?.deviceId;
    if (!isUuid(deviceId)) return res.status(400).json({ error: 'Invalid device identity.' });

    // ── Validation ──
    const name = sanitizeText(req.body?.name ?? '', 30);
    const message = sanitizeText(req.body?.message ?? '', 500);
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);

    if (name.length < 1) return res.status(400).json({ error: 'Name is required (max 30 characters).' });
    if (message.length < 1) return res.status(400).json({ error: 'Message is required (max 500 characters).' });
    if (!inPhilippines(latitude, longitude)) {
      return res.status(400).json({ error: 'Pins can only be placed inside the Philippines.' });
    }

    // ── Spam / abuse checks ──
    const blacklist = await getBlacklistedWords(supabase);
    if (blacklist.length && (containsBlacklisted(name, blacklist) || containsBlacklisted(message, blacklist))) {
      return res.status(400).json({ error: 'Your note contains a blocked word.' });
    }

    // Per-device rate limit: max N notes per rolling hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from('map_notes')
      .select('id', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('created_at', oneHourAgo);

    if (countErr) console.error('[map/notes count]', countErr.message);
    if (!countErr && count >= MAX_NOTES_PER_DEVICE_PER_HOUR) {
      return res.status(429).json({
        error: `You've placed ${count} notes in the last hour. Take a break! 🗺️`,
      });
    }

    // ── Insert (DB default sets expires_at = now() + 5 hours) ──
    const expires_at = new Date(Date.now() + NOTE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('map_notes')
      .insert([{ device_id: deviceId, name, message, latitude, longitude, expires_at }])
      .select('id, name, message, latitude, longitude, created_at, expires_at')
      .single();

    if (error) return res.status(500).json({ error: 'Could not save your note.' });
    res.status(201).json(data);
  } catch (err) {
    console.error('[map/notes POST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/map/all-notes 🔒 admin — every note (incl. expired) with device_id ──
router.get('/all-notes', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('map_notes')
      .select('id, name, message, latitude, longitude, device_id, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) return res.status(500).json({ error: 'Failed to load notes.' });
    res.json(data || []);
  } catch (err) {
    console.error('[map/all-notes GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/map/notes/:id 🔒 admin — remove a single note ──
router.delete('/notes/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid note id.' });

    const { error } = await supabase.from('map_notes').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Could not delete note.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[map/notes DELETE]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
