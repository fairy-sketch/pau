# PATH (working name)

A personal athletic path app built on a multi-club booking core. The product and build spec is
[`docs/BRIEF.md`](docs/BRIEF.md). Decisions are logged in [`docs/decisions.md`](docs/decisions.md),
open business rules in [`docs/open-questions.md`](docs/open-questions.md).

**Status: M0 (foundations) is built.** There is no product yet: this milestone delivers the
tooling, the design system and the skeletons everything else stands on. M1 adds the person layer,
tenancy and the Path home.

## What you need

- Node.js 22 or newer and pnpm 10 (`corepack enable` gives you pnpm)
- Docker Desktop, only for the local database

## Run it

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000/styleguide> for tokens, type, the stage track and the chart sample.
The app itself needs no database in M0.

## Test it

```bash
pnpm test        # lint, format check, typecheck and unit tests. No services needed.
pnpm test:e2e    # Playwright against a production build (phone and desktop profiles)
pnpm test:all    # both
```

`pnpm test:e2e` needs a browser once: `pnpm exec playwright install chromium`. To run the phone
profile on real WebKit instead: `pnpm exec playwright install webkit`, then
`PW_WEBKIT=1 pnpm test:e2e`.

What the tests prove in M0:

| Acceptance criterion                           | Where it is checked                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/styleguide` shows tokens, type, track, chart | `tests/e2e/foundations.spec.ts`                                                           |
| The app is an installable PWA                  | `tests/unit/pwa.test.ts`, and "PWA" in the e2e spec (manifest, icons, service worker)     |
| No hardcoded UI strings outside the catalogue  | ESLint `react/jsx-no-literals` and `tests/unit/i18n.test.ts`                              |
| Tokens stay in sync and pass WCAG AA contrast  | `tests/unit/tokens.test.ts`, plus an axe scan of every page in the e2e spec               |
| Job queue SQL and runner work                  | `tests/unit/jobs-db.test.ts` (real Postgres via PGlite), `tests/unit/jobs-runner.test.ts` |

## Local database (Supabase)

This step has **not been run in the build environment** (no Docker there). Please verify it once:

```bash
pnpm db:start     # starts Postgres, Auth and Studio in Docker; first run downloads images
pnpm db:reset     # applies supabase/migrations to a clean database
pnpm jobs:once    # one worker pass; expect "[jobs] heartbeat …" and "claimed 1, succeeded 1"
pnpm db:stop
```

Expected: `db:start` prints the local URLs (Studio at <http://127.0.0.1:54323>), `db:reset`
finishes without errors, and in Studio the `job` table then holds one `succeeded` row.
`pnpm jobs:work` runs the worker as a loop. Settings are in `.env.example`; the defaults match
`pnpm db:start`, so no `.env` file is needed.

There is no seed data or demo login yet. Those arrive with the tables they belong to (M1 onward).

## Install on a phone

Installation needs HTTPS (or localhost), so serve a production build through a tunnel:

```bash
pnpm build && pnpm start
# in a second terminal, any HTTPS tunnel, for example:
npx cloudflared tunnel --url http://localhost:3000
```

Open the tunnel's `https://…` address on the phone, then:

- **iPhone (Safari):** Share → Add to Home Screen.
- **Android (Chrome):** menu → Install app (or Add to Home screen).

Check: the icon appears on the home screen, the app opens without browser chrome, and after one
visit, switching to flight mode and opening a new page shows the black "Offline" screen instead of
the browser's error page.

## Layout

```
app/                 routes: /, /styleguide, /offline, manifest, service worker
src/config           APP_NAME and locale defaults (the product name lives only here)
src/i18n             next-intl config and messages/en.json
src/ui               design system components and the token mirror
src/domain           pure helpers (formatting, contrast)
src/jobs             job runner, stores and the job registry
src/pwa, src/server  manifest builder, validated environment
supabase/migrations  SQL
scripts/             worker, icon generator
tests/unit, tests/e2e
docs/                brief, decisions, open questions, data model
```

Other commands: `pnpm format` (Prettier), `pnpm icons` (regenerate PWA icons),
`pnpm db:types` (TypeScript types from the schema, used from M1).
