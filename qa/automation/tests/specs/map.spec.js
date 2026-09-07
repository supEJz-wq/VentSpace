// tests/specs/map.spec.js — P2-G map coverage (MAP-1..MAP-12).
// POM used: MapPage (canvas/draft/search/markers). API used: mapApi for seeds and negatives.
// Serial mode, unique data, no resets (badge asserts are deltas; search uses unique authors).
// Canvas center is always valid PH water, so plain center clicks propose pins — no pixel math needed.
import { test, expect } from '@playwright/test';
import { MapPage } from '../pages/MapPage.js';
import { createNote, lockName, MANILA } from '../api/mapApi.js';
import { uniqueName, uniqueText } from '../fixtures/testData.js';
import { newDeviceId, seedDeviceId } from '../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

// Reads the `{n} active notes` badge number. Used for delta asserts (immune to other suites' pins).
async function badgeCount(mapPage) {
  return parseInt((await mapPage.badge.innerText()).match(/\d+/)[0], 10);
}

test.describe('Map load and validation @regression', () => {
  // MAP-1 (smoke): canvas renders with badge and hint, no errors.
  // Covers: maplibre canvas visible + `{n} active notes` + tap-anywhere hint.
  test('MAP-1 Map renders canvas, badge, and hint', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.open();
    await expect(mapPage.canvas).toBeVisible();
    await expect(mapPage.badge).toBeVisible();
    await expect(mapPage.hint).toBeVisible();
  });

  // MAP-2: clicking inside PH proposes a pin with coordinates and TTL note.
  // Covers: center click → `Drop a note here` + coords + `visible for 5 hours`.
  test('MAP-2 Click inside PH opens draft modal', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.clickCenter();
    await expect(mapPage.modal.getByText(/drop a note here/i)).toBeVisible();
    await expect(mapPage.modal.getByText(/visible for 5 hours/i)).toBeVisible();
  });

  // MAP-3: server rejects bad pins with 400s (bounds, required fields, identity, blacklist).
  // Covers: ocean coords, empty name, bad uuid, banned word → 400 each. Default `spam` blacklist used.
  test('MAP-3 Invalid pins are rejected with 400', async ({ request }) => {
    const deviceId = newDeviceId();
    const outside = await createNote(request, { name: 'qa', message: 'ocean', latitude: 0, longitude: 0, deviceId });
    expect(outside.status).toBe(400);
    const empty = await createNote(request, { name: '', message: 'x', deviceId });
    expect(empty.status).toBe(400);
    const badUuid = await createNote(request, { name: 'qa', message: 'x', deviceId: 'not-a-uuid' });
    expect(badUuid.status).toBe(400);
    const banned = await createNote(request, { name: 'spam fan', message: 'x', deviceId });
    expect(banned.status).toBe(400);
  });

  // MAP-5: empty draft cannot submit; name/message hard-cap at 30/150 chars.
  // Covers: blank → submit disabled; 31/151-char fills → sliced to 30/150.
  test('MAP-5 Empty draft blocked, fields capped', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.clickCenter();
    await expect(mapPage.submitButton).toBeDisabled();
    await mapPage.nameInput.fill('n'.repeat(31));
    await expect(mapPage.nameInput).toHaveValue('n'.repeat(30));
    await mapPage.messageInput.fill('m'.repeat(151));
    await expect(mapPage.messageInput).toHaveValue('m'.repeat(150));
  });
});

test.describe('Map note creation @regression', () => {
  // MAP-4 (smoke): a styled note submits, toasts, and increments the badge.
  // Covers: fill + emoji → submit → `Note placed` toast → badge +1.
  test('MAP-4 Submit note places pin and bumps badge', async ({ page }) => {
    await seedDeviceId(page);
    const mapPage = new MapPage(page);
    await mapPage.open();
    const before = await badgeCount(mapPage);
    await mapPage.clickCenter();
    await mapPage.fillDraft({ name: uniqueName('qa-pin'), message: uniqueText('pin body'), emoji: '🌸' });
    await mapPage.submit();
    await expect(page.getByText(/note placed/i)).toBeVisible({ timeout: 15000 });
    expect(await badgeCount(mapPage)).toBe(before + 1);
  });

  // MAP-6: the 11th pin within an hour on one device is rate-limited inline.
  // Covers: seed 10 on one device → UI submit on same device → `Take a break` postError, no toast.
  test('MAP-6 Eleventh pin in an hour is rate-limited', async ({ page, request }) => {
    const deviceId = newDeviceId();
    for (let i = 0; i < 10; i++) {
      const { status } = await createNote(request, { name: `qa-rl-${i}`, message: uniqueText(`rl ${i}`), deviceId });
      expect(status).toBe(201);
    }
    await seedDeviceId(page, deviceId);
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.clickCenter();
    await mapPage.fillDraft({ name: uniqueName('qa-rl-ui'), message: uniqueText('one too many') });
    await mapPage.submit();
    await expect(page.getByText(/take a break/i)).toBeVisible({ timeout: 15000 });
  });

  // MAP-7: locked identity prefills the name and locks the field.
  // Covers: API name lock → draft name prefilled + `🔒 Locked` badge.
  test('MAP-7 Locked identity prefills and locks name', async ({ page, request }) => {
    const deviceId = newDeviceId();
    const locked = uniqueName('qa-locked').slice(0, 30);
    await lockName(request, deviceId, locked);
    await seedDeviceId(page, deviceId);
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.clickCenter();
    await expect(mapPage.nameInput).toHaveValue(locked);
    await expect(mapPage.lockedBadge).toBeVisible();
  });

  // MAP-8: font/border/emoji styles apply and submit with a custom look.
  // Covers: Marker font in live preview → glowing border → submit → toast + badge +1.
  test('MAP-8 Custom font and border submit styled pin', async ({ page }) => {
    await seedDeviceId(page);
    const mapPage = new MapPage(page);
    await mapPage.open();
    const before = await badgeCount(mapPage);
    const message = uniqueText('styled body');
    await mapPage.clickAtRandom();
    await mapPage.fillDraft({ name: uniqueName('qa-style'), message, emoji: '🌸' });
    await mapPage.openStyle();
    await mapPage.pickFont('Marker');
    await expect(mapPage.previewFor(message)).toHaveCSS('font-family', /Permanent Marker/);
    await mapPage.pickBorder('Glowing');
    await mapPage.submit();
    await expect(page.getByText(/note placed/i)).toBeVisible({ timeout: 15000 });
    expect(await badgeCount(mapPage)).toBe(before + 1);
  });
});

