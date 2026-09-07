# VentSpace — Automation Plan (POM + JS + Playwright)

> Location: `qa/automation/automation-plan/`
> Stack: Playwright + JavaScript, Page Object Model (POM)
> Coverage target: whole website — 6 pages + all functions + all APIs
> Verified against live run on 2026-09-03 (backend `:3001` OK, `GET /api/health`, `/api/posts`=0, `/api/map/notes`=0, `/api/postcards`=1, settings `{blacklisted_words, auto_delete_hours:5}`, frontend `dist` served `200`).

---

## 1. What the app actually is (verified)

**VentSpace** — anonymous venting/journaling. React 19 + Vite frontend, Express 5 + Supabase backend, one npm project.

Routes (`frontend/src/App.jsx:11-26`):

| Route | Page file | Purpose |
|---|---|---|
| `/` | `Pages/LandingPage.jsx` | Hero, feature grid, Continue → RulesModal → `/home` |
| `/home` | `Pages/Dashboard.jsx` | 3-col feed: LeftSidebar moods, Feed + PostCard, RightSidebar topics/contributors, Header search + PostModal + BugReportModal, pagination 4/page |
| `/postcard` | `Pages/PostcardPage.jsx` | Postcard Creator: To/From/Message, templates, solid/gradient bg, text color, 13 fonts, align, stickers drag, Download (html2canvas PNG), Share to Wall (5/24h limit) |
| `/postcard-wall` | `Pages/PostcardWallPage.jsx` | Wall grid 12/page, search To/From, mini→full modal, realtime updates, demo fallback (14 mocks) |
| `/map` | `Pages/MapPage.jsx` | MapLibre + OSM, PH-only pins (bbox 4.4–21.2 / 115–131), search Nominatim + active notes, GPS, place-note modal (name 30 / msg 150, 8 fonts, 8 themes, 5 borders, 40 emojis), 5h expiry |
| `/admin` | `Pages/Admin.jsx` | Password login (`/api/admin/login` → token in sessionStorage), 7 tabs: Command Center, Posts, Map Notes, Postcards, Feedback, Settings, Guidelines |

Key frontend functions (`lib/api.js`): `fetchPosts, createPost, getDevicePostCount, deletePost, incrementLikes, addReactionDB, addCommentDB, addReplyDB, deleteCommentDB, addCommentReactionDB, fetchReportedIds, reportPost, unreportPost, fetchSettings, updateSetting, getIdentity, lockIdentity, resetIdentity, createBugReport, fetchBugReports, deleteBugReport(s), sharePostcardDB, fetchPostcards, deletePostcard(s), fetchMapNotes, postMapNote, loginAdmin/logoutAdmin, hardDeletePostsByDevice, hardResetDatabase, unlockAllNames, deleteAllPostsAdmin, deleteAllMapNotesAdmin, fetchAllMapNotesAdmin, deleteMapNoteAdmin`.

Backend (`backend/server/`):

| Router | Endpoints |
|---|---|
| `routes/posts.js` | `GET /api/posts`, `POST /api/posts` (mood enum, 5 posts/window/device, dupe check, blacklist), `GET /api/posts/device-count/:deviceId`, `POST /api/posts/purge` (admin), `DELETE /api/posts/device/:deviceId` (admin), `POST /api/posts/:id/like`, `POST /api/posts/:id/reaction` (6-emoji whitelist), `DELETE /api/posts/:id` (owner or admin), `POST /api/posts/:id/comments`, `DELETE /api/posts/comments/:commentId`, `POST /api/posts/comments/:commentId/reaction` |
| `routes/postcards.js` | `GET /api/postcards`, `POST /api/postcards` (to/from 60, msg 500, bgType/align/border/font whitelist, hex + `linear-gradient(135deg,#hex,#hex)` strict, stickers ≤20, 5/24h/device), `DELETE /api/postcards/:id` (admin), `POST /api/postcards/delete-batch` (admin) |
| `routes/map.js` | `GET /api/map/notes` (active only, 500 max), `POST /api/map/notes` (uuid device, name 30/msg 500, PH bounds, blacklist, 10/hour/device), `GET /api/map/all-notes` (admin), `DELETE /api/map/notes/:id` (admin) |
| `routes/meta.js` | `POST /api/admin/login` (10/15min IP limit), `POST /api/admin/logout` (rotates password!), `POST /api/admin/copy-password` (admin), `GET /api/settings`, `PUT /api/settings/:key` (admin, only `blacklisted_words`, `auto_delete_hours` 1–168), `GET/POST/DELETE /api/identity[/:deviceId]`, `GET/POST/DELETE /api/reports[/:postId]`, `GET/POST /api/bug-reports` (+ image ≤~2MB), `DELETE /api/bug-reports/:id` + `POST /api/bug-reports/delete-batch` (admin), `POST /api/admin/unlock-all-names`, `POST /api/admin/delete-all-posts`, `POST /api/admin/delete-all-map-notes`, `POST /api/admin/hard-reset` (admin) |
| `index.js` | Global 300/15min IP limit, write 30/15min, health `GET /api/health`, auto-purge every 15min, serves `frontend/dist` in prod |

