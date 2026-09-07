// tests/api/postsApi.js — seeding + direct API calls for posts (mirrors backend/routes/posts.js).
// USE: seed feed tests without clicking UI, e.g. `await createPost(request, { username, mood, text, deviceId })`.
import { newDeviceId } from '../fixtures/devices.js';

// Creates one post via POST /api/posts. Returns the created row. Each call should use its own
// device id unless the test is about rate limits (then reuse one id on purpose).
export async function createPost(request, { username, mood, text, deviceId = newDeviceId() }) {
  const res = await request.post('/api/posts', { data: { username, mood, text, deviceId } });
  if (!res.ok()) throw new Error(`createPost failed: ${res.status()} ${await res.text()}`);
  return { row: await res.json(), deviceId };
}

// Seeds one post per mood (5 posts, 5 devices). Used for filter/pagination/vibe suites.
export async function seedOnePerMood(request, tag) {
  const moods = ['Happy', 'Sad', 'Angry', 'Hopeful', 'Anxious'];
  const seeded = [];
  for (const mood of moods) {
    seeded.push(await createPost(request, {
      username: `qa-${tag}-${mood}`.slice(0, 40),
      mood,
      text: `seed ${tag} feeling ${mood} ${Date.now().toString(36)}`,
    }));
  }
  return seeded;
}

const DIRECT_API = 'http://localhost:3001';

// Plain-fetch variant for beforeAll hooks (no `request` fixture available there).
async function createPostFetch({ username, mood, text, deviceId }) {
  const res = await fetch(`${DIRECT_API}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, mood, text, deviceId: deviceId ?? crypto.randomUUID() }),
  });
  if (!res.ok) throw new Error(`createPostFetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Seeds the shared feed dataset: 1 post per mood, Happy carries the hashtag, Sad author is the
// contributor target. Returns { hashtag, sadAuthor }. One reset + 5 writes total for the file.
export async function seedFeedDataset(tag) {
  const hashtag = `#qafeed${tag}`;
  const sadAuthor = `qa-feed-sad-${tag}`.slice(0, 40);
  const specs = [
    { username: `qa-feed-happy-${tag}`.slice(0, 40), mood: 'Happy', text: `seeded happy post ${hashtag} ${tag}` },
    { username: sadAuthor, mood: 'Sad', text: `seeded sad post ${tag}` },
    { username: `qa-feed-angry-${tag}`.slice(0, 40), mood: 'Angry', text: `seeded angry post ${tag}` },
    { username: `qa-feed-hopeful-${tag}`.slice(0, 40), mood: 'Hopeful', text: `seeded hopeful post ${tag}` },
    { username: `qa-feed-anxious-${tag}`.slice(0, 40), mood: 'Anxious', text: `seeded anxious post ${tag}` },
  ];
  for (const s of specs) await createPostFetch(s);
  return { hashtag, sadAuthor };
}
