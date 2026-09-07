// ─── INPUT VALIDATION & SANITIZATION ────────────────────────────────────────
// Defense-in-depth: DB CHECK constraints are the last line; these run first.
// React escapes output, but we still strip HTML so no consumer ever sees tags.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const GRADIENT_RE =
  /^linear-gradient\(\s*135deg,\s*#[0-9a-f]{3,6}\s*,\s*#[0-9a-f]{3,6}\s*\)$/i;

export const MOODS = ['Happy', 'Sad', 'Angry', 'Hopeful', 'Anxious'];
export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👏'];
export const FONTS = [
  "'Georgia', serif",
  "'Inter', sans-serif",
  "'Comic Sans MS', cursive",
  "'Times New Roman', serif",
  "'Caveat', cursive",
  "'Dancing Script', cursive",
  "'Pacifico', cursive",
  "'Lobster', cursive",
  "'Raleway', sans-serif",
  "'Merriweather', serif",
  "'Satisfy', cursive",
  "'Permanent Marker', cursive",
  "'Playfair Display', serif",
];
export const ALIGNS = ['left', 'center', 'right'];
export const BORDER_STYLES = ['none', 'elegant', 'dashed'];

/** Strip HTML tags + control chars, collapse runs of whitespace, trim. */
export function sanitizeText(input, maxLen) {
  if (typeof input !== 'string') return '';
  let out = input
    .replace(/<[^>]*>/g, '')            // strip any tag: <script>, <img …>
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // control chars
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (maxLen && out.length > maxLen) out = out.slice(0, maxLen);
  return out;
}

export function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function isHexColor(v) {
  return typeof v === 'string' && HEX_COLOR_RE.test(v);
}

export function isGradient(v) {
  return typeof v === 'string' && GRADIENT_RE.test(v);
}

/** Validate an emoji reaction against the app whitelist. */
export function isValidReaction(emoji) {
  return emoji === null || REACTION_EMOJIS.includes(emoji);
}

/** Validate a stickers array: ≤20 items, each { emoji, x, y } with positions (0-100). */
export function sanitizeStickers(stickers) {
  if (!Array.isArray(stickers)) return [];
  return stickers
    .filter(s => s && typeof s === 'object' && typeof s.emoji === 'string' && s.emoji.length > 0 && s.emoji.length <= 8)
    .map(s => ({
      emoji: s.emoji,
      x: Math.min(100, Math.max(0, Number(s.x) || 50)),
      y: Math.min(100, Math.max(0, Number(s.y) || 50)),
    }))
    .slice(0, 20);
}

/** Load blacklisted words from settings (used for spam/abuse blocking). */
export async function getBlacklistedWords(supabase) {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'blacklisted_words')
      .maybeSingle();
    const words = data?.value;
    return Array.isArray(words) ? words.filter(w => typeof w === 'string' && w.trim()) : [];
  } catch {
    return [];
  }
}

/** True if text contains any blacklisted word (case-insensitive). */
export function containsBlacklisted(text, words) {
  const t = String(text || '').toLowerCase();
  return words.some(w => w.trim() && t.includes(w.trim().toLowerCase()));
}

/** Normalize text for duplicate detection (spam check). */
export function normalizeForDuplicate(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Field validator. Returns { ok, value?, error? }.
 * Usage: check(body.username, 'username').sanitize(30).required()
 */
export function check(value, field) {
  const state = { value, field, error: null };
  const api = {
    sanitize(maxLen) {
      if (state.error) return api;
      state.value = sanitizeText(state.value, maxLen);
      return api;
    },
    required(min = 1) {
      if (state.error) return api;
      if (typeof state.value !== 'string' || state.value.length < min) {
        state.error = `${field} is required (min ${min} chars).`;
      }
      return api;
    },
    max(maxLen) {
      if (state.error) return api;
      if (typeof state.value === 'string' && state.value.length > maxLen) {
        state.error = `${field} is too long (max ${maxLen} chars).`;
      }
      return api;
    },
    oneOf(list) {
      if (state.error) return api;
      if (!list.includes(state.value)) {
        state.error = `${field} must be one of: ${list.join(', ')}.`;
      }
      return api;
    },
    uuid() {
      if (state.error) return api;
      if (!isUuid(state.value)) state.error = `${field} must be a valid device id.`;
      return api;
    },
    hexColor() {
      if (state.error) return api;
      if (!isHexColor(state.value)) state.error = `${field} must be a valid color.`;
      return api;
    },
    gradient() {
      if (state.error) return api;
      if (!isGradient(state.value)) state.error = `${field} has an invalid gradient.`;
      return api;
    },
    done() {
      return state.error ? { ok: false, error: state.error } : { ok: true, value: state.value };
    },
  };
  return api;
}
