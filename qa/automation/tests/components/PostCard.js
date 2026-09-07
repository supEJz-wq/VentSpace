// tests/components/PostCard.js — per-card interactions (frontend/src/Components/PostCard.jsx).
// USE: scope with `card({ name, text, mood })`, then call the action helpers.
// Icon buttons (no text) use lucide svg classes; text buttons use role+name.
// NOTE: post delete button is only unique while comments stay collapsed — expand afterwards.
export class PostCard {
  // Wires the card scope (glass cards with a time label) once — actions below reuse it.
  constructor(page) {
    this.page = page;
    this.cards = page.locator('.glass-card').filter({ hasText: /h ago|Just now/ });
  }

  // Builds a scoped locator for one post. Name+text+mood must all match (avoids duplicate-name hits).
  card({ name, text, mood }) {
    return this.cards
      .filter({ hasText: name })
      .filter({ hasText: text })
      .filter({ hasText: mood });
  }

  // Opens the comments section. Uses the message-circle button (stays unique even with reaction summaries).
  async openComments(card) {
    await card.locator('button:has(svg.lucide-message-circle)').click();
  }

  // Opens the reaction picker the way users do: hover (onMouseEnter), not click — moving to
  // click first opens the picker under the cursor and the click lands on it instead (flaky).
  // Matches the toggle in both states: unreacted ("React") and reacted ("❤️ Love" — emoji prefix
  // breaks exact matching, so this is a substring match; the mood pill is a span, never a button).
  async openReactionPicker(card) {
    await card.getByRole('button', { name: /(React|Love|Haha|Wow|Sad|Angry|Support)/ }).hover();
    await card.locator('div.absolute').getByTitle('Love', { exact: true }).waitFor({ state: 'visible' });
  }

  // Picks an emoji from the open picker, e.g. pickReaction(card, 'Love'). Scoped to the floating
  // picker (div.absolute) so post/comment summary bubbles with the same title never match.
  async pickReaction(card, label) {
    await card.locator('div.absolute').getByTitle(label, { exact: true }).click();
  }

  // Adds a top-level comment. Uses the `Add a comment...` input + its form submit.
  async addComment(card, text) {
    await card.getByPlaceholder('Add a comment...').fill(text);
    await card.locator('form:has(input[placeholder="Add a comment..."]) button[type="submit"]').click();
  }

  // Replies to a comment. Uses the Reply toggle + `Write a reply...` input scoped to that comment block.
  async addReply(card, commentText, replyText) {
    const block = this.commentBlock(card, commentText);
    await block.getByRole('button', { name: /reply/i }).click();
    await card.getByPlaceholder(/write a reply/i).fill(replyText);
    await card.locator('form:has(input[placeholder^="Write a reply"]) button[type="submit"]').click();
  }

  // Reacts to a comment. Hovers the SmilePlus icon itself (first button in a fresh bubble is the
  // trash, so ordinals are wrong here), then picks from the floating picker. Call only on fresh
  // comments: after a reaction lands, a summary bubble appears and the icon is no longer alone.
  async reactToComment(card, commentText, label) {
    const block = this.commentBlock(card, commentText);
    await block.locator('svg.lucide-smile-plus').hover();
    await card.locator('div.absolute').getByTitle(label, { exact: true }).click();
  }

  // Deletes a comment. Uses the trash inside that comment block (title `Delete comment`).
  async deleteComment(card, commentText) {
    await this.commentBlock(card, commentText).getByTitle('Delete comment').click();
  }

  // Scopes to one comment bubble by its unique text. Rounded-xl bubbles hold a single comment.
  commentBlock(card, commentText) {
    return card.locator('div.rounded-xl').filter({ hasText: commentText }).first();
  }

  // Toggles report on a non-owned card. Uses the Report/Reported button (absent on own posts).
  async toggleReport(card) {
    await card.getByRole('button', { name: /reported|report/i }).click();
  }

  // Deletes an owned post. Uses the first button (header trash comes before the action bar;
  // own posts show no Report button). Only unique while comments stay collapsed.
  async deletePost(card) {
    await card.getByRole('button').first().click();
  }
}