Validation (`lib/validate.js`): moods `Happy,Sad,Angry,Hopeful,Anxious`, reactions `❤️,😂,😮,😢,😡,👏`, 13 postcard fonts, aligns `left,center,right`, borders `none,elegant,dashed`, HTML strip + control-char strip everywhere, rate limits above.

---

## 2. Current automation audit (what exists, what's broken)

Existing:

```
qa/automation/
  playwright.config.js          # chromium+firefox+webkit, no baseURL, no webServer
  tests/pages/Lpage.js          # goto http://localhost:5173/, continue btn
  tests/pages/Dpage.js          # goto .../home, composes posting/header/moodFilter
  tests/components/posting.js   # PostModal fill + verifyPostInFeed
  tests/components/header.js    # search, postcard, post-something
  tests/components/moodFilter.js
  tests/components/feedfilterAction.js  # getMoodCount → click → toHaveCount
  tests/specs/landingPage.spec.js (1 test, assertion commented out)
  tests/specs/dashboardPage.spec.js (5 mood-filter tests)
  tests/specs/dashboardPosting.spec.js (5 post-creation tests, 2x test.only!)
```

Gaps that will flake/block CI:

1. `test.only` left in `dashboardPosting.spec.js:42,55` → with `forbidOnly:true` on CI the whole run fails.
2. Hardcoded `http://localhost:5173/` in `Lpage.js:15`, `Dpage.js:22`. Must move to `baseURL` + `page.goto('/')`.
3. `header.js` locators are stale: `input[placeholder="Search"]` vs real `"Search thoughts, moods, or topics..."` (`Header.jsx:30,92`), `Post Card` vs real `Postcard/Wall/Map/Post Something` buttons.
4. `posting.verifyPostInFeed` uses `div.rounded-3xl` filter — too broad, will match postcards/modals. Scope to `Feed`/`PostCard`.
5. No cleanup/fixtures → device rate limits kill repeats: posts 5/window, postcards 5/24h, map 10/hour. Tests reuse `Test User` + same text → hits `DUPLICATE` 429.
6. Zero coverage for: postcard creator/wall, map, admin, comments/replies, likes/reactions, report, search, pagination, bug reports, identity lock, settings, theme, API layer.

---

## 3. Target POM architecture (JS)

Keep existing style, fix it — don't rewrite in TS.

