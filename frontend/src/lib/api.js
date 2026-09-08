// ─── REST API CLIENT ─────────────────────────────────────────────────────────
// All data access now goes through the Express backend (`/server`).
// In dev, Vite proxies `/api` → http://localhost:3001.
// Function signatures and return shapes are unchanged from the Supabase era.

import { getDeviceId, getStoredUsername } from './identity';

const API = '/api';
const ADMIN_TOKEN_KEY = 'ventspace_admin_token';

/** Fire a request; resolves with parsed JSON or null on failure (graceful). */
async function req(path, { method = 'GET', body, headers } = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      console.error(`API ${method} ${path} failed (${res.status}):`, errBody?.error || res.statusText);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error(`API ${method} ${path} network error:`, err.message);
    return null;
  }
}

// ─── ADMIN AUTH (server-verified; password never lives in the bundle) ───────

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export async function loginAdmin(password) {
  try {
    // Clipboard paste often drags in CRLF/spaces/quotes — clean before sending.
    let clean = String(password ?? '').trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1).trim();
    }
    const res = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: clean }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    return true;
  } catch {
    return false;
  }
}

export async function logoutAdmin() {
  const token = getAdminToken();
  let newPassword = null;
  if (token) {
    try {
      const res = await fetch(`${API}/admin/logout`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json().catch(() => null);
      if (data?.password) {
        newPassword = data.password;
        try { await navigator.clipboard.writeText(newPassword); } catch { /* clipboard blocked */ }
      }
    } catch (err) {
      console.warn('logoutAdmin error:', err.message);
    }
  }
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  return newPassword;
}

/** Fetch the current admin password (authed) AND copy it to the BROWSER clipboard.
 *  Returns the password string, or null on failure. Pass 'backup' for the
 *  static fallback password from .env (works even when primary rotation fails).
 *  NOTE: only callable while logged in — the login screen can't use this. */
export async function copyAdminPassword(which = 'primary') {
  try {
    const res = await fetch(`${API}/admin/copy-password?which=${which}`, {
      method: 'POST',
      headers: adminHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const pw = data?.password;
    if (!pw) return null;
    try {
      await navigator.clipboard.writeText(pw);
    } catch {
      // Clipboard API blocked (non-secure context/permissions) — caller shows fallback.
    }
    return pw;
  } catch (err) {
    console.warn('copyAdminPassword error:', err.message);
    return null;
  }
}

/** Attach x-admin-token when we have one (lets admins moderate others). */
function adminHeaders(extra = {}) {
  const t = getAdminToken();
  return t ? { 'x-admin-token': t, ...extra } : { ...extra };
}

// ─── POSTS ────────────────────────────────────────────────────────────────────

/** Fetch all non-expired posts with their nested comments */
export async function fetchPosts() {
  const data = await req('/posts');
  if (!data || !Array.isArray(data)) return [];
  return data.map(normalizePost);
}

/** Insert a new post (server enforces rate limit: 5 posts / 5 hours / device) */
export async function createPost({ username, mood, text, deviceId }) {
  const data = await req('/posts', { method: 'POST', body: { username, mood, text, deviceId } });
  if (!data) return null;
  return normalizePost(data);
}

/** Get count of posts by device in the active window */
export async function getDevicePostCount(deviceId) {
  const data = await req(`/posts/device-count/${deviceId}`);
  return data?.count ?? 0;
}

/** Purge all posts older than the auto-delete window (settings.auto_delete_hours) */
export async function purgeExpiredPosts() {
  await req('/posts/purge', { method: 'POST', headers: adminHeaders() });
}

/** Delete a post by id (Soft Delete + clears its comments & reports) — 🔐 ownership verified server-side */
export async function deletePost(id) {
  const params = new URLSearchParams({
    deviceId: getDeviceId(),
    username: getStoredUsername()?.name || '',
  });
  await req(`/posts/${id}?${params}`, { method: 'DELETE', headers: adminHeaders() });
}

/** Hard Delete all posts by a specific device (Developer Tool — admin only) */
export async function hardDeletePostsByDevice(deviceId) {
  await req(`/posts/device/${deviceId}`, { method: 'DELETE', headers: adminHeaders() });
}

/** Wipe EVERYTHING (Posts, Comments, Identities, Postcards) - admin only */
export async function hardResetDatabase() {
  await req('/admin/hard-reset', { method: 'POST', headers: adminHeaders() });
}

/** Unlock ALL name locks — every user can immediately choose a new name (admin only) */
export async function unlockAllNames() {
  await req('/admin/unlock-all-names', { method: 'POST', headers: adminHeaders() });
}

/** Delete ALL feed posts in one shot (comments cascade) — admin only */
export async function deleteAllPostsAdmin() {
  await req('/admin/delete-all-posts', { method: 'POST', headers: adminHeaders() });
}

/** Delete ALL map notes in one shot — admin only */
export async function deleteAllMapNotesAdmin() {
  await req('/admin/delete-all-map-notes', { method: 'POST', headers: adminHeaders() });
}

/** Fetch every map note (incl. expired) with device ids — admin only */
export async function fetchAllMapNotesAdmin() {
  return await req('/map/all-notes', { headers: adminHeaders() });
}

/** Delete a single map note by id — admin only */
export async function deleteMapNoteAdmin(id) {
  await req(`/map/notes/${id}`, { method: 'DELETE', headers: adminHeaders() });
}

/** Increment likes on a post */
export async function incrementLikes(id, currentLikes) {
  const data = await req(`/posts/${id}/like`, { method: 'POST', body: { currentLikes } });
  if (!data) return;
  // Keep DB authoritative if it diverged from the optimistic value
  return data.likes;
}

/** Add or switch an emoji reaction on a post.
 *  emoji     = new emoji (or null to remove)
 *  prevEmoji = previously selected emoji (or null if first reaction)
 */
export async function addReactionDB(id, emoji, prevEmoji, currentReactions) {
  const data = await req(`/posts/${id}/reaction`, {
    method: 'POST',
    body: { emoji, prevEmoji, currentReactions },
  });
  return data?.reactions ?? null;
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────

/** Add a comment to a post — 🔐 stores device ownership */
export async function addCommentDB(postId, username, text) {
  const data = await req(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { username, text, deviceId: getDeviceId() },
  });
  if (!data) return null;
  return normalizeComment(data);
}

/** Add a reply to a comment — 🔐 stores device ownership */
export async function addReplyDB(postId, parentId, username, text) {
  const data = await req(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { username, text, parentId, deviceId: getDeviceId() },
  });
  if (!data) return null;
  return normalizeComment(data);
}

/** Delete a comment (replies cascade) — 🔐 ownership verified server-side */
export async function deleteCommentDB(commentId) {
  const params = new URLSearchParams({
    deviceId: getDeviceId(),
    username: getStoredUsername()?.name || '',
  });
  const data = await req(`/posts/comments/${commentId}?${params}`, {
    method: 'DELETE', headers: adminHeaders(),
  });
  return !!data;
}

/** Add or switch an emoji reaction on a comment. */
export async function addCommentReactionDB(commentId, emoji, prevEmoji, currentReactions) {
  const data = await req(`/posts/comments/${commentId}/reaction`, {
    method: 'POST',
    body: { emoji, prevEmoji, currentReactions },
  });
  return data?.reactions ?? null;
}

// ─── REPORTED POSTS ───────────────────────────────────────────────────────────

/** Fetch all reported post ids */
export async function fetchReportedIds() {
  const data = await req('/reports');
  if (!data || !Array.isArray(data)) return [];
  return data.map(r => r.post_id);
}

/** Report a post */
export async function reportPost(postId) {
  await req('/reports', { method: 'POST', body: { postId } });
}

/** Un-report a post */
export async function unreportPost(postId) {
  await req(`/reports/${postId}`, { method: 'DELETE' });
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

/** Fetch all settings */
export async function fetchSettings() {
  const data = await req('/settings');
  return data ?? {};
}

/** Update a setting by key (admin token required — was missing, caused silent 401s) */
export async function updateSetting(key, value) {
  await req(`/settings/${encodeURIComponent(key)}`, { method: 'PUT', headers: adminHeaders(), body: { value } });
}

// ─── IDENTITY MANAGEMENT ─────────────────────────────────────────────────────

/** Get the locked identity for a device */
export async function getIdentity(deviceId) {
  return await req(`/identity/${deviceId}`);
}

/** Lock a name to a device */
export async function lockIdentity(deviceId, username) {
  await req('/identity', { method: 'POST', body: { deviceId, username } });
}

/** Unlock/Reset a name for a device 🔒 admin only */
export async function resetIdentity(deviceId) {
  await req(`/identity/${deviceId}`, { method: 'DELETE', headers: adminHeaders() });
}

// ─── BUG REPORTS ─────────────────────────────────────────────────────────────

/** Convert a File to base64 (without the data-url prefix) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Submit a new bug report or feedback */
export async function createBugReport({ text, reporterName, deviceId, type = 'bug', imageFile = null }) {
  let image = null;

  if (imageFile) {
    try {
      image = {
        fileName: imageFile.name,
        contentType: imageFile.type || 'image/png',
        base64: await fileToBase64(imageFile),
      };
    } catch (err) {
      console.error('Image encoding failed:', err.message);
    }
  }

  const data = await req('/bug-reports', {
    method: 'POST',
    body: { text, reporterName, deviceId, type, image },
  });
  return data;
}

/** Fetch all bug reports and user ideas (newest first) */
export async function fetchBugReports() {
  const data = await req('/bug-reports');
  if (!data || !Array.isArray(data)) return [];
  return data.map(normalizeBugReport);
}

/** Delete a bug report or idea by id */
export async function deleteBugReport(id) {
  await req(`/bug-reports/${id}`, { method: 'DELETE', headers: adminHeaders() });
}

/** Delete multiple bug reports or ideas by id */
export async function deleteBugReports(ids) {
  if (!ids.length) return;
  await req('/bug-reports/delete-batch', {
    method: 'POST',
    headers: adminHeaders(),
    body: { ids },
  });
}

// ─── POSTCARDS ───────────────────────────────────────────────────────────────

/** Share a postcard to the public wall (rate limit: 5 per 24h per device) */
export async function sharePostcardDB({ to, from, message, bgType, bgColor, bgGradient, textColor, font, align, stickers, borderStyle, deviceId }) {
  try {
    const res = await fetch(`${API}/postcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to, from, message, bgType, bgColor, bgGradient,
        textColor, font, align, stickers, borderStyle, deviceId,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      if (res.status === 429 && errBody?.error === 'LIMIT_REACHED') {
        return { error: 'LIMIT_REACHED' };
      }
      console.error('sharePostcard:', errBody?.error || res.statusText);
      return { error: 'Failed to share' };
    }

    const data = await res.json();
    return { data };
  } catch (err) {
    console.error('sharePostcard network error:', err.message);
    return { error: 'Unknown error' };
  }
}

/** Fetch all postcards (newest first) */
export async function fetchPostcards() {
  const data = await req('/postcards');
  if (!data || !Array.isArray(data)) return [];
  return data.map(normalizePostcard);
}

/** Delete a single postcard */
export async function deletePostcard(id) {
  await req(`/postcards/${id}`, { method: 'DELETE', headers: adminHeaders() });
}

/** Delete multiple postcards */
export async function deletePostcards(ids) {
  if (!ids.length) return;
  await req('/postcards/delete-batch', {
    method: 'POST',
    headers: adminHeaders(),
    body: { ids },
  });
}

// ─── NORMALIZERS (snake_case DB rows → camelCase UI models) ─────────────────

function normalizeComment(comment) {
  return {
    id: comment.id,
    username: comment.username,
    text: comment.text,
    parentId: comment.parent_id ?? null,
    reactions: comment.reactions ?? {},
    replies: [],
  };
}

function nestComments(comments) {
  const normalized = (comments ?? []).map(normalizeComment);
  const byId = Object.fromEntries(normalized.map(c => [c.id, c]));
  const roots = [];

  normalized.forEach(comment => {
    if (comment.parentId && byId[comment.parentId]) {
      byId[comment.parentId].replies.push(comment);
    } else if (!comment.parentId) {
      roots.push(comment);
    }
  });

  return roots;
}

function normalizePost(post) {
  return {
    id: post.id,
    username: post.username,
    mood: post.mood,
    text: post.text,
    likes: post.likes ?? 0,
    reactions: post.reactions ?? {},
    createdAt: new Date(post.created_at).getTime(),
    comments: nestComments(post.comments),
  };
}

function normalizeBugReport(report) {
  return {
    id: report.id,
    text: report.text,
    reporterName: report.reporter_name,
    deviceId: report.device_id,
    type: report.type,
    imageUrl: report.image_url,
    createdAt: new Date(report.created_at).getTime(),
  };
}

function normalizePostcard(p) {
  return {
    id: p.id,
    to: p.to,
    from: p.from,
    message: p.message,
    bgType: p.bg_type,
    bgColor: p.bg_color,
    bgGradient: p.bg_gradient,
    textColor: p.text_color,
    font: p.font,
    align: p.align,
    stickers: p.stickers || [],
    borderStyle: p.border_style,
    createdAt: new Date(p.created_at).getTime(),
  };
}

// --- ??? MAP NOTES (FreeSpace Map  anonymous 5-hour pins) -------------------

/** Fetch all active map notes (expires_at > now). */
export async function fetchMapNotes() {
  const data = await req('/map/notes');
  if (!data || !Array.isArray(data)) return [];
  return data;
}

/**
 * Place a pin on the FreeSpace Map.
 * Server validates name =30, message =500, PH bounds, blacklist + rate limit.
 * Returns the created note or { error } on failure.
 */
export async function postMapNote({ name, message, latitude, longitude }) {
  try {
    const res = await fetch(`${API}/map/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        message,
        latitude,
        longitude,
        deviceId: getDeviceId(),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error || 'Could not place your note.' };
    return data;
  } catch (err) {
    console.error('postMapNote network error:', err.message);
    return { error: 'Network error. Try again.' };
  }
}
