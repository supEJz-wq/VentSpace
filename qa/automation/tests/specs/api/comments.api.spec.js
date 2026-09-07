// tests/specs/api/comments.api.spec.js — P3 comments API coverage.
// Serial and ordered: comment+reply are seeded first, reaction runs on the comment, deletes run last.
// Comment ownership is device-based (deviceId stored per comment); stranger devices get 403.
// Write budget ~10: seed post(1) + comment(1) + reply(1) + negatives(3) + reaction(2) + deletes(2).
import { test, expect } from '@playwright/test';
import { createPost } from '../../api/postsApi.js';
import { uniqueName, uniqueText } from '../../fixtures/testData.js';
import { newDeviceId } from '../../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

// Shared parent post plus one comment thread (comment id + device kept for later steps).
let postId;
let commentId;
let commentDevice;
test.beforeAll(async ({ request }) => {
  const { row } = await createPost(request, { username: uniqueName('qa-thread'), mood: 'Sad', text: uniqueText('thread parent') });
  postId = row.id;
  commentDevice = newDeviceId();
  const res = await request.post(`/api/posts/${postId}/comments`, {
    data: { username: uniqueName('qa-c1'), text: uniqueText('parent comment'), deviceId: commentDevice },
  });
  expect(res.status()).toBe(201);
  commentId = (await res.json()).id;
});

test.describe('Comments API @api', () => {
  // API-COMMENTS-REPLY: reply nests under parent_id and surfaces in GET.
  // Covers: reply 201 → parent_id set → GET post shows nested reply.
  test('API-COMMENTS-REPLY reply nests under parent', async ({ request }) => {
    const replyText = uniqueText('child reply');
    const res = await request.post(`/api/posts/${postId}/comments`, {
      data: { username: uniqueName('qa-c2'), text: replyText, parentId: commentId, deviceId: newDeviceId() },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).parent_id).toBe(commentId);
    const post = (await (await request.get('/api/posts')).json()).find((p) => p.id === postId);
    expect(JSON.stringify(post.comments)).toContain(replyText);
  });

  // API-COMMENTS-NEGATIVES: bad parent and banned text are rejected; over-long text is capped.
  // Covers: parentId 0 → 400; `spam` text → 400; 501 chars → 201 with text sliced to 500
  // (sanitize-then-max truncates instead of rejecting — same pattern as map name caps).
  test('API-COMMENTS-NEGATIVES bad payloads handled', async ({ request }) => {
    const deviceId = newDeviceId();
    const badParent = await request.post(`/api/posts/${postId}/comments`, { data: { username: 'qa', text: 'x', parentId: 0, deviceId } });
    expect(badParent.status()).toBe(400);
    const long = await request.post(`/api/posts/${postId}/comments`, { data: { username: 'qa', text: 'x'.repeat(501), deviceId } });
    expect(long.status()).toBe(201);
    expect((await long.json()).text).toHaveLength(500);
    const banned = await request.post(`/api/posts/${postId}/comments`, { data: { username: 'qa', text: 'spam here', deviceId } });
    expect(banned.status()).toBe(400);
  });

  // API-COMMENTS-REACTION: emoji add then switch on a comment; invalid rejected.
  // Covers: ❤️ → {❤️:1} → switch 😂 → invalid 💩 400.
  test('API-COMMENTS-REACTION add, switch, reject invalid', async ({ request }) => {
    const add = await request.post(`/api/posts/comments/${commentId}/reaction`, { data: { emoji: '❤️', prevEmoji: null, currentReactions: {} } });
    expect(add.ok()).toBeTruthy();
    expect((await add.json()).reactions).toMatchObject({ '❤️': 1 });
    const swap = await request.post(`/api/posts/comments/${commentId}/reaction`, { data: { emoji: '😂', prevEmoji: '❤️', currentReactions: { '❤️': 1 } } });
    expect((await swap.json()).reactions).toMatchObject({ '😂': 1 });
    const bad = await request.post(`/api/posts/comments/${commentId}/reaction`, { data: { emoji: '💩', prevEmoji: null, currentReactions: {} } });
    expect(bad.status()).toBe(400);
  });

  // API-COMMENTS-DELETE: stranger 403, missing 404, owner 200 with cascade. Runs last (thread dies).
  // Covers: other-device 403 → ghost id 404 → owner 200 → comment gone from GET.
  test('API-COMMENTS-DELETE stranger 403, ghost 404, owner 200', async ({ request }) => {
    const stranger = await request.delete(`/api/posts/comments/${commentId}?deviceId=${newDeviceId()}&username=x`);
    expect(stranger.status()).toBe(403);
    const ghost = await request.delete(`/api/posts/comments/987654321?deviceId=${commentDevice}&username=x`);
    expect(ghost.status()).toBe(404);
    const owner = await request.delete(`/api/posts/comments/${commentId}?deviceId=${commentDevice}&username=qa`);
    expect(owner.status()).toBe(200);
    const post = (await (await request.get('/api/posts')).json()).find((p) => p.id === postId);
    const ids = [];
    const walk = (list) => (list ?? []).forEach((c) => { ids.push(c.id); walk(c.replies); });
    walk(post.comments);
    expect(ids).not.toContain(commentId);
  });
});
