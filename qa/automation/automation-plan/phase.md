# VentSpace — Phased Test Plan (for review, deep-dive edition)

> How to review: tick what you approve, comment what to change/add.
> Reply like: `Approve P0, P1. In P2 remove MAP-10 / change DASH-P5 to ... / add TC-...`
> Companion: `README.md` (architecture). This file = WHAT test gets created and FROM WHAT code.
> Deep-dive date: 2026-09-03. All paths verified in repo.

Legend: `[ ]` = proposed. Pri: P1 smoke, P2 high, P3 medium.

---

## 0. Deep-dive findings — what actually creates each test

Read every page/component/route. These facts dictate the test list below — call out if any assumption is wrong.

### Landing `/` (`Pages/LandingPage.jsx`, `Components/RulesModal.jsx`, `Components/Logo.jsx`)
- Continue button `Continue →` (`LandingPage.jsx:117-122`, locator today: `button.bg-gradient-to-r` in `Lpage.js:10` — too broad, must scope to exact text) opens `RulesModal` (`showRules` state).
- Modal has 4 fixed rules: Respect the Sanctuary / Anonymous but Responsible / Privacy First / Real Emotions (`RulesModal.jsx:7-28`), `I Agree & Continue` → `navigate('/home')`, `Go Back` + X + backdrop click → close, stay on `/`.
- Creates: LAN-1 (accept path), LAN-2 (all 3 dismiss paths), LAN-3 (grid `grid-cols-2`, hero `VentSpace`, 6 xl-only pics), LAN-4 (lpBg + 6 assets 200).

### Dashboard `/home` (`Pages/Dashboard.jsx`, `Components/Header.jsx`, `LeftSidebar.jsx`, `RightSidebar.jsx`, `Feed.jsx`, `PostModal.jsx`)
- Layout: `Header` sticky + 3-col grid `280px_minmax(0,1fr)_300px`, sidebars `hidden lg:block` (`Dashboard.jsx:440-488`). Mobile has second search row (`Header.jsx:87-107`).
- Header search placeholder is `Search thoughts, moods, or topics...` (`Header.jsx:30,92`) — current `header.js:5` uses `input[placeholder="Search"]` = STALE, creates P0-4. Nav buttons: Postcard (`Mail` icon), Wall (🖼️), Map (`MapPin`), `Post Something`/`Post` (`Header.jsx:50-81`).
- Mood filter data: `moods` = All Thoughts 🧠, My Posts 📝, Happy 😊, Sad 😢, Angry 😠, Hopeful 🤞, Anxious 😰 (`Data/mockData.js:3-11`). Counts from `moodData` (`Dashboard.jsx:326-335`), badge only if number (`LeftSidebar.jsx:56-61`). Clicking sets mood + clears tag/contributor/search + page 1 (`Dashboard.jsx:291-295`). Creates DASH-F2 (7 filters incl. All/My Posts), plus `verifyMoodFilter` keep: read count → click → `toHaveCount` (`feedfilterAction.js:54-60`).
- Today's Vibe donut: recharts `Pie innerRadius 52 outerRadius 74`, legend % bars, center shows dominant mood icon + `N thoughts`, empty = `Be the first vibe` (`LeftSidebar.jsx:80-133`). Creates DASH-V1 (new, was missing).
- RightSidebar: Recent Topics = top 8 deduped lowercase `#\w+` newest-first (`Dashboard.jsx:351-362`), rank badges 1-3, empty `No topics yet. Start posting with #hashtags!`; Recent Activity = top 5 unique posters newest-first with medals 🥇🥈🥉 + mood emoji (`Dashboard.jsx:338-348`), empty `No activity yet.` (`RightSidebar.jsx:36-126`). Clicking sets banner `Showing posts for/by …` + Clear Filter (`Dashboard.jsx:426-437`). Creates DASH-F4/F5.
- Feed: 4/page (`POSTS_PER_PAGE=4`), `key={currentPage}` remount, empty `No thoughts yet` + `Share a Thought` button, loading `Loading thoughts...` spinner (`Dashboard.jsx:322-323,449-474`, `Feed.jsx:38-68`). `Pagination.jsx`: hidden if ≤1 page, max 5 numbers with `...`, chevrons disabled at ends. Creates DASH-F1/F6.
- PostModal (`PostModal.jsx`): name required (`Your name is required.`), text required + 300 max with counter red >280, moods default Happy, submit `Post Anonymously 🚀` disabled if empty, name locks `Locked` badge for `autoDeleteHours` via `GET /api/identity/:device` (`PostModal.jsx:25-49,61-103`). Client rate check `getDevicePostCount >= 5` → `Rate limit reached: Max 5 posts every 5 hours.`; client blacklist from `localStorage freespace_bad_words` (NOTE: backend uses DB `settings.blacklisted_words` — mismatch, test both). Creates DASH-P1..P9. Identity storage: `freespace_device_id` (randomUUID), `freespace_username_data {name,timestamp}` (`lib/identity.js`).
- Ownership: `myPostIds` in `localStorage ventspace_my_posts` (version key `supabase-v1`), `myCommentIds` in `ventspace_my_comments` (`Dashboard.jsx:42-74`). Delete post = soft delete `is_deleted=true` owner-or-admin (`routes/posts.js:182-202`). Creates DASH-P8.

