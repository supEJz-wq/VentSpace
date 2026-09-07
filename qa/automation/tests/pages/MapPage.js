// tests/pages/MapPage.js — FreeSpace Map at /map (frontend/src/Pages/MapPage.jsx).
// USE: canvas clicks for pins, draft modal for notes, search/GPS/popular chips for navigation.
// Canvas center is always inside PH (map boots at PH_CENTER zoom 5.05), so plain center clicks propose pins.
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class MapPage extends BasePage {
  // Wires canvas, search, badge, hint and the draft modal controls.
  constructor(page) {
    super(page);
    this.page = page;
    this.canvas = page.locator('.maplibregl-canvas');
    this.searchInput = page.getByPlaceholder(/search location in ph or note/i);
    this.badge = page.getByText(/active notes/i);
    this.hint = page.getByText(/tap anywhere/i).first();
    this.modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Drop a note here' });
    this.nameInput = this.modal.getByPlaceholder('Anonymous koala');
    this.messageInput = this.modal.getByPlaceholder(/what's on your mind at this spot/i);
    this.styleTab = this.modal.getByRole('button', { name: /font & border style/i });
    this.submitButton = this.modal.getByRole('button', { name: /pin my styled note/i });
    this.lockedBadge = this.modal.getByText('🔒 Locked');
    this.gpsButton = page.getByTitle('Jump to My GPS Location');
  }

  // Opens the map. Every map test starts here (canvas needs a beat to init MapLibre).
  async open() {
    await this.goto('/map');
    await this.canvas.waitFor({ state: 'visible', timeout: 20000 });
  }

  // Clicks the canvas center to propose a pin (center is PH sea, always valid).
  async clickCenter() {
    await this.canvas.click();
  }

  // Clicks a fractional canvas spot (fx/fy 0..1) to propose a pin away from the center pile.
  // Every center-clicked pin stacks on one point and buries the rest from hover — tests that
  // later hover their pin must use distinct spots (all still PH bbox water near center).
  async clickAt(fx, fy) {
    const box = await this.canvas.boundingBox();
    await this.page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  }

  // Clicks a random central spot. Fixed offsets collide run-over-run (pins persist in the shared
  // DB), so hover-targeted pins need a fresh position every run. Band stays PH-bbox water.
  async clickAtRandom() {
    const fx = 0.3 + Math.random() * 0.4;
    const fy = 0.35 + Math.random() * 0.3;
    await this.clickAt(fx, fy);
  }

  // Fills the draft (content tab): name ≤30, message ≤150, pin emoji from the picker grid.
  async fillDraft({ name, message, emoji }) {
    if (emoji) await this.modal.getByRole('button', { name: emoji, exact: true }).click();
    await this.nameInput.fill(name);
    await this.messageInput.fill(message);
  }

  // Opens the style tab (fonts, themes, borders). Required before style controls.
  async openStyle() {
    await this.styleTab.click();
  }

  // Picks a font by label (Modern/Handwritten/.../Marker). Reflects in the live preview.
  async pickFont(label) {
    await this.modal.getByRole('button', { name: label, exact: true }).click();
  }

  // Picks a color theme by name (Sakura Rose/Cyber Violet/...). Recolors pin + preview.
  async pickTheme(name) {
    await this.modal.getByRole('button', { name: new RegExp(name, 'i') }).first().click();
  }

  // Picks a border style by label (Solid/Glowing/Dashed/Double/Gradient).
  async pickBorder(label) {
    await this.modal.getByRole('button', { name: new RegExp(label, 'i') }).first().click();
  }

  // Submits the draft. Toast or inline postError follows (rate limits surface as postError).
  async submit() {
    await this.submitButton.click();
  }

  // Live preview paragraph for typed text. Assert selected font against its style attribute.
  previewFor(text) {
    return this.modal.getByText(text);
  }

  // Map marker button by author (aria-label `Note from {name}`). Kept for targeting pins.
  markerByName(name) {
    return this.page.getByRole('button', { name: `Note from ${name}` });
  }

  // Opens a marker popup via hover: the app peeks on mouseenter (clicks propagate to the map
  // and open a stray draft modal instead). Each attempt moves away first — re-hovering in place
  // fires no new mouseenter, and auto-open/prior-hover parity flips on every fresh enter, so this
  // converges within two passes. Retries beat the 60s refresh swaps (30s budget).
  async openMarkerPopup(name) {
    const popup = this.page.locator('.maplibregl-popup');
    await expect(async () => {
      await this.page.mouse.move(10, 10);
      await this.markerByName(name).hover({ timeout: 8000 });
      await expect(popup).toBeVisible({ timeout: 4000 });
    }).toPass({ timeout: 30000 });
    const close = this.page.getByRole('button', { name: 'Close', exact: true });
    if (await close.isVisible().catch(() => false)) await close.click();
  }

  // Clicks a Popular Locations chip (no network — local list). Shows nearby-count toasts.
  async clickPopular(name) {
    await this.searchInput.click();
    await this.page.getByRole('button', { name: new RegExp(name, 'i') }).first().click();
  }

  // Types into the map search (matching notes filter locally; places come from Nominatim — stub it).
  async search(term) {
    await this.searchInput.fill(term);
  }
}
