# VentSpace

An anonymous venting/journaling platform: a feed with mood filters, postcards, a map with notes, and an admin panel. React + Vite frontend, Express + Supabase backend, Playwright test suite.

## Project structure

```
freeSpace-main/
├── frontend/                 # React 19 + Vite app
│   ├── index.html
│   ├── public/               # static assets served as-is
│   ├── src/
│   │   ├── Components/       # UI components (feed, postcards, admin tables, …)
│   │   ├── Pages/            # routed pages (Landing, Dashboard, Map, Admin, …)
│   │   ├── context/          # React context providers
│   │   ├── lib/              # API client, helpers, hooks
│   │   ├── Data/             # mock/static data
│   │   └── assets/
│   ├── vite.config.js        # dev server + /api proxy to :3001
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/                  # Express API + database assets
│   ├── server/
│   │   ├── index.js          # app entry (port 3001, serves frontend/dist in prod)
│   │   ├── routes/           # /api routes: posts, postcards, meta, map
│   │   ├── lib/              # admin auth, validation helpers
│   │   └── supabase.js       # Supabase service client
│   ├── migrations/           # SQL migrations (gitignored)
│   └── supabase/             # Supabase schema SQL (gitignored)
├── qa/                       # QA testing
│   ├── automation/           # Playwright e2e tests
│   │   ├── playwright.config.js
│   │   └── tests/
│   │       ├── specs/        # runnable test files
│   │       ├── pages/        # page object models
│   │       └── components/   # component helpers/actions
│   └── manual/               # manual testing docs
│       ├── checklists/       # smoke/regression checklists
│       └── test-cases/       # step-by-step test cases + template
├── .github/workflows/        # CI: Playwright tests on push/PR
├── .env.example              # copy to .env and fill in
├── eslint.config.js          # lint config (frontend + backend + qa)
└── package.json              # root scripts (single npm project)
```

## Getting started

```bash
npm install
cp .env.example .env      # then fill in Supabase + admin values
npm run dev:all           # backend on :3001 + frontend on :5173 (with /api proxy)
```

## Scripts

| Script                  | What it does                                          |
|-------------------------|-------------------------------------------------------|
| `npm run dev`           | Vite dev server (frontend)                            |
| `npm run server`        | Express API server (backend)                          |
| `npm run dev:all`       | Both together via concurrently                        |
| `npm run build`         | Production build → `frontend/dist`                    |
| `npm start`             | Backend, also serving `frontend/dist` in production   |
| `npm run lint`          | ESLint across frontend, backend, and qa               |
| `npm run test:e2e`      | Playwright tests (`qa/automation`)                    |
| `npm run test:e2e:headed` | Playwright tests with a visible browser             |
| `npm run test:e2e:report` | Open the last Playwright HTML report                |

## Testing

- **Automation:** see [qa/automation/README.md](qa/automation/README.md).
  CI runs the suite on every push/PR to `main`/`master`.
- **Manual:** see [qa/manual/README.md](qa/manual/README.md). Start with
  [qa/manual/checklists/smoke-checklist.md](qa/manual/checklists/smoke-checklist.md).

## Admin

The admin password is auto-generated into `.env` on first backend start and
copied to the clipboard (see `ADMIN-PRIVATE.md` for usage notes; never committed).