### Interactions (`Components/PostCard.jsx` — 445 lines, richest file)
- Text truncates at 150 chars + `See more/less` (`PostCard.jsx:28,291-292,344-348`). Time shows `Just now/1h ago/Nh ago` only (no days) (`:294-299`). Mood pill colors per mood (`:7-15`).
- **TRAP: `toggleLike` prop is passed (`Feed.jsx:16`, `Dashboard.jsx:152-159`, API `POST /:id/like` exists) but NO like button is rendered in `PostCard.jsx`** — grep confirms zero Like UI. So INT-1 becomes API-only + UI-asserts-absent (or bug ticket). Don't write a UI like-click test.
- Reactions: 6 emojis ❤️😂😮😢😡👏 (`:18-25`), hover picker (300ms close delay), click toggles picker too, toggle-off supported, summary bubbles + breakdown on hover/click, persisted `localStorage freespace_user_reactions` (`:248-281,393-408`). API enforces whitelist, prevEmoji decrement (`routes/posts.js:161-179`). Creates INT-2 (add → switch → toggle-off → invalid-400 API).
- Comments: toggle `MessageCircle` + recursive count (`:30-31,410-413`), form `Add a comment...` + Send (`:435-438`), reply `Reply/Cancel` → inline `Write a reply to {username}...` autofocus + `replying to @user` chip (`:190-212`), nesting with `replied to @parent` + indent (`:98-105,214-230`), delete trash only if `myCommentIds` OR `username===myName` (`:56`), comment reactions same 6 emojis with hover picker persisted `ventspace_comment_reactions` (`:33-78,128-175`). API: 500 max, parentId validated, blacklist, owner-or-admin delete cascade (`routes/posts.js:204-289`). Creates INT-3 (add/reply/nested/reactions/delete-own/delete-others/500-cap).
- Report: only if `!isMyPost`, `Report/Reported` orange toggle (`:415-419`), `alert('Post reported to admins...')` (`Dashboard.jsx:277`). Creates INT-4 (incl. Admin reported-queue check).
- Realtime: `posts-realtime` INSERT/DELETE → refetch (`Dashboard.jsx:111-129`). Creates INT-5 (two contexts).

### Postcard Creator `/postcard` (`Pages/PostcardPage.jsx`, 688 lines)
- Fields: To, Message (6 rows), From; Style tab: 5 templates (classic/sunset/ocean/vintage/neon with fixed bg/font/border/stickers `:63-69`), bg solid|gradient toggle, 12 solid presets + custom color input, 8 gradients (all `linear-gradient(135deg,#hex,#hex)` — API regex enforces exactly this), 8 text presets + custom, 13 fonts (`FONTS` list = API `FONTS` whitelist), align left/center/right, borders none/elegant/dashed (`PostcardPage.jsx:9-86`).
- Stickers: 15 (`STICKERS`), add at random 40-60%, drag via mouse+touch (`startDrag`), double-click removes, Clear all, counter `N stickers — drag to position...` (`:373-399,100-146,644-655`).
- Actions: Reset (`setCard(DEFAULT_STATE)`), Share → `sharePostcardDB` needs To+From else `Please fill in both...`, 429 `LIMIT_REACHED` → `Limit reached! You can share 5 postcards per 24 hours.`, success toast 3.5s + `View Wall →` (`:173-200`); Download via html2canvas scale 3 → `postcard-{Date.now()}.png` (`:149-165`). Preview `cardRef` minHeight 400, corner ✦ ornaments. Creates PC-1..PC-11.

### Wall `/postcard-wall` (`Pages/PostcardWallPage.jsx`, 544 lines)
- Fallback: 14 `MOCK_POSTCARDS` when DB empty (`:37-136,333`). Search filters **To/From only (not message!)** (`:353-357`) — test must assert message doesn't match. 12/page (`:327`), `Pagination` shared. Mini card tilt `perspective(800px) rotate 12deg` on mousemove (`:144-154`), template badge, `timeAgo` Just now/Xm/Xh/Xd (`:12-20`), message truncated 140 + `…` (`:183`), full modal with posted date+time, X + backdrop close (`:217-317`). Realtime `postcard-wall-realtime` (`:338-350`). Creates WALL-1..WALL-6.

### Map `/map` (`Pages/MapPage.jsx`, 1300+ lines, biggest)
- MapLibre + OSM raster tiles, center `[122.94,12.87]` zoom 5.05, cursor crosshair, click → draft only if inside PH bbox 4.4–21.2/115–131 (mirrors server + DB CHECK) else toast `📍 Notes can only be placed inside the Philippines.` (`MapPage.jsx:27-30,477-518`).
- Load `GET /api/map/notes` active-only, refresh 60s, markers custom `fs-pin-custom` gradient + glow, hover peek + click popup (`:435-541`). Popup XSS-safe via `textContent` (`buildPopupContent :226-263`) — creates MAP-12.
- Place-note modal tabs content/style: name 30 + counter, msg 150 + counter, pin emoji picker 40 (`STICKER_EMOJIS`), fonts 8 (`NOTE_FONTS`), themes 8 (`NOTE_THEMES` sakura/violet/ocean/sunset/emerald/midnight/ruby/golden with gradient+glow), borders 5 (`BORDER_STYLES`), message packed `__FS_NOTE__{m,f,c,b,e}` (`serializeNoteMessage :185-193`). Submit → `POST /api/map/notes` `{name,message,latitude,longitude,deviceId}`; errors shown inline (`:705-765`). Identity prefill+🔒 lock like PostModal (`:303-328`). Success toast `📌 Note placed...Disappears in 5 hours.` + easeTo zoom ≥12 + popup (`:740-764`). Creates MAP-2..MAP-8.
- Search: live filter active notes (name+decoded message) + Nominatim `countrycodes=ph limit 5` debounced 320ms, outside-PH results dropped, each place enriched nearby ≤15km count (Haversine), keyboard Up/Down/Enter/Esc, select → flyTo 1300ms (loc 13.5 / note 15.5) + search pin 12s + toast with counts; Popular Locations 6 chips (Manila/Cebu/Baguio/Davao/Boracay/Siargao with zooms); GPS `handleUseMyLocation` (outside PH → toast); clear X (`:337-470,542-702,770-781`). Mock Nominatim + geolocation in tests. Creates MAP-9/MAP-10.
- Server: name 30/msg 500 sanitized, 10/hour/device, `expires_at = now+5h`, `GET /notes` active ≤500, admin all-notes + delete (`routes/map.js`). Client msg cap 150 < server 500 — boundary test both. Creates MAP-4..MAP-6/MAP-11 + API-MAP.

