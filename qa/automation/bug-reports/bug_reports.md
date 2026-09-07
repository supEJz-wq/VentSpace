<!-- FILING GUIDE (read first, 60 seconds):
  ID: next free BUG-### (never reuse numbers, even after closing).
  Required fields per bug: Title, Severity, Status, Page (route URL), Found by (test ID + spec file),
  Repro steps, Re-reproduce (exact command proving it), Expected, Actual,
  Evidence (file:line or console text), Suggested fix.
  Severity: High = data loss/security/broken core flow. Medium = feature broken with workaround.
            Low = cosmetic/dev-only/needs-decision. Info = behavior to lock in, not fix.
  Status: Open → Fixed → Verified (green test re-run) → Closed. Use "Needs decision" when product must rule.
  Link every bug to its proving test — the test stays as the regression guard after the fix.
  Sweep: 2026-09-03/04, chromium per-file runs — feed+post 20/20, interactions 5/5, postcards 17/17,
  map 14/14, landing+feedback+admin 11/11 (one transient flake, green on rerun).
-->

# Bug Reports — VentSpace Automation

> Location: `qa/automation/bug-reports/bug_reports.md`. Companion: `../automation-plan/phase.md`.
> How to add: copy the template at the bottom, take the next BUG number, keep checkboxes honest.

## Index

