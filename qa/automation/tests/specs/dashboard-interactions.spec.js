// tests/specs/dashboard-interactions.spec.js — P2-D interaction coverage (INT-2..INT-6).
// POM used: DashboardPage (postCard actions) + feed (card scoping). API used: postsApi for seeding.
// Serial mode with unique data per test (no resets); reaction/comment/report writes stay under server caps.
// NOTE: INT-1 (likes) is API-only — PostCard renders no like button — and lives in specs/api/posts.api.spec.js.
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { createPost } from '../api/postsApi.js';
import { uniqueName, uniqueText } from '../fixtures/testData.js';

test.describe.configure({ mode: 'serial' });

// Seeds one post and opens it in the UI. Returns { dashboard, card, id, name, text, mood }.
async function openSeededCard(page, request, mood = 'Happy') {
  const name = uniqueName('qa-int');
  const text = uniqueText('interaction target');
  const { row } = await createPost(request, { username: name, mood, text });
  const dashboard = new DashboardPage(page);
  await dashboard.open();
  const card = dashboard.postCard.card({ name, text, mood });
  await expect(card).toBeVisible();
  return { dashboard, card, id: row.id, name, text, mood };
}

test.describe('Post reactions @regression', () => {
  // INT-2: emoji reaction adds, switches (counts move), then toggles off; summaries reflect state.
  // Asserts use the summary button ("{emoji} {count}" — untitled spans, NOT titles; only comment
  // bubbles carry titles). The toggle itself reads "❤️ Love" once reacted, so exact-name toggle
  // asserts would only fit the unreacted state.
  // Timeouts are generous: a cold backend's first Supabase roundtrip can take well over 5s.
  // Covers: hover React → Love (❤️) → summary → hover → Haha (😂) → Love summary gone → hover → Haha again → React back.
  test('INT-2 Post reaction adds, switches, then removes', async ({ page, request }) => {
    const { dashboard, card } = await openSeededCard(page, request);
    await dashboard.postCard.openReactionPicker(card);
    await dashboard.postCard.pickReaction(card, 'Love');
    await expect(card.getByRole('button', { name: '❤️ 1' })).toBeVisible({ timeout: 15000 });
    await dashboard.postCard.openReactionPicker(card);
    await dashboard.postCard.pickReaction(card, 'Haha');
    await expect(card.getByRole('button', { name: '😂 1' })).toBeVisible({ timeout: 15000 });
    await expect(card.getByRole('button', { name: '❤️ 1' })).toBeHidden({ timeout: 15000 });
    await dashboard.postCard.openReactionPicker(card);
    await dashboard.postCard.pickReaction(card, 'Haha');
    await expect(card.getByRole('button', { name: '😂 1' })).toBeHidden({ timeout: 15000 });
    await expect(card.getByRole('button', { name: 'React' })).toBeVisible();
  });
});

test.describe('Comments and replies @regression', () => {
  // INT-3: comment adds, reply nests under it with @ attribution, comment reaction lands, deletes cascade.
  // Server roundtrips use generous timeouts (cold-backend Supabase latency — see INT-2 note).
  // Covers: expand → comment → reply (`replied to @user`) → comment ❤️ → delete reply → delete parent clears both.
  test('INT-3 Comment, reply, react, then delete', async ({ page, request }) => {
    const { dashboard, card } = await openSeededCard(page, request);
    const commentText = uniqueText('parent comment');
    const replyText = uniqueText('child reply');
    await dashboard.postCard.openComments(card);
    await dashboard.postCard.addComment(card, commentText);
    await expect(dashboard.postCard.commentBlock(card, commentText)).toBeVisible({ timeout: 15000 });
    await dashboard.postCard.addReply(card, commentText, replyText);
    const reply = dashboard.postCard.commentBlock(card, replyText);
    await expect(reply).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText('replied to');
    await expect(card).toContainText('@You');
    await dashboard.postCard.reactToComment(card, commentText, 'Love');
    await expect(dashboard.postCard.commentBlock(card, commentText).getByTitle('Love')).toBeVisible();
    await dashboard.postCard.deleteComment(card, replyText);
    await expect(reply).toBeHidden();
    await dashboard.postCard.deleteComment(card, commentText);
    await expect(dashboard.postCard.commentBlock(card, commentText)).toHaveCount(0);
  });
});

test.describe('Reporting @regression', () => {
  // INT-4: reporting flags a post (alert accepted), toggling clears it, and the admin queue reflects it.
  // Covers: Report → alert → Reported → GET /api/reports contains id → toggle → Report again + queue empty.
  test('INT-4 Report flags post and toggle clears it', async ({ page, request }) => {
    const { dashboard, card, id } = await openSeededCard(page, request);
    page.on('dialog', (d) => d.accept());
    await dashboard.postCard.toggleReport(card);
    await expect(card.getByRole('button', { name: 'Reported' })).toBeVisible();
    const flagged = await request.get('/api/reports');
    expect(await flagged.json()).toEqual(expect.arrayContaining([expect.objectContaining({ post_id: id })]));
    await dashboard.postCard.toggleReport(card);
    await expect(card.getByRole('button', { name: 'Report', exact: true })).toBeVisible();
    const cleared = await request.get('/api/reports');
    expect(await cleared.json()).not.toEqual(expect.arrayContaining([expect.objectContaining({ post_id: id })]));
  });
});

test.describe('Realtime and text @regression', () => {
  // INT-5: a post created elsewhere appears without reload via the realtime channel.
  // Covers: A + B on /home → API create → B's feed shows the card within 20s, no reload.
  test('INT-5 New post appears live on a second tab', async ({ browser, request }) => {
    test.setTimeout(60000);
    const name = uniqueName('qa-live');
    const text = uniqueText('live target');
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const dashboardB = new DashboardPage(pageB);
    await dashboardB.open();
    await createPost(request, { username: name, mood: 'Hopeful', text });
    await expect(dashboardB.postCard.card({ name, text, mood: 'Hopeful' })).toBeVisible({ timeout: 20000 });
    await ctxB.close();
  });

  // INT-6: long text truncates with See more/less; timestamp shows relative time.
  // Covers: 200-char seed → `...` + See more → expand → full text + See less + relative timestamp
  // (`Just now` or `Nh ago` — fresh posts can read `-1h ago` when the server clock runs ahead).
  test('INT-6 Long text truncates with See more', async ({ page, request }) => {
    const name = uniqueName('qa-long');
    const longText = `${uniqueText('longform')} ${'x'.repeat(180)}`;
    await createPost(request, { username: name, mood: 'Sad', text: longText });
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    const long = dashboard.postCard.card({ name, text: 'longform', mood: 'Sad' });
    await expect(long).toContainText('See more');
    await expect(long).toContainText(/ago|Just now/);
    await long.getByRole('button', { name: 'See more' }).click();
    await expect(long).toContainText(longText);
    await expect(long.getByRole('button', { name: 'See less' })).toBeVisible();
  });
});
