# Database Cheat Sheet (Manual Testing)

Copy-paste SQL for verifying test cases in Supabase → SQL Editor.
Run everything on the **VentSpace-Test** project unless checking live behavior.

> Replace `<TEST_DEVICE_ID>` with a real UUID and `<POST_ID>` with a real
> post number (no angle brackets).
> The `5 hours` window mirrors the `auto_delete_hours = 5` setting —
> if the setting changes, change the interval too.

## Find post IDs

```sql
-- Latest posts with their IDs (newest first)
SELECT id, username, mood, LEFT(text, 60) AS preview, created_at FROM posts
ORDER BY created_at DESC LIMIT 20;
```

```sql
-- Find one post by its text or author
SELECT id, username, text, created_at FROM posts
WHERE text ILIKE '%<SOME_WORD>%' OR username = '<USERNAME>'
ORDER BY created_at DESC;
```

```sql
-- Full row for one post (replace the ID)
SELECT * FROM posts WHERE id = <POST_ID>;
```

## Find comment IDs

```sql
-- Latest comments with their IDs (newest first)
SELECT id, post_id, parent_id, username, LEFT(text, 60) AS preview, created_at FROM comments
ORDER BY created_at DESC LIMIT 20;
```

```sql
-- All comments (and replies) on one post, threaded order
SELECT id, parent_id, username, text, created_at FROM comments
WHERE post_id = <POST_ID> ORDER BY created_at;
```

```sql
-- Replies to one comment only (replace the ID)
SELECT id, username, text, created_at FROM comments
WHERE parent_id = <COMMENT_ID> ORDER BY created_at;
```

## Find device IDs

```sql
-- All devices that ever posted (newest first)
SELECT device_id, username, COUNT(*) AS posts, MAX(created_at) AS latest
FROM posts
GROUP BY device_id, username
ORDER BY latest DESC;
```

```sql
-- Which device is closest to the 5-post limit?
SELECT device_id, COUNT(*) AS post_count FROM posts
WHERE created_at >= now() - interval '5 hours'
GROUP BY device_id ORDER BY post_count DESC;
```

```sql
-- Posts by one device (replace the ID)
SELECT id, username, mood, text, created_at FROM posts
WHERE device_id = '<TEST_DEVICE_ID>'
ORDER BY created_at DESC;
```

Browser shortcut (F12 → Console): `localStorage.getItem('freespace_device_id')`

## Rate-limit checks (TC_DBP_08 and friends)

```sql
-- Post count for one device inside the window (expect 5 after a blocked 6th)
SELECT COUNT(*) FROM posts
WHERE device_id = '<TEST_DEVICE_ID>'
  AND created_at >= now() - interval '5 hours';
```

```sql
-- Map pins by one device inside the window (limit: 10)
SELECT COUNT(*) FROM map_notes
WHERE device_id = '<TEST_DEVICE_ID>'
  AND created_at >= now() - interval '1 hour';
```

```sql
-- Postcards by one device inside the window (limit: 5 per 24h)
SELECT COUNT(*) FROM postcards
WHERE device_id = '<TEST_DEVICE_ID>'
  AND created_at >= now() - interval '24 hours';
```

## Content checks

```sql
-- Comments + replies on a post (replace the ID)
SELECT id, parent_id, username, text, created_at FROM comments
WHERE post_id = <POST_ID> ORDER BY created_at;
```

```sql
-- Reported posts (moderation queue)
SELECT post_id, created_at FROM reported_posts ORDER BY created_at DESC;
```

```sql
-- Latest bug reports / ideas
SELECT id, type, text, reporter_name, created_at FROM bug_reports
ORDER BY created_at DESC LIMIT 20;
```

```sql
-- Latest map notes (replace with your bounds as needed)
SELECT name, message, latitude, longitude, expires_at FROM map_notes
ORDER BY created_at DESC LIMIT 20;
```

## Settings checks

```sql
-- Current settings (blacklist + auto-delete window)
SELECT key, value FROM settings;
```

## Delete-behavior checks

```sql
-- Comments left behind by soft-deleted posts (expect 0 right after a delete)
SELECT COUNT(*) FROM comments c
JOIN posts p ON p.id = c.post_id
WHERE p.is_deleted = true;
```

```sql
-- Fully orphaned comments, if any (expect 0 — cascades should prevent these)
SELECT COUNT(*) FROM comments c
LEFT JOIN posts p ON p.id = c.post_id
WHERE p.id IS NULL;
```

## Reset the test database (Test project ONLY)

```sql
TRUNCATE public.comments, public.reported_posts, public.postcards,
         public.device_identities, public.bug_reports, public.posts RESTART IDENTITY;
```
