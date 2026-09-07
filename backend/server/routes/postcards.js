import { Router } from 'express';
import { supabase } from '../supabase.js';
import {
  check, FONTS, ALIGNS, BORDER_STYLES,
  sanitizeStickers,
} from '../lib/validate.js';
import { requireAdmin } from '../lib/adminAuth.js';

const router = Router();

// ── GET all postcards (newest first — world-readable) ──
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('postcards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST share a postcard 🛡️ fully validated ──────────────────────────────
// Rate limit unchanged: 5 per rolling 24h per device.
router.post('/', async (req, res) => {
  const b = req.body || {};

  // 🛡️ Text fields — sanitized (HTML stripped) + length-capped
  const to = check(b.to, 'to').sanitize(60).required(1).max(60).done();
  if (!to.ok) return res.status(400).json({ error: to.error });

  const from = check(b.from, 'from').sanitize(60).required(1).max(60).done();
  if (!from.ok) return res.status(400).json({ error: from.error });

  const message = check(b.message ?? '', 'message').sanitize(500).max(500).done();
  if (!message.ok) return res.status(400).json({ error: message.error });

  // 🛡️ Enum whitelists
  const bgType = check(b.bgType ?? 'solid', 'bgType').oneOf(['solid', 'gradient']).done();
  if (!bgType.ok) return res.status(400).json({ error: bgType.error });

  const align = check(b.align ?? 'center', 'align').oneOf(ALIGNS).done();
  if (!align.ok) return res.status(400).json({ error: align.error });

  const borderStyle = check(b.borderStyle ?? 'elegant', 'borderStyle').oneOf(BORDER_STYLES).done();
  if (!borderStyle.ok) return res.status(400).json({ error: borderStyle.error });

  // 🛡️ Font must come from the app's own list (blocks CSS injection)
  const font = check(
    b.font ?? "'Georgia', serif", 'font',
  ).oneOf(FONTS).done();
  if (!font.ok) return res.status(400).json({ error: font.error });

  // 🛡️ Colors: strict hex only; gradients: strict linear-gradient(135deg,#hex,#hex)
  const bgColor = check(b.bgColor ?? '#fce7f3', 'bgColor').hexColor().done();
  if (!bgColor.ok) return res.status(400).json({ error: bgColor.error });

  const textColor = check(b.textColor ?? '#1f2937', 'textColor').hexColor().done();
  if (!textColor.ok) return res.status(400).json({ error: textColor.error });

  let bgGradient = '';
  if (bgType.value === 'gradient') {
    const g = check(b.bgGradient ?? '', 'bgGradient').gradient().done();
    if (!g.ok) return res.status(400).json({ error: g.error });
    bgGradient = g.value;
  }

  // 🔑 Ownership token for rate limiting
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(b.deviceId))) {
    return res.status(400).json({ error: 'Valid deviceId is required.' });
  }

  // ⏱️ Rate limit — 5 per rolling 24h per device
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('postcards')
    .select('*', { count: 'exact', head: true })
    .eq('device_id', b.deviceId)
    .gte('created_at', yesterday);

  if (countError) return res.status(500).json({ error: countError.message });
  if ((count ?? 0) >= 5) return res.status(429).json({ error: 'LIMIT_REACHED' });

  const { data, error } = await supabase
    .from('postcards')
    .insert([{
      to: to.value,
      from: from.value,
      message: message.value || null,
      bg_type: bgType.value,
      bg_color: bgColor.value,
      bg_gradient: bgGradient,
      text_color: textColor.value,
      font: font.value,
      align: align.value,
      stickers: sanitizeStickers(b.stickers),
      border_style: borderStyle.value,
      device_id: b.deviceId,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── DELETE single postcard 🔒 admin only ──
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid postcard id.' });
  }

  const { error } = await supabase.from('postcards').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── DELETE multiple postcards 🔒 admin only ──
router.post('/delete-batch', requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map(Number).filter(n => Number.isInteger(n) && n > 0)
    : [];
  if (!ids.length) return res.status(400).json({ error: 'ids array is required' });

  const { error } = await supabase.from('postcards').delete().in('id', ids);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
