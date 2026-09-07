// tests/fixtures/devices.js — fresh device UUID per test = fresh rate-limit bucket + name lock.
// USE: `await seedDeviceId(page)` in beforeEach of posting tests (DASH-P*), or `newDeviceId()` for API payloads.
import { randomUUID } from 'node:crypto';

// Generates a device id for API bodies (`deviceId` field). Each id gets its own 5-post/5h bucket.
export function newDeviceId() {
  return randomUUID();
}

// Seeds the browser before navigation so identity.js picks it up on load. Gives a test its own device.
export async function seedDeviceId(page, deviceId = newDeviceId()) {
  await page.addInitScript((id) => {
    localStorage.setItem('freespace_device_id', id);
  }, deviceId);
  return deviceId;
}
