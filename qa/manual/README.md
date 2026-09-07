# Manual Testing (QA)

Test documentation and artifacts for **manually executed** testing of VentSpace.
Everything here is executed by a human (exploratory sessions, checklists, test cases) —
as opposed to [../automation](../automation), which runs without human interaction.

## Folder layout

```
qa/manual/
├── README.md                  ← this file
├── checklists/                ← feature checklists executed per release (smoke, regression)
└── test-cases/                ← detailed step-by-step test cases with expected results
```

## Conventions

- **Test case files** are named `TC-<area>-<number>.md`, e.g. `TC-posting-001.md`.
  Copy [`test-cases/TEMPLATE.md`](test-cases/TEMPLATE.md) to create a new one.
- **Checklist runs** are recorded by appending a dated section to the bottom of the
  checklist file (date, tester, build/commit, pass/fail per item, notes).
- Log defects in the issue tracker and reference the failing test case ID
  (e.g. `TC-posting-001`) in the bug report.

## How to run the app for manual testing

```bash
npm run dev:all        # starts backend (:3001) + frontend (:5173) together
```

Open http://localhost:5173 and test against the routes:

| Route           | Page                |
|-----------------|---------------------|
| `/`             | Landing page        |
| `/home`         | Dashboard (feed)    |
| `/postcard`     | Postcard creation   |
| `/postcard-wall`| Postcard wall       |
| `/map`          | Map notes           |
| `/admin`        | Admin panel         |

## Suggested minimum pass before a release

1. Execute `checklists/smoke-checklist.md` — all items must pass.
2. Execute any checklist for features changed in the release.
3. Re-test all open bug fixes on the affected routes.