```
qa/automation/
  playwright.config.js        # baseURL, webServer, storageState, retries, tags
  tests/
    specs/
      landing.spec.js
      dashboard-feed.spec.js  # mood filter, search, tag, contributor, pagination
      dashboard-post.spec.js  # create/delete post, validation, rate-limit, blacklist
      interactions.spec.js    # like, reaction, comment, reply, delete comment, report
      postcard-creator.spec.js
      postcard-wall.spec.js
      map.spec.js
      admin.spec.js
      bug-feedback.spec.js
      api/
        posts.api.spec.js
        postcards.api.spec.js
        map.api.spec.js
        meta.api.spec.js      # settings, identity, reports, bug-reports, admin auth
    pages/
      BasePage.js             # goto, expectVisible, clearStorage, deviceId helpers
      LandingPage.js          # replaces Lpage.js (keep alias until migrated)
      DashboardPage.js        # replaces Dpage.js
      PostcardCreatorPage.js
      PostcardWallPage.js
      MapPage.js
      AdminPage.js
    components/
      Header.js               # fixed locators (search placeholder, Postcard/Wall/Map/Post)
      PostModal.js            # extracted from posting.js
      Feed.js
      MoodFilter.js
      Search.js
      BugReportModal.js
      MapSearch.js
      AdminTables.js          # moderation, feedback, postcards, map-notes, control panel
    api/
      apiClient.js            # wraps playwright request, injects x-admin-token
      postsApi.js, postcardsApi.js, mapApi.js, adminApi.js, metaApi.js
    fixtures/
      testData.js             # unique names/texts (Date.now()), moods, postcard payloads, map coords inside PH
      devices.js              # crypto.randomUUID per test, localStorage freespace_device_id seeding
    helpers/
      cleanup.js              # admin hard-reset / delete-all via API before/after suites
      auth.js                 # loginAdmin via API, returns token, saves storageState
```

Rules:

- Specs never use raw selectors — only Page/Component methods.
- Pages never assert — return locators/data; specs assert with `expect`.
- Components hold locators for shared UI (Header, Feed, modals).
- Every write test generates unique `deviceId` + unique text (`perf-${Date.now()}`) to dodge `RATE_LIMIT`/`DUPLICATE`.
- Admin tests use `request` fixture to login and pass `x-admin-token`; never scrape password from UI.
- Tag everything: `@smoke @regression @api @ui @admin @map @postcard @negative`.

Example skeleton (JS):

```js
// pages/BasePage.js
export class BasePage {
  constructor(page) { this.page = page; }
  async goto(path) { await this.page.goto(path); await this.page.waitForLoadState('networkidle'); }
}
// pages/DashboardPage.js
import { BasePage } from './BasePage.js';
import { PostModal } from '../components/PostModal.js';
export class DashboardPage extends BasePage {
  constructor(page) { super(page); this.postModal = new PostModal(page); }
  async open() { await this.goto('/home'); }
}
```

---

## 4. Page-by-page test plan

### A. Landing `/` — `LandingPage.js`

| ID | Case | Steps / assert |
|---|---|---|
| LAN-1 @smoke | Continue → RulesModal → /home | goto `/`, click Continue, `RulesModal` visible, Accept → `toHaveURL(/home/)` |
| LAN-2 | Rules modal close without accept | X/close → stays on `/` |
| LAN-3 | Responsive hero | 375px + 1440px screenshots, no overflow, feature grid 2x2 visible |
| LAN-4 | Static assets load | `lpBg`, 6 pics return 200, no console errors |

Fix `landingPage.spec.js`: uncomment URL assert, change to `/home`.

### B. Dashboard `/home` — `DashboardPage.js` + `Header, PostModal, Feed, MoodFilter, Search`

Feed/filter/search/pagination:

- DASH-F1 @smoke feed loads (spinner → cards or `No thoughts yet` empty state).
- DASH-F2 moods Happy/Sad/Angry/Hopeful/Anxious/All/My Posts: read sidebar count, click, `toHaveCount(count)`, all cards contain mood (keep existing `verifyMoodFilter` logic but wait for number first).
- DASH-F3 search text/username/mood (Header placeholder `Search thoughts, moods, or topics...`), clear X resets.
- DASH-F4 tag click (`#\w+`) banner `Showing posts for …`, Clear Filter.
- DASH-F5 contributor click `Showing posts by …`.
- DASH-F6 pagination: 4/page, next/prev, scroll-top, `key={currentPage}` remount.
- DASH-F7 blacklist censor: admin adds word → feed shows `***`.

Posting (`PostModal.jsx`):

