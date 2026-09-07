# Automation Testing (QA)

> Comment style: see [COMMENT-GUIDE.md](COMMENT-GUIDE.md) (1 page, short).

Playwright end-to-end tests for VentSpace. These run without human interaction —
see [../manual](../manual) for manually executed testing.

## Layout

```
qa/automation/
├── playwright.config.js   ← Playwright configuration
├── tests/
│   ├── specs/             ← test files (entry points Playwright runs)
│   ├── pages/             ← page object models (Lpage, Dpage)
│   └── components/        ← component-level helpers (header, posting, filters)
├── test-results/          ← generated artifacts (gitignored)
└── playwright-report/     ← generated HTML report (gitignored)
```

## Running from the repo root

```bash
npm run test:e2e           # headless, all configured browsers
npm run test:e2e:headed    # watch the browser while tests run
npm run test:e2e:report    # open the last HTML report
```

Or with the Playwright CLI directly:

```bash
npx playwright test --config qa/automation/playwright.config.js
npx playwright test --config qa/automation/playwright.config.js --ui
```

## Notes

- Tests target the app URL hardcoded in the specs; start the app first with
  `npm run dev:all` (frontend on :5173, backend on :3001) unless the spec
  starts its own server.
- CI (`.github/workflows/playwright.yml`) runs the same config on every push/PR
  to `main`/`master` and uploads the HTML report as an artifact.
