// tests/specs/postcard.spec.js — P2-E creator coverage (PC-1..PC-11).
// POM used: PostcardCreatorPage (content/style/share/download). API used: postcardsApi for limit seeding.
// Serial mode, unique data, no resets (toast/count asserts tolerate other suites' rows).
// NOTE: font 'Classic' is skipped — a template shares the name (role matcher would hit two buttons).
import { test, expect } from '@playwright/test';
import { PostcardCreatorPage } from '../pages/PostcardCreatorPage.js';
import { sharePostcard } from '../api/postcardsApi.js';
import { uniqueName, uniqueText } from '../fixtures/testData.js';
import { newDeviceId, seedDeviceId } from '../fixtures/devices.js';

test.describe.configure({ mode: 'serial' });

test.describe('Postcard sharing @regression', () => {
  // PC-1 (smoke): filled card shares to the wall with a toast and a working View Wall link.
  // Covers: To/From/Message → Share → success toast → View Wall → /postcard-wall shows the To.
  test('PC-1 Share postcard appears on wall', async ({ page }) => {
    const to = uniqueName('qa-to');
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.fillContent({ to, from: uniqueName('qa-from'), message: uniqueText('heartfelt') });
    await creator.share();
    await expect(page.getByText('shared to the Wall')).toBeVisible({ timeout: 15000 });
    await creator.viewWallLink.click();
    await expect(page).toHaveURL(/\/postcard-wall/);
    await expect(page.getByText(to).first()).toBeVisible({ timeout: 15000 });
  });

  // PC-2: sharing with empty To/From is rejected with an error toast, nothing is created.
  // Covers: Share with blanks → `Please fill in both...` toast, still on /postcard.
  test('PC-2 Empty To/From blocks sharing', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.share();
    await expect(page.getByText('Please fill in both')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/postcard/);
  });

  // PC-10: the 6th share on one device within 24h is rejected with the limit toast.
  // Covers: seed 5 via API on one device → UI share on same device → `Limit reached!` toast.
  test('PC-10 Sixth share on one device hits limit', async ({ page, request }) => {
    const deviceId = newDeviceId();
    for (let i = 0; i < 5; i++) {
      const { status } = await sharePostcard(request, { to: `qa-limit-${i}`, from: 'qa', message: 'seed', deviceId });
      expect(status).toBe(201);
    }
    await seedDeviceId(page, deviceId);
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.fillContent({ to: uniqueName('qa-to'), from: uniqueName('qa-from'), message: uniqueText('one too many') });
    await creator.share();
    await expect(page.getByText('Limit reached!')).toBeVisible({ timeout: 15000 });
  });

  // PC-11: HTML in fields is stripped — no element runs, text survives, wall renders safely.
  // Covers: To with <img onerror> → shared → wall card shows stripped text, zero img nodes, no dialog.
  test('PC-11 Script tags in fields are stripped', async ({ page }) => {
    page.on('dialog', () => { throw new Error('XSS dialog fired'); });
    const marker = uniqueName('qa-xss-to');
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.fillContent({ to: `${marker}<img src=x onerror=alert(1)>`, from: 'qa-xss-from', message: 'hello' });
    await creator.share();
    await expect(page.getByText('shared to the Wall')).toBeVisible({ timeout: 15000 });
    await creator.viewWallLink.click();
    const mini = page.locator('.postcard-tilt').filter({ hasText: marker }).first();
    await expect(mini).toBeVisible({ timeout: 15000 });
    await expect(mini.locator('img')).toHaveCount(0);
  });
});

test.describe('Postcard styling @regression', () => {
  // PC-3: quick templates restyle the preview (background + starter stickers).
  // Covers: Sunset → gradient background + 🔥 sticker in preview.
  test('PC-3 Sunset template restyles preview', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.openStyle();
    await creator.applyTemplate('Sunset');
    expect(await creator.previewStyle()).toContain('linear-gradient');
    await expect(creator.emptyPreview.getByText('🔥')).toBeVisible();
  });

  // PC-4: solid and gradient backgrounds apply to the preview.
  // Covers: Ocean gradient → linear-gradient style; solid + Lavender → gradient gone.
  test('PC-4 Solid and gradient backgrounds apply', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.openStyle();
    await creator.setBackgroundType('gradient');
    await creator.pickBackground('Ocean');
    expect(await creator.previewStyle()).toContain('linear-gradient');
    await creator.setBackgroundType('solid');
    await creator.pickBackground('Lavender');
    expect(await creator.previewStyle()).not.toContain('linear-gradient');
  });

  // PC-5: fonts restyle the preview text. Marker maps to 'Permanent Marker' (API whitelist).
  // Covers: pick Marker → preview style font-family contains Permanent Marker.
  test('PC-5 Font restyles preview text', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.openStyle();
    await creator.pickFont('Marker');
    expect(await creator.previewStyle()).toContain('Permanent Marker');
  });

  // PC-6: text alignment applies to the preview content wrapper.
  // Covers: align index 0 (left) → wrapper text-align computes to left.
  test('PC-6 Text alignment applies to preview', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.openStyle();
    await creator.pickAlign(0);
    const wrapper = creator.emptyPreview.locator('div[style*="text-align"]');
    await expect(wrapper).toHaveCSS('text-align', 'left');
  });

  // PC-7: border styles swap the preview frame class.
  // Covers: pick dashed → preview class list contains border-dashed.
  test('PC-7 Border style swaps preview frame', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.openStyle();
    await creator.pickBorder('dashed');
    expect(await creator.emptyPreview.getAttribute('class')).toContain('border-dashed');
  });

  // PC-8: stickers add, drag to a new spot, and remove via double-click / Clear all.
  // Covers: add 🌸 → hint → drag moves left% → double-click removes → add two → Clear all empties.
  test('PC-8 Stickers add, drag, and remove', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.addSticker('🌸');
    await expect(creator.stickerHint).toBeVisible();
    const pin = creator.emptyPreview.locator('span', { hasText: '🌸' });
    const before = await pin.getAttribute('style');
    const box = await pin.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    expect(await pin.getAttribute('style')).not.toBe(before);
    await pin.dblclick();
    await expect(creator.stickerHint).toBeHidden();
    await creator.addSticker('🌸');
    await creator.addSticker('💌');
    await creator.clearStickersButton.click();
    await expect(creator.stickerHint).toBeHidden();
  });

  // PC-9: download saves the card as a PNG file.
  // Covers: Download → download event → filename postcard-*.png.
  test('PC-9 Download saves postcard PNG', async ({ page }) => {
    const creator = new PostcardCreatorPage(page);
    await creator.open();
    await creator.fillContent({ to: 'qa-dl-to', from: 'qa-dl-from', message: 'download me' });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      creator.downloadButton.click(),
    ]);
    expect(await download.suggestedFilename()).toMatch(/postcard-.*\.png/);
  });
});
