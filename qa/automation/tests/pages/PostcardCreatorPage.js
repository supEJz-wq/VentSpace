// tests/pages/PostcardCreatorPage.js — Postcard Creator at /postcard (frontend/src/Pages/PostcardPage.jsx).
// USE: fill content tab, switch to style tab for templates/colors/fonts, then share/download/reset.
// Style presets expose title attributes (labels); align buttons are icon-only (use alignButton index 0/1/2).
import { BasePage } from './BasePage.js';

export class PostcardCreatorPage extends BasePage {
  // Wires content inputs, tabs, header actions and toast — style controls are method-scoped below.
  constructor(page) {
    super(page);
    this.page = page;
    this.toInput = page.getByPlaceholder(/my dearest friend/i);
    this.messageInput = page.getByPlaceholder(/write your heartfelt message/i);
    this.fromInput = page.getByPlaceholder(/with love, alex/i);
    this.contentTab = page.getByRole('button', { name: 'Content' });
    this.styleTab = page.getByRole('button', { name: 'Style' });
    this.shareButton = page.getByRole('button', { name: /share/i });
    this.downloadButton = page.getByRole('button', { name: /download|save/i });
    this.resetButton = page.getByTitle('Reset postcard');
    this.emptyPreview = page.locator('div.rounded-3xl').filter({ hasText: 'Your message appears here' });
    this.stickerHint = page.getByText(/drag to position/i);
    this.clearStickersButton = page.getByRole('button', { name: 'Clear all' });
    this.viewWallLink = page.getByRole('button', { name: /view wall/i });
  }

  // Opens the creator. Every creator test starts here.
  async open() {
    await this.goto('/postcard');
  }

  // Fills the content tab (To/Message/From). Call on a fresh page for style tests.
  async fillContent({ to, from, message }) {
    await this.toInput.fill(to);
    await this.messageInput.fill(message);
    await this.fromInput.fill(from);
  }

  // Opens the style tab. Required before any template/color/font/align/border control.
  async openStyle() {
    await this.styleTab.click();
  }

  // Clicks a quick template by name: Classic/Sunset/Ocean/Vintage/Neon. Applies bg+font+border+stickers.
  async applyTemplate(name) {
    await this.styleTab.click().catch(() => {});
    await this.page.getByRole('button', { name: new RegExp(name, 'i') }).first().click();
  }

  // Clicks a background preset by its label (solid titles like Lavender, gradient titles like Ocean).
  async pickBackground(label) {
    await this.page.getByTitle(label, { exact: true }).click();
  }

  // Switches solid/gradient backgrounds. Uses the lowercase toggle labels.
  async setBackgroundType(type) {
    await this.page.getByRole('button', { name: type, exact: true }).click();
  }

  // Clicks a font by its label (Elegant/Modern/.../Luxury). Sets the preview font-family.
  async pickFont(label) {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  // Clicks an align button by index: 0 left, 1 center, 2 right. Icon-only, grouped under Text Alignment.
  async pickAlign(index) {
    await this.page.getByText('Text Alignment', { exact: true }).locator('..').getByRole('button').nth(index).click();
  }

  // Clicks a border style: none/elegant/dashed (lowercase labels).
  async pickBorder(name) {
    await this.page.getByRole('button', { name, exact: true }).click();
  }

  // Adds a sticker from the palette by emoji. Stickers land at random 40-60% positions.
  async addSticker(emoji) {
    await this.page.getByRole('button', { name: emoji, exact: true }).click();
  }

  // Shares to the wall. Shows an error toast when To/From are empty, a limit toast past 5/24h.
  async share() {
    await this.shareButton.click();
  }

  // Inline preview style attribute. Assert backgrounds/fonts against this (gradients/hex live here).
  previewStyle() {
    return this.emptyPreview.getAttribute('style');
  }
}
