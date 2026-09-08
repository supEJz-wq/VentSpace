import { Router } from 'express';
import { supabase } from '../supabase.js';
import {
  MOODS, check, sanitizeText,
  isValidReaction, getBlacklistedWords,
  containsBlacklisted, normalizeForDuplicate,
} from '../lib/validate.js';
import { isAdmin, requireAdmin } from '../lib/adminAuth.js';

const router = Router();

// ── TIMING CONFIG (driven by settings.auto_delete_hours, fallback 5h) ──
const DEFAULT_AUTO_DELETE_HOURS = 5;
const POST_LIMIT = 5;                       // max posts per window per device

let _hoursCache = { value: null, at: 0 };
async function getAutoDeleteHours() {
  if (_hoursCache.value && Date.now() - _hoursCache.at < 60_000) return _hoursCache.value;
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'auto_delete_hours')
    .maybeSingle();
  const raw = data?.value;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  const hours = Number.isFinite(n) && n > 0 ? n : DEFAULT_AUTO_DELETE_HOURS;
  _hoursCache = { value: hours, at: Date.now() };
  return hours;
}

const cutoffISO = async () =>
  new Date(Date.now() - (await getAutoDeleteHours()) * 60 * 60 * 1000).toISOString();

// ── GET all active posts with nested comments (world-readable) ──
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, username, mood, text, likes, reactions, device_id, created_at,
      comments ( id, username, text, parent_id, created_at, reactions )
    `)
    .eq('is_deleted', false)
    .gte('created_at', await cutoffISO())
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST create a post ──
router.post('/', async (req, res) => {
  // 🛡️ Input validation
  const username = check(req.body?.username, 'username').sanitize(50).required(2).max(50).done();
  if (!username.ok) return res.status(400).json({ error: username.error });

  const mood = check(req.body?.mood, 'mood').oneOf(MOODS).done();
  if (!mood.ok) return res.status(400).json({ error: mood.error });

  const text = check(req.body?.text, 'text').sanitize(500).required(1).max(300).done();
  if (!text.ok) return res.status(400).json({ error: text.error });

  const deviceId = req.body?.deviceId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(deviceId))) {
    return res.status(400).json({ error: 'Valid deviceId is required.' });
  }

  // 🚨 Spam/abuse — blocklisted words never reach the database
  const blacklist = await getBlacklistedWords(supabase);
  if (containsBlacklisted(username.value, blacklist)) {
    return res.status(400).json({ error: 'Banned words are not allowed in names.' });
  }
  if (containsBlacklisted(text.value, blacklist)) {
    return res.status(400).json({ error: 'Your post contains a blocked word.' });
  }

  // ⏱️ Rate limit — max POST_LIMIT posts per auto_delete_hours window
  const windowStart = await cutoffISO();
  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .gte('created_at', windowStart);

  if (countError) return res.status(500).json({ error: countError.message });
  if ((count ?? 0) >= POST_LIMIT) return res.status(429).json({ error: 'RATE_LIMIT' });

  // 🚨 Spam/abuse — reject identical content from the same device in-window
  const { data: recent } = await supabase
    .from('posts')
    .select('text')
    .eq('device_id', deviceId)
    .gte('created_at', windowStart);
  const dupe = (recent ?? []).some(
    p => normalizeForDuplicate(p.text) === normalizeForDuplicate(text.value),
  );
  if (dupe) return res.status(429).json({ error: 'DUPLICATE' });

  const { data, error } = await supabase
    .from('posts')
    .insert([{
      username: username.value,
      mood: mood.value,
      text: text.value,                       // 🚫 HTML stripped by sanitizer
      device_id: deviceId,
      is_deleted: false, likes: 0, reactions: {},
    }])
    .select(`id, username, mood, text, likes, reactions, created_at, comments ( id, username, text, parent_id )`)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── GET post count by device in the active window ──
router.get('/device-count/:deviceId', async (req, res) => {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('device_id', req.params.deviceId)
    .gte('created_at', await cutoffISO());

  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count || 0 });
});

// ── POST purge expired posts 🔒 admin only ──
router.post('/purge', requireAdmin, async (req, res) => {
  const { error } = await supabase.rpc('purge_expired_posts');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── DELETE hard-delete all posts by device 🔒 admin only (dev tool) ──
router.delete('/device/:deviceId', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('device_id', req.params.deviceId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST like a post (harmless increment — open) ──
router.post('/:id/like', async (req, res) => {
  const id = Number(req.params.id);
  const currentLikes = Number(req.body?.currentLikes ?? 0);

  const { data, error } = await supabase
    .from('posts')
    .update({ likes: currentLikes + 1 })
    .eq('id', id)
    .select('likes')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ likes: data.likes });
});

// ── POST reaction on a post (emoji whitelist enforced) ──
router.post('/:id/reaction', async (req, res) => {
  const id = Number(req.params.id);
  const { emoji, prevEmoji, currentReactions } = req.body || {};

  // 🛡️ Only whitelisted emojis accepted
  if (!isValidReaction(emoji ?? null) || !isValidReaction(prevEmoji ?? null)) {
    return res.status(400).json({ error: 'Invalid reaction emoji.' });
  }

  const updated = { ...(currentReactions || {}) };
  if (emoji) updated[emoji] = (updated[emoji] || 0) + 1;
  if (prevEmoji && updated[prevEmoji] !== undefined) {
    updated[prevEmoji] = Math.max(0, (updated[prevEmoji] || 0) - 1);
  }

  const { error } = await supabase.from('posts').update({ reactions: updated }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reactions: updated });
});

// ── DELETE a post 🔐 owner-only (admin token overrides) ──
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const deviceId = String(req.query.deviceId || req.body?.deviceId || '');

  const { data: post } = await supabase
    .from('posts')
    .select('device_id')
    .eq('id', id)
    .maybeSingle();
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  // 🔐 Ownership: the requesting device must own the post or hold an admin token.
  const owns = deviceId && post.device_id === deviceId;
  if (!owns && !isAdmin(req)) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  const { error } = await supabase.from('posts').update({ is_deleted: true }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  // 🧹 Immediate cleanup: deleting the post also deletes its comments (replies
  // go via the parent_id cascade) and its moderation-queue entry — otherwise
  // they'd sit orphaned until the expiry purge hard-deletes the row.
  // (Children AFTER the post update: a failed post update must not orphan comments.)
  const [{ error: commentsError }, { error: reportsError }] = await Promise.all([
    supabase.from('comments').delete().eq('post_id', id),
    supabase.from('reported_posts').delete().eq('post_id', id),
  ]);
  if (commentsError) return res.status(500).json({ error: commentsError.message });
  if (reportsError) return res.status(500).json({ error: reportsError.message });
  res.json({ ok: true });
});

// ── POST comment / reply on a post ──
router.post('/:id/comments', async (req, res) => {
  const postId = Number(req.params.id);
  const parentIdRaw = req.body?.parentId;

  // 🛡️ Input validation
  const username = check(req.body?.username, 'username').sanitize(50).required(2).max(50).done();
  if (!username.ok) return res.status(400).json({ error: username.error });

  const text = check(req.body?.text, 'comment').sanitize(500).required(1).max(500).done();
  if (!text.ok) return res.status(400).json({ error: text.error });

  const deviceId = req.body?.deviceId;
  const validDevice =
    !deviceId || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(deviceId));
  if (!validDevice) return res.status(400).json({ error: 'Invalid deviceId.' });

  let parentId = null;
  if (parentIdRaw !== undefined && parentIdRaw !== null) {
    parentId = Number(parentIdRaw);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      return res.status(400).json({ error: 'Invalid parentId.' });
    }
  }

  // 🚨 Spam/abuse — blacklisted words blocked in comments too
  const blacklist = await getBlacklistedWords(supabase);
  if (containsBlacklisted(username.value, blacklist)) {
    return res.status(400).json({ error: 'Banned words are not allowed in names.' });
  }
  if (containsBlacklisted(text.value, blacklist)) {
    return res.status(400).json({ error: 'Your comment contains a blocked word.' });
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([{ post_id: postId, parent_id: parentId, username: username.value, text: text.value, device_id: deviceId || null }])
    .select('id, username, text, parent_id, reactions')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── DELETE comment 🔐 owner-only (admin token overrides) ──
router.delete('/comments/:commentId', async (req, res) => {
  const commentId = Number(req.params.commentId);
  const deviceId = String(req.query.deviceId || req.body?.deviceId || '');

  const { data: comment } = await supabase
    .from('comments')
    .select('device_id')
    .eq('id', commentId)
    .maybeSingle();
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  // 🔐 Ownership rules: device matches or caller holds an admin token
  const owns = deviceId && comment.device_id && comment.device_id === deviceId;
  if (!owns && !isAdmin(req)) {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST reaction on a comment (emoji whitelist enforced) ──
router.post('/comments/:commentId/reaction', async (req, res) => {
  const commentId = Number(req.params.commentId);
  const { emoji, prevEmoji, currentReactions } = req.body || {};

  if (!isValidReaction(emoji ?? null) || !isValidReaction(prevEmoji ?? null)) {
    return res.status(400).json({ error: 'Invalid reaction emoji.' });
  }

  const updated = { ...(currentReactions || {}) };
  if (emoji) updated[emoji] = (updated[emoji] || 0) + 1;
  if (prevEmoji && updated[prevEmoji] !== undefined) {
    updated[prevEmoji] = Math.max(0, (updated[prevEmoji] || 0) - 1);
  }

  const { error } = await supabase.from('comments').update({ reactions: updated }).eq('id', commentId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reactions: updated });
});

export default router;
