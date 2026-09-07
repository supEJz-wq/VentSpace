// tests/fixtures/testData.js — unique data per run dodges RATE_LIMIT + DUPLICATE (429).
// USE: `uniqueName()` for usernames, `uniqueText()` for post bodies, `MOODS` for parametrized DASH-P2.
export function uniqueName(prefix = 'qa-user') {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}

export function uniqueText(prefix = 'hello') {
  return `${prefix} ${Date.now().toString(36)} ${Math.random().toString(36).slice(2, 8)}`;
}

// Matches the backend MOODS whitelist. Loop over this for mood-parametrized tests.
export const MOODS = ['Happy', 'Sad', 'Angry', 'Hopeful', 'Anxious'];