### Feedback (`Components/BugReportModal.jsx`, floating buttons `Dashboard.jsx:402-417`)
- Open via `Got a Bug?`/`Have an Idea?`, modes bug/suggestion synced on open, `Reporting as:` prefilled from identity else `Anonymous User`, placeholders differ, file `accept=image/*`, submit disabled if empty, spinner, `Success!` 2s → reset+close, `alert(failed)` (`BugReportModal.jsx:6-59,94-159`). API: type enum, text 1–1000, reporter ≤50, image base64 ≤3M (~2MB) else 400, storage `bug_reports` bucket (`routes/meta.js:210-271`). Creates FB-1..FB-3 + API-BUGS.

### Admin `/admin` (`Pages/Admin.jsx` 642 + 7 `Components/Admin/*`)
- Login: `sessionStorage freespace_admin_auth=true` (F5 keeps, tab-close clears), floating-label `Admin Password`, wrong → `Incorrect password. Access denied.`, `Copy password to clipboard` (`copyAdminPassword`), `Enter Dashboard/Verifying...`, token `sessionStorage ventspace_admin_token` 1h via `POST /api/admin/login` constant-time compare (`Admin.jsx:321-393`, `lib/adminAuth.js`). **Logout ROTATES password** (`POST /api/admin/logout` rewrites `.env` + `clip`) — tests must re-read env, never assume static password. Creates ADM-1/ADM-2.
- Shell: 7 tabs with `PAGE_META` titles/descs + count badges (posts/mapnotes/postcards/feedback) (`Admin.jsx:28-67,395-403`), desktop 232px sidebar + mobile top nav, ThemeToggle (`:415-502`). Command Center = `AdminStats` (Total Posts = length, Online Now = presence excl. own device via `onPresenceChange`, Total Likes = sum) + 5 Quick Actions (Purge Expired confirm, Reset All Hours, Delete All Posts, Delete Map Notes, Nuclear Reset confirm + `prompt('RESET')`) (`:523-577`). Creates ADM-3.
- Posts tab `ModerationTable.jsx` (442 lines): 10/page, tabs All/Reported(+count), search name/content, `datetime-local` After filter, checkboxes + select-all-page + bulk toolbar (Delete Selected always / Approve Selected only if reported selected), review modal (mood, Reported badge, Comments count recursive, Approve Post/Clear / Delete Post / Close), `Delete All`, per-row RESET (unlock+wipe device), row highlight selected-rose/reported-orange, empty `No posts found...` (`ModerationTable.jsx:36-99,234-437`). Creates ADM-4.
- Feedback `FeedbackReportsTable.jsx`: tabs bug/suggestion + counts, search, After filter, view modal with Bug/Lightbulb + image `max-h-80` + `Open Full Size`, delete confirm, bulk, Delete All disabled-if-empty, 10/page, empty `No bug reports/ideas found` (`:8-52,107-326`). Creates ADM-7.
- Postcards `PostcardsTable.jsx`: 8/page, search To/From/**Message** (unlike wall!), select-all-filtered, bulk delete, empty `No postcards yet.` / `No postcards matched your search.` (`:6-42,67-204`). MapNotes `MapNotesTable.jsx`: 8/page, search name/message/**coords**, device truncated 8 chars, Active/Expired badge, bulk delete with confirm, empty states (`:14-63,129-205`). Creates ADM-5/ADM-6.
- Settings `ControlPanel.jsx`: slider **1–72** (`:49-56`) while **API allows 1–168** (`routes/meta.js:87-90`) — boundary mismatch to test both; blacklist chips + X, `Add word...` + Plus disabled-if-empty, `No words blacklisted` empty (`:69-117`). Guidelines 6 static cards + quote (`AdminGuidelines.jsx:5-48`). `AdminPagination.jsx`: Previous/Next + ≤5 numbers, disabled logic. Creates ADM-8/ADM-9 + pagination cases.
- Authz: every admin op needs `x-admin-token` or 401 (`requireAdmin`), incl. purge, device-wipe, postcard delete/batch, map all-notes/delete, settings PUT (only `blacklisted_words`, `auto_delete_hours`), identity DELETE, unlock-all, delete-all-posts/map-notes, hard-reset (wipes posts+identities+postcards+map_notes) (`routes/meta.js`, `posts.js:127-142`, `postcards.js:106-128`, `map.js:99-129`). Rate: login 10/15min, writes 30/15min, global 300/15min (`server/index.js:61-88`). Creates ADM-10 + API-ADMIN/SEC.

### Cross-cutting
- Theme (`ThemeToggle.jsx`): `localStorage ventspace_theme`, `html.dark` class, MutationObserver sync, `aria-label Toggle dark mode`. Manual smoke demands toggle on every route (`qa/manual/checklists/smoke-checklist.md:37`). Creates THEME-1.
- CI (`playwright.yml`): runs `npm run test:e2e` on push/PR main/master, uploads `qa/automation/playwright-report/` — no env secrets wired, no webServer; tests assume running app (`qa/automation/README.md:36-37`). Creates P0-2/P5-5.

---

## P0 — Foundation fix (0.5 day)

> STATUS: DONE 2026-09-03. Old `tests/specs|pages|components` files were missing from disk (empty folders), so P0 rebuilt the foundation fresh instead of patching: `test.only` moot (files gone), `baseURL`+`webServer`+`api` project added, `LandingPage`/`DashboardPage` use `goto('/')`, fixed Header locators, scoped Feed asserts, added `fixtures/`+`helpers/`+`specs/api/`. Verified: eslint clean, `api` 1 passed, chromium `@smoke` 2 passed.

- [ ] P0-1 Remove `test.only` x2 (`dashboardPosting.spec.js:42,55`) — breaks CI via `forbidOnly`
- [ ] P0-2 `playwright.config.js`: add `baseURL http://localhost:5173` + `webServer` (backend `:3001` health + frontend `:5173`) + `api` project (`testMatch *.api.spec.js`) + `screenshot/video on-failure`
- [ ] P0-3 Replace hardcoded goto in `Lpage.js:15`, `Dpage.js:22` with `goto('/')`, `goto('/home')`
- [ ] P0-4 Fix `header.js:5-7`: search `Search thoughts, moods, or topics...`, buttons `Postcard/Wall/Map/Post Something|Post`
- [ ] P0-5 Scope `verifyPostInFeed` (`posting.js:69-72`) to `Feed`/`PostCard .glass-card` + mood pill, not `div.rounded-3xl`
- [ ] P0-6 Add `BasePage.js`, `fixtures/testData.js` (unique `qa-{Date.now()}`), `devices.js` (randomUUID), `helpers/cleanup.js` (admin hard-reset), `helpers/auth.js` (API login)
- [ ] P0-7 CI: wire Supabase + `ADMIN_PASSWORD` secrets, keep `npm run lint`
- Exit: `@smoke` green chromium, zero hardcodes.

---

## P1 — POM refactor (keep 11 existing tests green)

- [ ] P1-1 `Lpage.js` → `pages/LandingPage.js` (methods: `open()`, `continueBtn`, `rulesModal`, `acceptRules()`); keep alias
- [ ] P1-2 `Dpage.js` → `pages/DashboardPage.js` (compose Header/PostModal/Feed/MoodFilter/Search)
- [ ] P1-3 Split `posting.js` → `components/PostModal.js` (name/text/mood/submit/locked/rate errors) + `components/Feed.js` (cards, counts)
- [ ] P1-4 Add `components/Header.js`, `MoodFilter.js` (7 moods from `mockData.js`), `Search.js`
- [ ] P1-5 Keep passing: LAN-OLD-1 (Continue click), DASH-OLD-1..5 (5 mood filters), POST-OLD-1..5 (5 mood posts)

---

## P2 — UI page coverage

> STATUS: P2-B + P2-C DONE 2026-09-03/04. Feed (F1-F7, V1) + posting (P1-P9) green per-browser:
> chromium 20/20, firefox 21/21, webkit 21/21 (landing incl.). Run with `--workers=1` per project.
> Findings: (1) dev-only app flake — PostModal's unguarded loadIdentity double-fires under
> StrictMode and a late second response wipes a typed name; POM `waitForSettled()` drains in-flight
> `/api/identity` before filling (prod builds unaffected). (2) Server caps ~30 writes/15min/IP, so P2
> shares one seeded dataset per file (no per-test resets), caches the admin token, and P2-moods verify
> via API-seed + UI-assert; full 3-browser x parallel on one backend WILL 429 — verify per project
> with fresh backend, and plan P5 CI sharding or a test env with raised limits.

### P2-A Landing `/`
- [ ] LAN-1 @smoke — From: Continue btn + RulesModal accept → `/home`. Setup: `goto('/')`. Assert `toHaveURL(/home/)`, modal closed.
- [ ] LAN-2 — From: X + Go Back + backdrop (3 dismissals in `RulesModal.jsx:33-45,76-81`). Assert stays `/`, modal hidden.
- [ ] LAN-3 — From: `grid-cols-2` features + 6 xl pics. Assert 375px + 1440px no horizontal overflow, 4 features visible.
- [ ] LAN-4 — From: lpBg + 6 imports. Assert all images 200, zero console errors.

### P2-B Dashboard feed
- [ ] DASH-F1 @smoke — From: `Loading thoughts...` → cards or `No thoughts yet` + `Share a Thought` (`Feed.jsx:38-68`). Assert one of the two states, no console error.
- [ ] DASH-F2 @regression — From: 7 moods + count badges (`LeftSidebar.jsx:33-66`). Per mood: read badge count → click → `toHaveCount(count)` + every card has mood pill. Include All Thoughts + My Posts (seed own post first).
- [ ] DASH-V1 — From: donut Pie 52/74 + legend % + center dominant/`Be the first vibe`. Seed 3 Happy + 1 Sad via API → assert Happy dominant icon 😊 + `4 thoughts` + bars sum 100%.
- [ ] DASH-F3 — From: Header search both rows. Type text/username/mood → feed narrows; X/`✕` clears → full feed.
- [ ] DASH-F4 — From: hashtag extraction `/#\w+/` lowercased top-8. Post `#QaDeepDive-{ts}` → click topic chip → banner `Showing posts for #qadeepdive-...` + Clear Filter restores.
- [ ] DASH-F5 — From: Recent Activity top-5 unique. Click contributor → `Showing posts by {name}`.
- [ ] DASH-F6 — From: 4/page + shared `Pagination.jsx`. Seed 5 posts → 2 pages; next/prev, number jump, `...` when >5 pages (seed 25), prev disabled p1, next disabled last, scroll-top on change.
- [ ] DASH-F7 — From: censor `blacklistedWords` (`Dashboard.jsx:310-318`, `*`.repeat). Admin adds `qa-block-{ts}` → post containing it shows stars; new post with it → 400.

### P2-C Posting
- [ ] DASH-P1 @smoke — From: PostModal happy path. Fresh device UUID → `Post Something` → name `qa-{ts}` + text `hello-{ts}` + Happy → `Post Anonymously 🚀` → card with name/text/mood visible (scoped locator from P0-5).
- [ ] DASH-P2 — Same as P1 parametrized Sad/Angry/Hopeful/Anxious (replaces 5 copy-paste specs).
- [ ] DASH-P3 — From: `PostModal.jsx:61-82,145-183`. Empty name → `Your name is required.`; empty text → submit disabled; type 301 chars → capped 300 + counter `{n}/300` red >280; invalid mood via API → 400.
- [ ] DASH-P4 — From: identity lock (`PostModal.jsx:25-49`, `Locked` badge `:129`). After P1: input disabled + badge; reload keeps lock; second device can post with different name.
- [ ] DASH-P5 — From: client `getDevicePostCount>=5` + server `POST_LIMIT=5` 429 `RATE_LIMIT`. Seed 5 via API → 6th UI shows rate error; API 6th → 429.
- [ ] DASH-P6 — From: client `freespace_bad_words` vs server DB blacklist. Set both → name with word → `Banned words are not allowed in names!`; text with word → 400 `blocked word`.
- [ ] DASH-P7 — From: dupe check `normalizeForDuplicate` (`routes/posts.js:88-96`). Same device posts identical text twice (case/space-insensitive) → 2nd 429 `DUPLICATE`.
- [ ] DASH-P8 — From: trash only `isMyPost` (`PostCard.jsx:334-338`), soft delete. Own post delete → gone + count decrements; others' device → no trash btn + API DELETE → 403.
- [ ] DASH-P9 — From: `sanitizeText` strips `<tags>`. Post `<script>alert(1)</script>hello` → stored `hello`, no dialog, no script in DOM.

### P2-D Interactions
> STATUS: DONE. INT-1 (API likes), INT-2 (reactions add/switch/off), INT-3 (comment/reply/react/delete),
> INT-4 (report toggle + admin queue), INT-5 (realtime second tab), INT-6 (See more/less) green per-browser:
> chromium 5/5 + api 2/2, firefox 5/5, webkit 5/5 (`--workers=1` per project).
> Locator lessons (also in POM comments): open hover pickers by hover, never by click (picker opens under
> the cursor and eats the click); post summary is untitled `"❤️ 1"` spans (only comment bubbles carry
> titles); toggle reads `"❤️ Love"` once reacted so matchers must fit both states; comment toggle has no
> name — hover its SmilePlus icon (first button in a fresh bubble is the trash). App quirks noted: fresh
> posts can read `-1h ago` (server clock ahead); PostModal identity double-fire wipes typed names in dev
> (POM `waitForSettled()` drains it; prod builds unaffected).
- [ ] INT-1 (API-only + absent-UI) — From: TRAP above — no like button in `PostCard.jsx`. API `POST /:id/like {currentLikes}` increments + persists; UI test asserts no like control on card (file bug if product wants one).
- [ ] INT-2 — From: picker hover 300ms + click toggle + `freespace_user_reactions`. Hover React → picker 6 emojis → click ❤️ count+1 + label Love; click 😂 → ❤️-1 + 😂+1; same emoji again → toggle-off; breakdown hover shows per-emoji rows; reload persists; invalid emoji API → 400.
- [ ] INT-3 — From: `CommentItem` tree + API 500-cap. `MessageCircle` count = recursive total → open → `Add a comment...` + Send adds; Reply → `Write a reply to {user}...` + `@user` chip → nested with `replied to @parent`; comment reaction same picker; delete own (trash visible) cascades replies; others' comment → no trash + API → 403; 501-char comment API → 400.
- [ ] INT-4 — From: Report toggle + `alert`. Non-own post `Report` → dialog accept `Post reported...` → `Reported` orange; click again → un-reports; admin Reported tab contains id.
- [ ] INT-5 — From: `posts-realtime` channel. Two contexts A+B on `/home`; A posts via API; B card appears ≤10s without reload.
- [ ] INT-6 (new) — From: `TEXT_LIMIT=150` + `timeAgo` hours-only. Post 200 chars → `...` + `See more` expands; fresh post shows `Just now`.
- [ ] THEME-1 (new) — From: `ThemeToggle.jsx` + smoke checklist. Toggle on `/`, `/home`, `/postcard`, `/map`, `/admin`: `html.dark` flips, `localStorage ventspace_theme` persists reload, `aria-label Toggle dark mode`.

### P2-E Postcard Creator
> STATUS: DONE. PC-1..PC-11 green per-browser: 17/17 with wall file (chromium, firefox, webkit;
> `--workers=1` per project). One correction vs plan: wall search with a message-only term matches
> NOTHING (empty state), not everything — WALL-2 asserts that. Sticker drag verified via mouse events;
> PNG download works (html2canvas fine).
- [ ] PC-1 @smoke — From: share flow `PostcardPage.jsx:173-200`. To `qa-to-{ts}` / From `qa-from-{ts}` / Message → Share → toast `shared to the Wall!` + `View Wall →` navigates to wall containing To.
- [ ] PC-2 — Empty To/From → `Please fill in both To and From fields before sharing.`; empty message allowed (API `message.max(500)` no required).
- [ ] PC-3 — 5 templates apply exact bg/font/border/stickers (`:63-69`); assert preview style + sticker count.
- [ ] PC-4 — solid|gradient toggle; 12 solids + custom `#123456` input; 8 gradients; assert `background` style.
- [ ] PC-5 — 13 FONTS each sets preview `font-family`; custom font API → 400.
- [ ] PC-6 — align left/center/right sets preview `text-align`.
- [ ] PC-7 — borders none/elegant/dashed set `borderClass`.
- [ ] PC-8 — From sticker flow: add 🌸 → drag (+20px mouse) changes x/y → double-click removes → add 2 + Clear all empties; counter text asserts.
- [ ] PC-9 — From html2canvas scale 3: `waitForEvent('download')` → `postcard-*.png` non-empty.
- [ ] PC-10 — Seed 5 shares/24h same device → 6th toast `Limit reached! You can share 5 postcards per 24 hours.` + API 429 `LIMIT_REACHED`.
- [ ] PC-11 — `<img src=x onerror>` in To/From/Message → stored stripped; wall renders text only.

### P2-F Wall
- [ ] WALL-1 @smoke — From grid + count `N postcards` (`PostcardWallPage.jsx:465-467`); with empty DB assert 14 `MOCK_POSTCARDS` fallback else real data.
- [ ] WALL-2 — From To/From-only filter (`:353-357`). Search From-name filters; search message-body does NOT filter (assert!); no match → `No postcards found for "..."`; X restores.
- [ ] WALL-3 — Seed 13 → 2 pages (12/page); next/prev; mobile search row works.
- [ ] WALL-4 — Mini click → full modal with To/Message/From + `Posted on {date} at {time}`; X + backdrop close; mini truncates >140 chars.
- [ ] WALL-5 — Creator context shares → wall context new card ≤10s (realtime channel).
- [ ] WALL-6 — Tilt: mousemove on mini sets `transform perspective(800px)`; mouseleave resets.

### P2-G Map
> STATUS: DONE. MAP-1..MAP-12 green per-browser: 14/14 (chromium, firefox, webkit; `--workers=1`
> per project). Deviations from plan recorded here: MAP-3 outsides/empties asserted via API (canvas
> ocean-clicks aren't targetable); MAP-5 empty asserts disabled-submit (no error text exists); MAP-11
> asserts the TTL popup (no API creates backdated rows); MAP-9 places use a stubbed result.
> Map lessons (also in POM comments): center-click pins stack and bury each other — hover targets use
> random spots; popups are hover-driven and toggle on every fresh mouseenter (move away between
> attempts); never click markers (clicks propagate to map.on('click') and open stray drafts — app bug);
> markers render only after map load (slow tiles + fast fetch = stale-closure empty paint until refresh);
> toasts vary with nearby counts (`Flying to` vs `N notes nearby`), so assert the name in the toast box.
> Files: `tests/pages/MapPage.js`, `tests/api/mapApi.js`, `tests/specs/map.spec.js` (~19 writes/run).
- [ ] MAP-1 @smoke — Canvas `.maplibregl-canvas` visible, badge `{n} active notes`, hint `Tap anywhere...`; zoom/pan no errors.
- [ ] MAP-2 — Map method `flyTo Manila 14.5995,120.9842` + click center → draft modal `Drop a note here` + `coords · visible for 5 hours`.
- [ ] MAP-3 — API `POST` lat 0/lng 0 → 400 `inside the Philippines`; UI out-of-bounds click (mock flyTo ocean) → toast.
- [ ] MAP-4 — Draft name `qa-{ts}` (30) + msg (150) + emoji → submit → toast `Note placed...5 hours.` + marker popup name/msg/`Expires at HH:MM (in Xh Ym)`.
- [ ] MAP-5 — Empty → `Please fill in both...`; 31/151 chars sliced; counters `n/30`, `n/150`.
- [ ] MAP-6 — Seed 10/hr same UUID → 11th API 429 `Take a break! 🗺️`.
- [ ] MAP-7 — Identity prefill + `🔒 Locked` (`MapPage.jsx:303-328`); unlocked device editable.
- [ ] MAP-8 — Style matrix (from constants): submit font modern/handwritten, theme sakura/violet, border solid/glowing → popup pin gradient + `font-family` correct; packed `__FS_NOTE__` JSON verified via API GET.
- [ ] MAP-9 — Search: type author → Matching Notes section; type `Cebu` (route Nominatim stub 1 PH + 1 non-PH) → only PH place; Enter selects first; arrows navigate; select → toast with `nearby!` count; X clears + removes 12s pin.
- [ ] MAP-10 — 6 Popular chips each flyTo correct zoom; GPS granted inside PH → `Centered at your location`/nearby count; GPS denied → `Could not access your location...`; GPS outside PH → `outside the Philippines.`
- [ ] MAP-11 — Expired `expires_at` past → absent from `GET /notes` + no marker after 60s refresh (shorten via route stub or wait + refetch assert).
- [ ] MAP-12 — `<img onerror>` name/msg → popup `textContent` only, no element, no dialog.

### P2-H Feedback
> STATUS: DONE. FB-1 (modes), FB-2 (bug+screenshot persists), FB-2b (idea type), FB-3 (empty blocked
> UI+API) green per-browser: 4/4 (chromium, firefox, webkit). Locator lesson: success view replaces
> modal copy, so assert it page-level, never under the flavor-filtered root. Screenshot uploads use an
> in-memory 1x1 PNG (no fixture file). Admin-tab asserts for these rows come in P4.
- [ ] FB-1 — Floating `Have an Idea?`/`Got a Bug?` open modal `Report a Bug`/`Share an Idea` with mode switcher.
- [ ] FB-1 — Floating `Have an Idea?`/`Got a Bug?` open modal `Report a Bug`/`Share an Idea` with mode switcher.
- [ ] FB-2 — Bug with text + screenshot PNG → `Success!` 2s → auto-close; appears in Admin Feedback Bug tab with `Open Full Size` image link; suggestion same path.
- [ ] FB-3 — Empty text → submit disabled; API empty → 400; bad type → 400; >3MB base64 → 400 `Screenshot too large`.

---

## P3 — API coverage (`tests/specs/api/*.api.spec.js`, `request` fixture)
> STATUS: DONE. 30 api tests green, each file in its own invocation (fresh backend, fresh 30-write
> budget): health+posts 8/8, comments 4/4, postcards 5/5, map 5/5, meta 4/4, admin 4/4.
> Findings: (1) sanitize-then-max TRUNCATES instead of rejecting — 501-char comments store 500,
> 61-char postcard To stores 60 (assert caps, not 400s). (2) reports FK to posts — report targets must
> be real post ids. (3) logout rotates the password but spares live tokens (TTL 1h); its `.env` rewrite
> restarts Vite and can hang up the in-flight response — tests prove rotation by effects with retries
> and re-sync env after. (4) Execution discipline is load-bearing: one api file per npx (12+19=31
> already exceeds the cap combined), serial mode, cached admin token; login-burst and flood limits
> intentionally untriggered (would lock the backend 15min). Files: `tests/specs/api/*.api.spec.js`,
> token cache + `resyncAdminPassword()` in `tests/helpers/auth.js`.

- [ ] API-HEALTH `GET /api/health` → 200 `{ok:true, uptime:number}`
- [ ] API-POSTS-GET — newest-first, `is_deleted` excluded, in-window only, comments nested `{id,username,text,parent_id,reactions}`
- [ ] API-POSTS-POST — happy 201; negatives table: missing username/mood/text/deviceId, mood `Blue`, text 301, uuid `abc`, blacklist name/text, XSS stripped
- [ ] API-POSTS-LIMIT — 5 ok → 6th 429 `RATE_LIMIT`; same text twice → 429 `DUPLICATE`; `GET device-count` = 5
- [ ] API-POSTS-LIKE — `POST /:id/like` +1 twice (no UI); missing id → 500/404 per impl (record)
- [ ] API-POSTS-REACTION — add ❤️, switch ❤️→😂 (counts move), toggle-off null, invalid `💩` → 400 (both emoji + prevEmoji paths)
- [ ] API-POSTS-DELETE — own device 200 + absent from GET; other device 403; missing 404; admin token deletes others 200
- [ ] API-COMMENTS — comment 201 + reply with parentId 201 + nesting in GET; bad parentId/NaN → 400; 501 chars → 400; blacklist → 400; reaction switch; delete own 200 / others 403 / missing 404
- [ ] API-REPORTS — POST upsert 200; GET contains; re-POST idempotent; DELETE removes; `abc`/0 → 400
- [ ] API-SETTINGS — GET has `blacklisted_words`, `auto_delete_hours`; PUT admin ok; no-token 401; unknown key 400; hours 0/169/`x` → 400; blacklist `str` → 400; UI slider 72-cap vs API 168-cap both asserted
- [ ] API-IDENTITY — POST lock 200; GET row; invalid uuid GET → null; POST bad uuid → 400; blacklist name → 400; DELETE admin 200 / no-token 401; re-lock overwrites (upsert)
- [ ] API-BUGS — GET newest-first; POST bug + suggestion 201; empty → 400; type `complaint` → 400; tiny PNG ok (`image_url` set or null if bucket missing — record); 3MB+ → 400; DELETE/:id + delete-batch admin 200 / no-token 401 / `[]` → 400
- [ ] API-POSTCARDS — GET newest-first; POST happy 201; per-field negatives (to 61 chars, bad bgType/align/border/font, hex `red`, gradient `linear-gradient(0deg,...)`); uuid bad → 400; 6th/24h → 429; 21 stickers → stored 20; DELETE/:id + batch admin / 401s
- [ ] API-MAP — GET active ≤500 newest-first; POST happy 201 `expires_at≈+5h`; empty → 400; lat/lng outside PH → 400; NaN → 400; bad uuid → 400; blacklist → 400; 11th/hr → 429; `GET all-notes` admin has `device_id` + expired / no-token 401; `DELETE /notes/:id` bad-uuid 400 / admin 200 / no-token 401
- [ ] API-ADMIN-AUTH — wrong pw 401; ok → token UUID; authed copy-password 200 / unauthed 401; logout 200 + password rotated (old pw login 401 — re-read `.env`); login 11x/15min → 429
- [ ] API-ADMIN-WIPE — unlock-all / delete-all-posts / delete-all-map-notes / hard-reset (posts+identities+postcards+map_notes gone) happy + no-token 401 each; purge admin 200 / 401; device-wipe admin 200 / 401
- [ ] API-SEC — 301st global GET/15min → 429 (record, don't break suite — use isolated agent or skip in default run); 31st write → 429; every text field XSS stripped

---

## P4 — Admin UI (run last, wipes data)
> STATUS: DONE (scoped). 6/6 green per-browser (chromium, firefox, webkit; `--workers=1`): ADM-1
> login+session, ADM-3 stats/purge/guidelines/theme, ADM-4 reported delete, ADM-567 feedback/postcard/
> map-note deletes, ADM-8 settings non-persistence (documents bug), ADM-2 logout. Nuclear/delete-alls/
> bulk-select/RESET-user stay API-tested in P3 (blast radius); ADM-10 401s covered by P3 API-ADMIN.
> POM: `tests/pages/AdminPage.js`; specs: `tests/specs/admin.spec.js` (~11 writes/run).
> APP BUGS FOUND: (1) `updateSetting` (`lib/api.js`) never sends the admin token → every settings PUT
> 401s, UI looks saved but reload reverts (ADM-8 proves it). (2) Feedback table crashes on null
> reporter_name (`toLowerCase` of null) — admin console blanks on API-seeded anonymous rows; seed with
> names and purge nulls first. (3) Tab buttons carry count badges, so exact-name tab matchers never hit
> (POM uses prefix match).

- [ ] ADM-1 @smoke — From login form (`Admin.jsx:321-393`). Wrong pw → `Incorrect password. Access denied.`; correct `ADMIN_PASSWORD` → `Command Center` + 7 tabs + badges `posts/mapnotes/postcards/feedback` counts.
- [ ] ADM-2 — F5 keeps auth (`sessionStorage`); new context logged out; Logout → password rotated (login with old fails).
- [ ] ADM-3 — Stats: seed 2 posts (3 likes total) → Total Posts 2, Total Likes 3, Online Now ≥1 (second context); Quick Actions each with dialog handler: Purge (seed expired via API backdate if possible else assert call), Unlock All → toast, Delete All Posts → 0, Delete Map Notes → 0, Nuclear `RESET` prompt → all wiped.
- [ ] ADM-4 — Posts tab: search filters, After datetime filters, Reported tab count, review modal open → Approve clears badge / Delete removes, checkbox select + Delete Selected, Approve Selected, RESET user unlocks + wipes device posts, Delete All, 10/page `AdminPagination` prev/next/numbers.
- [ ] ADM-5 — Map Notes: search name/message/coords (all three!), Active/Expired badges both visible (seed expired), device `xxxxxxxx…`, delete single + bulk with confirm, 8/page.
- [ ] ADM-6 — Postcards: search To/From/**Message** (differs from wall!), delete single (confirm `Delete this postcard?`) + bulk, `N Total` badge, 8/page, empty states.
- [ ] ADM-7 — Feedback: Bug/Idea tabs + counts, search, After filter, view modal (image + `Open Full Size`), delete confirm, bulk, Delete All (disabled when empty), 10/page.
- [ ] ADM-8 — Settings: slider to 24 → persists reload + `GET /settings`; type 168 via API ok but slider caps 72 (assert mismatch documented); add `qa-word-{ts}` chip → feed blocks it; X removes; empty list → `No words blacklisted`.
- [ ] ADM-9 — Guidelines: 6 cards (Content Moderation/Reporting Queue/User Management/Word Blacklist/Purge vs Nuclear/Real-time Updates) + quote visible.
- [ ] ADM-10 — UI-logout then call each admin API without token → 401 (purge, device-wipe, postcard del/batch, map all-notes/del, settings PUT, identity DEL, unlock-all, delete-alls, hard-reset).
- [ ] ADM-11 — ThemeToggle both sidebar + mobile nav; dark persists per tab.

---

## P5 — Hardening + CI
> STATUS: DONE. P5-1 mobile projects live (Mobile Chrome Pixel 5 + Mobile Safari iPhone 12, 4/4 each:
> MOB-1 landing, MOB-2 sidebar collapse + mobile search, MOB-3 modal fit, MOB-4 map/creator usable).
> P5-2 a11y smoke green (chromium only — static checks): A11Y-1 named actions, A11Y-2 placeholders,
> A11Y-3 modal autofocus, A11Y-4 backdrop dismiss; gaps filed as BUG-012. P5-3 soak 15/15 zero flakes
> (LAN-1 + DASH-F1 x5, API-HEALTH x5; write-path smokes excluded — a 35-write soak exceeds the 30-write
> server cap by design, proven by the 429s it produced). P5-4 smoke checklist carries automated IDs.
> P5-5 CI runs lint + documents required secrets and the one-file-per-run discipline. Exit criteria met:
> @smoke green, @regression + API green per-browser/per-file, flake 0% on soak.

- [ ] P5-1 Re-enable `Mobile Chrome`/`Mobile Safari` projects (commented in config) — assert sidebars hidden, mobile search rows visible, modals fit 375px
- [ ] P5-2 A11y smoke: all icon-buttons have title/aria-label, inputs have placeholders/labels, focus visible, modal Esc/backdrop close
- [ ] P5-3 Soak `@smoke` ×5, flake <2%; quarantine map-realtime + presence tests if Supabase channel flaky
- [ ] P5-4 `qa/manual/*` checklists mirror these IDs (smoke-checklist already covers LAN/DASH/PC/MAP/ADM — add IDs)
- [ ] P5-5 CI uploads `playwright-report/` (already) + fail on `test.only` + `eslint .`
- Exit: `@smoke` 100% (3 browsers), `@regression` + API ≥95%.

---

## Review box (fill me)

- Approved phases: ...
- Add these cases: ... (e.g. add DASH-V1? keep INT-6?)
- Remove these cases: ...
- Change these cases: ... (e.g. INT-1 UI vs API-only?)
- Priority changes: ...
- Open questions: like-button missing — bug or intended? slider 72 vs API 168 — which is correct? wall search message-excluded — intended?