- DASH-P1 @smoke create Happy post unique name/text → appears in feed (fix `verifyPostInFeed` scope).
- DASH-P2 all 5 moods parametrized (replaces 5 copy-paste tests).
- DASH-P3 validation: empty name → `Your name is required.`; empty text → submit disabled; 301 chars capped at 300 + counter red; bad mood rejected (API 400).
- DASH-P4 name lock: first post locks input (`Locked` badge), reload keeps lock; new device can use new name.
- DASH-P5 rate limit: seed 5 posts via API for device → 6th UI shows `Rate limit reached: Max 5 posts…`.
- DASH-P6 blacklist name/text → 400 `Banned words…`.
- DASH-P7 duplicate text same device → 429 `DUPLICATE`.
- DASH-P8 delete own post (soft delete → disappears, `device-count` decrements); delete others' → 403.
- DASH-P9 XSS: `<script>alert(1)</script>` stored stripped, no execution.

Interactions (`PostCard`):

- INT-1 like increments once per click, persists reload.
- INT-2 post reactions: add `❤️`, switch to `😂` (prev decrements), invalid emoji → 400.
- INT-3 comment add (max 500), reply nesting, comment reaction, delete own (cascade replies), delete others' → 403.
- INT-4 report → `Post reported…` alert, `reportedPostIds` includes; toggle un-reports; admin sees it in Posts tab.
- INT-5 realtime: two contexts — A posts, B sees new card without reload (Supabase channel).

### C. Postcard Creator `/postcard` — `PostcardCreatorPage.js`

- PC-1 @smoke fill To/From/Message → Share → toast `shared to the Wall!` + `View Wall →` navigates.
- PC-2 validation: empty To/From → `Please fill in both…`; message optional (allowed empty per API).
- PC-3 templates Classic/Sunset/Ocean/Vintage/Neon apply bg/font/border/stickers.
- PC-4 solid vs gradient toggle, 12 bg presets + custom color input, 8 text presets + custom.
- PC-5 13 fonts whitelist; custom font string via API → 400.
- PC-6 align left/center/right reflected in preview `text-align`.
- PC-7 borders none/elegant/dashed class check.
- PC-8 stickers: add → drag (mouse+touch) changes x/y 0–100, double-click removes, Clear all; >20 via API sanitized to 20.
- PC-9 Download → `page.waitForEvent('download')`, PNG `postcard-*.png`, non-empty.
- PC-10 rate limit: 5 shares/24h/device → 6th toast `Limit reached!…5 postcards per 24 hours`.
- PC-11 invalid hex/gradient via API → 400; XSS in To/From/Message stripped.

### D. Postcard Wall `/postcard-wall` — `PostcardWallPage.js`

- WALL-1 @smoke loads count text `N postcards`, grid renders, fallback demos when DB empty.
- WALL-2 search To/From filters, empty → `No postcards found for "…"`, clear restores.
- WALL-3 pagination 12/page.
- WALL-4 mini click → full modal (To/Message/From, posted date/time), X + backdrop click closes.
- WALL-5 realtime: share in creator context → wall context new card appears.
- WALL-6 long message truncates `…140` in mini, full in modal.

### E. Map `/map` — `MapPage.js` + `MapSearch.js`

UI is canvas-heavy — prefer API + DOM asserts over pixel checks.

- MAP-1 @smoke map canvas visible, `N active notes` badge, hint pill `Tap anywhere…`.
- MAP-2 click inside PH (e.g. Manila 14.5995,120.9842) → draft modal with coords + `visible for 5 hours`.
- MAP-3 click outside PH (ocean 0,0 via `map.flyTo` mock or API direct) → toast `only…inside the Philippines`.
- MAP-4 submit name 30/msg 150 → pin appears, toast `Note placed…Disappears in 5 hours`, popup shows name/msg/expiry countdown.
- MAP-5 validation: empty name/msg → `Please fill in both…`; 31/151 chars trimmed; blacklist → 400; invalid uuid → 400.
- MAP-6 rate limit: 10 notes/hour/device → 11th 429 `Take a break!`.
- MAP-7 name lock prefill from identity; locked badge.
- MAP-8 style tabs: 8 fonts, 8 themes (sakura…golden), 5 borders, 40 emojis — submit each combo via API-serialized `__FS_NOTE__` and verify popup renders.
- MAP-9 search: type city → Places section (Nominatim, PH-only), type author → Matching Notes section, Enter/keyboard nav, select flies (`flyTo` zoom 13.5/15.5) + toast with nearby count; `X` clears.
- MAP-10 Popular Locations chips show nearby counts; My Location GPS (grant permission → centered, outside PH → toast).
- MAP-11 expiry: expired `expires_at` filtered from `fetchMapNotes`, marker removed on 60s refresh.
- MAP-12 XSS: `<img onerror>` in name/msg rendered as text in popup (textContent, not innerHTML).

