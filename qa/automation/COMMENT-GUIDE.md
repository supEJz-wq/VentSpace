# Comment Guide (short) — qa/automation

> Where: every spec, page, component, helper starts with a 1-line `//` saying what it covers + source file. Keep comments short; code should speak, comments explain WHY.

## Rules

1. One line, lowercase start ok: `// <what> — <why/source>`.
2. Tag test cases: `// LAN-1 smoke. Replaces old X.` so phase.md IDs are greppable.
3. Mark traps/fixes: `// TRAP: ...`, `// STALE: ... was ..., now ...`, `// NOTE: ...`.
4. No noise: don't restate the code (`// click button` on `.click()`). No author/date signatures.
5. File header on shared files only (pages/components/helpers): 1 line.

## Good vs bad

```js
// GOOD
this.searchInputs = page.getByPlaceholder(/search thoughts, moods, or topics/i); // real placeholder — Header.jsx:30
// LAN-1 smoke. Old assert was commented out, now asserts /home.

// BAD
// header search input locator
// John 2026 — updated this
```

## POM headers (copy-paste)

```js
// tests/pages/DashboardPage.js — replaces old Dpage.js.
```

Find this guide: `qa/automation/COMMENT-GUIDE.md` (linked from `qa/automation/README.md` and `automation-plan/phase.md`).