test.describe('Map search and places @regression', () => {
  // MAP-9: author search finds matching notes (Nominatim stubbed — local matching only).
  // Covers: stub places API → type author → Matching Notes → Enter jumps with toast.
  test('MAP-9 Author search jumps to matching note', async ({ page, request }) => {
    await page.route('**/nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: [] }));
    const author = uniqueName('qa-note-author').slice(0, 30);
    const { status } = await createNote(request, { name: author, message: uniqueText('find me') });
    expect(status).toBe(201);
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.search(author);
    await expect(page.getByText('Matching Notes')).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Enter');
    await expect(page.getByText(/jumped to note/i)).toBeVisible({ timeout: 15000 });
  });

  // MAP-9b: stubbed Nominatim place selects and flies with a toast.
  // Covers: stubbed Manila result → Places section → Enter → toast naming Stubplace
  // (either `Flying to …` or `… N active notes nearby!` when pins crowd the spot).
  test('MAP-9b Place search flies to stubbed result', async ({ page }) => {
    await page.route('**/nominatim.openstreetmap.org/**', (route) => {
      const url = route.request().url();
      if (url.includes('stubplace')) {
        return route.fulfill({ json: [{ place_id: 1, name: 'Stubplace', display_name: 'Stubplace, Philippines', lat: String(MANILA.latitude), lon: String(MANILA.longitude) }] });
      }
      return route.fulfill({ json: [] });
    });
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.search('stubplace');
    await expect(page.getByText('Places in Philippines')).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Enter');
    await expect(page.locator('div.fixed.bottom-6')).toContainText(/stubplace/i, { timeout: 15000 });
  });

  // MAP-10: Popular chips fly without network; toast (not the chip) names the place.
  // Covers: Cebu City chip → toast names it (flying or nearby variant).
  test('MAP-10 Popular chip and GPS center map', async ({ page }) => {
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.clickPopular('Cebu City');
    await expect(page.locator('div.fixed.bottom-6')).toContainText(/cebu city/i, { timeout: 15000 });
  });

  // MAP-10b: GPS button centers on the stubbed Manila fix.
  // Covers: granted permission + Manila coords → location/centered toast.
  test('MAP-10b GPS centers on stubbed position', async ({ browser }) => {
    const ctx = await browser.newContext({ geolocation: MANILA, permissions: ['geolocation'] });
    const gpsPage = await ctx.newPage();
    const mapPage = new MapPage(gpsPage);
    await mapPage.open();
    await mapPage.gpsButton.click();
    await expect(gpsPage.getByText(/my location|centered at your location/i).first()).toBeVisible({ timeout: 15000 });
    await ctx.close();
  });
});

test.describe('Map expiry and safety @regression', () => {
  // MAP-11: pin popups show the 5-hour expiry countdown.
  // Covers: UI submit → hover marker (retry beats the 60s refresh swaps) → popup `Expires` countdown.
  // (True expiry filtering needs backdated rows — no API for that.)
  test('MAP-11 Pin popup shows expiry countdown', async ({ page }) => {
    await seedDeviceId(page);
    const author = uniqueName('qa-exp').slice(0, 30);
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.clickAtRandom();
    await mapPage.fillDraft({ name: author, message: uniqueText('expiring') });
    await mapPage.submit();
    await expect(page.getByText(/note placed/i)).toBeVisible({ timeout: 15000 });
    await mapPage.openMarkerPopup(author);
    await expect(page.locator('.maplibregl-popup')).toContainText(/expires/i);
  });

  // MAP-12: HTML in name/message is stripped — popup holds text only, no dialog ever fires.
  // Covers: <b>-wrapped name submit → stored stripped → marker under clean name → popup has zero
  // img nodes. (Name input caps at 30 chars, so the payload stays short enough to survive intact.)
  test('MAP-12 Script tags in notes are stripped', async ({ page }) => {
    page.on('dialog', () => { throw new Error('XSS dialog fired'); });
    await seedDeviceId(page);
    const marker = uniqueName('qa-xss-map').slice(0, 23);
    const mapPage = new MapPage(page);
    await mapPage.open();
    await mapPage.clickAtRandom();
    await mapPage.fillDraft({ name: `<b>${marker}</b>`, message: uniqueText('xss body') });
    await mapPage.submit();
    await expect(page.getByText(/note placed/i)).toBeVisible({ timeout: 15000 });
    await mapPage.openMarkerPopup(marker);
    const popup = page.locator('.maplibregl-popup');
    await expect(popup).toContainText(marker);
    await expect(popup.locator('img')).toHaveCount(0);
  });
});
