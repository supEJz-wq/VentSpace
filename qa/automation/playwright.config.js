// @ts-check
import { defineConfig, devices } from '@playwright/test';

// Load repo-root .env so ADMIN_PASSWORD is available to API helpers.
import 'dotenv/config';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Artifacts stay inside qa/automation (paths resolve relative to this file) */
  outputDir: './test-results',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['html'], ['list']] : [['html'], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers (desktop projects skip api + mobile-only specs;
     a11y runs on chromium only — static DOM checks with no browser-specific behavior) */
  projects: [
    {
      name: 'chromium',
      testIgnore: [/.*\.api\.spec\.js/, /.*mobile\.spec\.js/],
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      testIgnore: [/.*\.api\.spec\.js/, /.*mobile\.spec\.js/, /.*a11y\.spec\.js/],
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testIgnore: [/.*\.api\.spec\.js/, /.*mobile\.spec\.js/, /.*a11y\.spec\.js/],
      use: { ...devices['Desktop Safari'] },
    },

    /* API-only project: runs tests/specs/api/*.api.spec.js without a browser. */
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.js/,
    },

    /* Mobile viewports: run only the mobile layout spec (P5-1). */
    {
      name: 'Mobile Chrome',
      testMatch: /.*mobile\.spec\.js/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testMatch: /.*mobile\.spec\.js/,
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests.
     Backend :3001 must be up first (frontend proxies /api to it). */
  webServer: [
    {
      command: 'node backend/server/index.js',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
      env: { PORT: '3001' },
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
  ],
});