Mock geolocation + Nominatim in tests: `context.grantPermissions(['geolocation'])`, `page.route('**/nominatim.openstreetmap.org/**', ...)`.

### F. Admin `/admin` — `AdminPage.js` + `AdminTables.js`

- ADM-1 @smoke wrong password → `Incorrect password. Access denied.`; correct (via `ADMIN_PASSWORD` env / API login) → Command Center + 7 tabs + counts badges.
- ADM-2 session: `freespace_admin_auth=true` persists F5, gone after tab close (sessionStorage); logout rotates password (old token 401).
- ADM-3 Command Center: stats reflect posts count, online users presence; Quick Actions: Purge Expired, Unlock All, Delete All Posts, Delete Map Notes, Nuclear Reset (confirm `RESET`) — each with `window.confirm` handler + API verify.
- ADM-4 Posts tab: delete single, bulk delete, bulk approve (unreport), reset user (unlocks + hard-deletes device posts).
- ADM-5 Map Notes tab: list all incl. expired (device_id visible), delete single.
- ADM-6 Postcards tab: delete single + bulk.
- ADM-7 Feedback tab: bug + suggestion rows, delete single/bulk/all.
- ADM-8 Settings tab: `auto_delete_hours` 1–168 ok / 0,169,NaN → 400; `blacklisted_words` add/remove persists to feed censor; unknown key → 400.
- ADM-9 Guidelines static render.
- ADM-10 authz: all admin APIs without `x-admin-token` → 401 (posts purge, postcards delete, map delete, settings PUT, identity DELETE, hard-reset).
- ADM-11 ThemeToggle dark/light persists.

### G. Feedback / Bug modal (global on Dashboard)

- FB-1 open via `Got a Bug?` / `Have an Idea?` floating buttons, modes bug/suggestion.
- FB-2 submit text + reporter + screenshot ≤2MB → 201, appears in admin Feedback; >3MB base64 → 400 `Screenshot too large`.
- FB-3 empty text → 400; type invalid → 400.

---

## 5. API test plan (Playwright `request` fixture, no UI)

Base: `baseURL=http://localhost:3001`, or reuse Vite proxy `/api`. Seed unique `deviceId=crypto.randomUUID()` per test. Admin token via `POST /api/admin/login {password: process.env.ADMIN_PASSWORD}`.

| Suite | Cases (happy + negative) |
|---|---|
| `health` | `GET /api/health` 200 `{ok:true}` |
| `posts` | GET returns newest-first non-deleted in-window with nested comments; POST happy 201; missing username/mood/text/deviceId → 400; mood invalid → 400; text >300 → 400; bad uuid → 400; blacklist name/text → 400; 6th post → 429 `RATE_LIMIT`; dupe text → 429 `DUPLICATE`; `GET device-count` matches; LIKE increments; reaction happy + switch + invalid → 400; DELETE own 200, others 403, missing 404; XSS stripped |
| `comments` | POST comment + reply (parentId) 201; bad parentId → 400; text >500 → 400; blacklist → 400; reaction switch + invalid → 400; DELETE own 200, others 403, missing 404 |
| `reports` | POST upsert 200, GET contains id, DELETE removes; invalid postId → 400 |
| `settings` | GET has keys; PUT admin ok; PUT no-token → 401; unknown key → 400; hours 0/169 → 400; blacklist non-array → 400 |
| `identity` | POST lock 200; GET returns row; invalid uuid GET → null; POST bad uuid → 400; blacklist name → 400; DELETE admin 200, no-token 401 |
| `bug-reports` | GET newest-first; POST bug + suggestion 201; empty → 400; bad type → 400; image upload happy + oversize → 400; DELETE + delete-batch admin 200, no-token 401, empty ids → 400 |
| `postcards` | GET newest-first; POST happy 201 (all whitelists); each invalid (to/from/message len, bgType/align/border/font, hex, gradient, uuid) → 400; 6th/24h → 429 `LIMIT_REACHED`; stickers >20 trimmed; DELETE + batch admin 200, no-token 401 |
| `map` | GET active only ≤500 newest-first; POST happy 201 expires ~+5h; empty name/msg → 400; outside PH → 400; bad uuid → 400; blacklist → 400; 11th/hour → 429; GET all-notes admin + no-token 401; DELETE admin 200 / bad uuid 400 / no-token 401 |
| `admin auth` | login wrong → 401; login ok returns token; authed `copy-password` 200, unauthed 401; `logout` rotates password (old fails); rate limit 11 logins/15min → 429; `unlock-all-names`, `delete-all-posts`, `delete-all-map-notes`, `hard-reset` happy + no-token 401 |
| `security` | global 301st req/15min → 429; write 31st POST/15min → 429; HTML in every text field stripped; invalid reaction/postcard font rejected |