| ID | Title | Severity | Status | Found by |
|----|-------|----------|--------|----------|
| [BUG-001](#bug-001--admin-settings-never-persist-missing-admin-token) | Admin settings never persist (missing admin token) | High | Open | ADM-8 |
| [BUG-002](#bug-002--feedback-table-crashes-on-null-reporter_name) | Feedback table crashes on null reporter_name | Medium | Open | ADM-567 |
| [BUG-003](#bug-003--map-marker-click-opens-a-stray-draft-modal) | Map marker click opens a stray draft modal | Medium | Open | MAP-11/12 |
| [BUG-004](#bug-004--postmodal-typed-name-wiped-by-late-identity-load-dev-only) | PostModal typed name wiped by late identity load (dev only) | Low | Open | DASH-P5 |
| [BUG-005](#bug-005--fresh-posts-can-read--1h-ago) | Fresh posts can read "-1h ago" | Low | Open | INT-6 |
| [BUG-006](#bug-006--like-path-plumbed-but-no-like-button-in-ui) | Like path plumbed but no like button in UI | Low | Needs decision | INT-1 |
| [BUG-007](#bug-007--wall-search-ignores-message-bodies) | Wall search ignores message bodies | Low | Needs decision | WALL-2 |
| [BUG-008](#bug-008--hours-slider-caps-72-but-api-allows-168) | Hours slider caps 72 but API allows 168 | Low | Open | ADM-8/API |
| [BUG-009](#bug-009--logout-rotates-password-but-live-tokens-survive) | Logout rotates password but live tokens survive | Info | Needs decision | API-ADMIN |
| [BUG-010](#bug-010--map-first-paint-can-render-zero-markers) | Map first paint can render zero markers | Low | Open | MAP-11 |
| [BUG-011](#bug-011--logout-env-rewrite-restarts-vite-and-kills-its-own-response) | Logout .env rewrite restarts Vite, killing its own response | Low | Open | API-ADMIN |
| [BUG-012](#bug-012---icon-only-controls-lack-accessible-names) | Icon-only controls lack accessible names | Low | Open | A11Y |
| [Behaviors](#locked-behaviors-not-bugs) | Truncation (not rejection) locked by tests | Info | Locked | P3 |

---

## BUG-001 — Admin settings never persist (missing admin token)

- **Severity:** High · **Status:** Open · **Area:** Admin Settings / API client
- **Found by:** ADM-8 (`tests/specs/admin.spec.js`)
- **Page:** `/admin` → Settings tab
- **Re-reproduce:** `npx playwright test --config qa/automation/playwright.config.js --project=chromium --workers=1 tests/specs/admin.spec.js --grep "ADM-8"`
- **Repro:**
  1. Log in at `/admin`, open Settings.
  2. Drag hours to 24, add a blacklist word.
  3. Reload the page.
- **Expected:** Hours read 24, word chip present (PUT 200).
- **Actual:** Both PUTs return 401; UI looked saved (optimistic state) but reload reverts everything.
- **Evidence:** `API PUT /settings/auto_delete_hours failed (401)` in console; `updateSetting()` in `frontend/src/lib/api.js:247` sends no `adminHeaders()`, unlike every sibling call.
- **Suggested fix:** attach `headers: adminHeaders()` in `updateSetting()` (one line, matches purge/delete calls).

## BUG-002 — Feedback table crashes on null reporter_name

- **Severity:** Medium · **Status:** Open · **Area:** Admin Feedback table
- **Found by:** ADM-567 (`tests/specs/admin.spec.js`)
- **Page:** `/admin` → Feedback tab
- **Re-reproduce:** `npx playwright test --config qa/automation/playwright.config.js --project=chromium --workers=1 tests/specs/admin.spec.js --grep "ADM-567"`
- **Repro:**
  1. `POST /api/bug-reports` with `{ text, type }` and no reporterName.
  2. Open `/admin` → Feedback tab.
- **Expected:** Row renders (e.g. blank/Anonymous author).
- **Actual:** `TypeError: Cannot read properties of null (reading 'toLowerCase')`, table blanks out.
- **Evidence:** `FeedbackReportsTable.jsx` filters on `r.reporterName.toLowerCase()` with no null guard.
- **Suggested fix:** `(r.reporterName ?? '').toLowerCase()` + default `reporter_name` server-side.
- **Workaround in suite:** specs seed `reporterName` and purge null rows via API first (see ADM-567).

## BUG-003 — Map marker click opens a stray draft modal

- **Severity:** Medium · **Status:** Open · **Area:** FreeSpace Map pins
- **Found by:** MAP-11/MAP-12 debugging (`tests/specs/map.spec.js`, `MapPage.openMarkerPopup`)
- **Page:** `/map` (any placed pin)
- **Re-reproduce:** place any pin, then click directly on its marker — a draft modal opens over everything (suite avoids clicks; see MAP-11 passing via hover).
- **Repro:**
  1. Place a pin, then click directly on its marker.
  2. Watch the draft modal open on top of everything.
- **Expected:** Only the note popup toggles.
- **Actual:** Marker clicks propagate to `map.on('click')`, opening a fresh draft modal (blocks further clicks).
- **Evidence:** modal reappears post-submit with locked name + empty message; suite uses hover-only as workaround.
- **Suggested fix:** `stopPropagation()` on the marker element's mousedown/click.

## BUG-004 — PostModal typed name wiped by late identity load (dev only)

- **Severity:** Low · **Status:** Open · **Area:** PostModal identity effect
- **Found by:** DASH-P5 (`tests/specs/dashboard-post.spec.js`, bisected with temp probes)
- **Page:** `/home` → Post Something modal (dev `npm run dev` only, never prod builds)
- **Re-reproduce:** `npx playwright test --config qa/automation/playwright.config.js --project=chromium --workers=1 tests/specs/dashboard-post.spec.js --grep "DASH-P5"` (fails without the `waitForSettled()` drain on slow identity responses).
- **Repro (dev `npm run dev` only):** open PostModal, type a name, have settings/identity resolve ~1s late.
- **Expected:** Typed name stays.
- **Actual:** Second `loadIdentity` resolution resets username to `""`.
- **Evidence:** effect has no stale-response guard (deps `[isOpen, autoDeleteHours]` refire and overwrite).
- **Suggested fix:** request-id/ignore-stale guard in the effect. Prod builds unaffected (no StrictMode double-fire).
- **Workaround in suite:** `PostModal.waitForSettled()` drains in-flight `/api/identity` before filling.

## BUG-005 — Fresh posts can read "-1h ago"

- **Severity:** Low · **Status:** Open · **Area:** PostCard timestamp
- **Found by:** INT-6 (`tests/specs/dashboard-interactions.spec.js`)
- **Page:** `/home` (any fresh post card timestamp)
- **Re-reproduce:** create a post and read its time label within seconds — intermittently `-1h ago` instead of `Just now` (clock-skew dependent).
- **Repro:** create a post; read its time label within the first seconds.
- **Expected:** `Just now`.
- **Actual:** sometimes `-1h ago` (server clock ahead → negative diff → `Math.floor` gives -1).
- **Evidence:** `timeAgo()` in `PostCard.jsx` never clamps negatives.
- **Suggested fix:** clamp hours at zero (`Math.max(0, …)` → `Just now`).

## BUG-006 — Like path plumbed but no like button in UI

- **Severity:** Low · **Status:** Needs decision · **Area:** PostCard / feed
- **Found by:** INT-1 (`tests/specs/api/posts.api.spec.js` — API-only by necessity)
- **Page:** `/home` (post cards — the missing control) + `POST /api/:id/like`
- **Re-reproduce:** open any post card — no like button exists; API side: `npx playwright test --config qa/automation/playwright.config.js --project=api tests/specs/api/posts.api.spec.js --grep "INT-1"`.
- **Repro:** open any post card; look for a like control.
- **Expected:** either a working like button or no like code.
- **Actual:** `toggleLike` prop threads through Feed→PostCard but renders nothing; only `POST /:id/like` works.
- **Evidence:** grep for `toggleLike|incrementLikes` — zero Like UI in `PostCard.jsx`.
- **Suggested fix:** product call — add the button or remove the dead path (plus `AdminStats` Total Likes source).

## BUG-007 — Wall search ignores message bodies

- **Severity:** Low · **Status:** Needs decision · **Area:** Postcard Wall search
- **Found by:** WALL-2 (`tests/specs/postcard-wall.spec.js`)
- **Page:** `/postcard-wall` search box
- **Re-reproduce:** `npx playwright test --config qa/automation/playwright.config.js --project=chromium --workers=1 tests/specs/postcard-wall.spec.js --grep "WALL-2"` (message-only term yields the empty state).
- **Repro:** search a verbatim message string on `/postcard-wall`.
- **Expected:** matching cards (or documented To/From-only scope).
- **Actual:** zero results + `No postcards found` (filter checks To/From only; admin Postcards table *does* search messages).
- **Evidence:** filter in `PostcardWallPage.jsx` vs `PostcardsTable.jsx`.
- **Suggested fix:** product call — include messages or label the box "To/From only".

## BUG-008 — Hours slider caps 72 but API allows 168

- **Severity:** Low · **Status:** Open · **Area:** Admin ControlPanel vs settings API
- **Found by:** ADM-8 review + API-SETTINGS (`ControlPanel.jsx` range 1–72 vs `meta.js` 1–168).
- **Page:** `/admin` → Settings tab (slider) + `PUT /api/settings/auto_delete_hours`
- **Re-reproduce:** drag the slider to max (stops at 72); API side accepts 168 — see API-SETTINGS in `npx playwright test --config qa/automation/playwright.config.js --project=api tests/specs/api/meta.api.spec.js --grep "SETTINGS"`.
- **Expected:** one agreed range end to end.
- **Actual:** UI caps at 72h, API accepts to 168h.
- **Suggested fix:** align both (recommend 168 everywhere, slider max 168).

## BUG-009 — Logout rotates password but live tokens survive

- **Severity:** Info · **Status:** Needs decision · **Area:** Admin auth
- **Found by:** API-ADMIN-LOGOUT (`tests/specs/api/admin.api.spec.js`)
- **Page:** none (API flow; UI path is `/admin` login → Log out)
- **Re-reproduce:** `npx playwright test --config qa/automation/playwright.config.js --project=api tests/specs/api/admin.api.spec.js --grep "LOGOUT"` (asserts stale-token survival + rotation).
- **Repro:** login → logout → reuse the old `x-admin-token` within its 1h TTL.
- **Expected:** ambiguous — either revoke-all or document survival.
- **Actual:** old token still authorizes (only the password changed).
- **Evidence:** copy-password with stale token returns 200 post-logout.
- **Suggested fix:** confirm intended; if revocation wanted, clear the token map on logout.

## BUG-010 — Map first paint can render zero markers

- **Severity:** Low · **Status:** Open · **Area:** Map load sequencing
- **Found by:** MAP-11 (`tests/specs/map.spec.js`, `MapPage` notes)
- **Page:** `/map` (first paint with slow tiles)
- **Re-reproduce:** throttle tile loading so fetch beats map `load` — pins stay missing until the 60s refresh (suite forces renders via UI submit instead).
- **Repro:** throttle tile loading so fetch beats map `load`.
- **Expected:** pins appear on first paint regardless of order.
- **Actual:** `renderMarkers` early-returns pre-load, and the `load` handler replays a stale empty list — recovery waits up to 60s.
- **Evidence:** render effect closes over mount-time `notes`; suite submits via UI to force a fresh render.
- **Suggested fix:** keep latest notes in a ref for the load handler (or render on both ready).

## BUG-011 — Logout .env rewrite restarts Vite and kills its own response

- **Severity:** Low · **Status:** Open · **Area:** Dev infra (admin logout + Vite watcher)
- **Found by:** API-ADMIN-LOGOUT (`tests/specs/api/admin.api.spec.js`)
- **Page:** none (dev-infra; proxied `POST /api/admin/logout` during `npm run dev`)
- **Re-reproduce:** `npx playwright test --config qa/automation/playwright.config.js --project=api tests/specs/api/admin.api.spec.js --grep "LOGOUT"` (proves rotation by effects with restart-gap retries).
- **Repro:** POST logout through the Vite proxy while watching responses.
- **Expected:** always a clean 200.
- **Actual:** intermittently `socket hang up` / ECONNRESET — the rewrite triggers a dev-server restart mid-response.
- **Evidence:** backend stays alive (direct `:3001` healthy); only proxied calls drop; suite proves rotation by effects with retries.
- **Suggested fix:** respond before rewriting, or debounce/exclude `.env` from the watcher restart path.

## BUG-012 - Icon-only controls lack accessible names

- **Severity:** Low
- **Status:** Open
- **Area:** Cross-page icon buttons + floating labels
- **Found by:** A11Y audit (`tests/specs/a11y.spec.js` asserts the named parts; this tracks the gaps)
- **Page:** `/home` (post trash, comment send, reaction toggles), all modals (X close buttons), postcard align buttons, pagination chevrons, `/admin` password field
- **Re-reproduce:** audit run `npx playwright test --config qa/automation/playwright.config.js --project=chromium --workers=1 tests/specs/a11y.spec.js`, then inspect any icon-only button (no title/aria-label) and the admin password label (no htmlFor/id link; placeholder is a single space).
- **Repro:** keyboard/screen-reader pass over icon-only controls announces nothing useful.
- **Expected:** every interactive control exposes a name (title, aria-label, or associated label).
- **Actual:** trash/send/X/align/chevron controls are icon-only with no name; admin password label unlinked; bug textarea has no label element.
- **Evidence:** `PostCard.jsx` trash/send buttons, `RulesModal`/`PostModal`/`BugReportModal` X buttons, `PostcardPage.jsx` align group, `Pagination.jsx` chevrons, `Admin.jsx` floating label.
- **Suggested fix:** add `title`/`aria-label` per control; link floating labels with htmlFor/id.

## Locked behaviors (not bugs)

- **Truncate, don't reject:** over-long text fields are sliced server-side — 501-char comments store 500, 61-char postcard To stores 60, 31-char map names store 30 (`sanitize-then-max`). Locked by API-COMMENTS-NEGATIVES, API-POSTCARDS-NEGATIVES, MAP-5. Change only with product sign-off.

---

## Report template (copy for new bugs)

```md
## BUG-0XX — Title here

- **Severity:** High/Medium/Low/Info · **Status:** Open · **Area:** page/component
- **Found by:** TEST-ID (`spec file path`)
- **Page:** `/route` + tab/section where it shows
- **Re-reproduce:** exact `npx playwright test ... --grep "TEST-ID"` command proving it.
- **Repro:** numbered steps a reviewer can follow.
- **Expected:** what correct looks like.
- **Actual:** what happens instead.
- **Evidence:** file:line, console text, or screenshot path.
- **Suggested fix:** concrete, preferably one-liner location.
```

## Review box

- Confirmed bugs (fix next): ...
- Needs-decision rulings (BUG-006/007/009): ...
- Downgrades/upgrades: ...
- New bugs to append: ...