Cleanup helper: `beforeEach` → `POST /api/admin/hard-reset` (or scoped deletes) with admin token so suites are isolated. Never run hard-reset against prod — gate on `baseURL includes localhost`.

---

## 6. Config + execution fixes (do first)

```js
// qa/automation/playwright.config.js
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // API project runs specs/api only, no browser needed
    { name: 'api', testMatch: /.*\.api\.spec\.js/, use: {} },
  ],
  webServer: [
    { command: 'node backend/server/index.js', url: 'http://localhost:3001/api/health', reuseExistingServer: !process.env.CI, env: { PORT: '3001' } },
    { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI },
  ],
});
```

Commands (root):

```bash
npm run dev:all              # app first (or rely on webServer)
npm run test:e2e              # all
npx playwright test --config qa/automation/playwright.config.js --project=chromium --grep @smoke
npx playwright test --config qa/automation/playwright.config.js --project=api
npm run test:e2e:report
```

CI (`.github/workflows/playwright.yml` already runs on push/PR): add `.env` secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`), remove all `test.only`, enforce `npm run lint`.

---

## 7. Phased rollout

1. **P0 foundation (0.5 day):** remove `test.only`, add `baseURL`+`webServer`, fix `header.js` locators, scope `verifyPostInFeed`, add `BasePage` + unique test data + `cleanup.js`. Gate: `@smoke` green on chromium.
2. **P1 POM refactor:** rename `Lpage→LandingPage`, `Dpage→DashboardPage` (keep re-exports), split `posting.js→PostModal.js+Feed.js`, add fixtures. Gate: existing 11 tests pass without hardcodes.
3. **P2 UI pages:** landing → dashboard feed/post → interactions → postcard creator/wall → map → bug modal → admin (in that order; admin last as it wipes data).
4. **P3 API suites:** posts → comments → postcards → map → meta/admin (fast, run on every PR, used to seed UI tests).
5. **P4 negative/security/rate-limit + mobile (Pixel 5 / iPhone 12 commented back in) + a11y smoke.**
6. **P5 docs:** manual checklists in `qa/manual/` mirror automated tags; HTML report artifact in CI.

Exit criteria: `@smoke` 100% pass (chromium+firefox+webkit), `@regression` ≥95%, API ≥95%, zero `test.only`/`console.error` on happy paths, flake rate <2% over 5 runs.

---

## 8. Immediate next files to create

- `tests/pages/BasePage.js`, `LandingPage.js`, `DashboardPage.js`, `PostcardCreatorPage.js`, `PostcardWallPage.js`, `MapPage.js`, `AdminPage.js`
- `tests/components/PostModal.js` (split from `posting.js`), `Feed.js`, `Search.js`, `BugReportModal.js`, `MapSearch.js`, `AdminTables.js`
- `tests/api/apiClient.js` + `*.api.spec.js` per section 5
- `tests/fixtures/testData.js`, `tests/fixtures/devices.js`, `tests/helpers/cleanup.js`, `tests/helpers/auth.js`
