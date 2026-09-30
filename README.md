# Helix

Helix is a work-in-progress B2B outreach app built with React, TanStack Start, TypeScript, Tailwind CSS, Better Auth, and PostgreSQL/PGlite. The current interface includes contacts, campaigns, draft review, an inbox, analytics, and settings.

**This is a demo, not a live outreach service.** The sample workspace includes fictional contacts, messages, integration states, and metrics. Sending currently records a database event without delivering an email. See [PROJECT_REVIEW.md](PROJECT_REVIEW.md) and [REMAINING_WORK.md](REMAINING_WORK.md) before using it for real outreach.

## Run locally

Use Node.js 22 or newer. Install dependencies with `npm ci`, then run `npm run dev`. The app listens on port 8080. With no `DATABASE_URL`, it uses an in-memory PGlite database that resets when the server process stops. The sign-in page shows a development-only sample account.

The workspace platform also uses `startup.sh` to revive its preview. Keep that script, `public/__grok/`, `server/`, and the PWA scripts when moving the project.

## Checks

Run `npm run typecheck`, `npm test`, and `npm run build`. The build command applies SQL migrations when `DATABASE_URL` is set, so point it only at a database you intend to migrate.

The existing test suite still contains assertions for the original unauthenticated template and is not fully passing. Lint passes with warnings. The test assertions need follow-up before treating the repository as release-ready.

## Configuration

The platform supplies deployment credentials. For another host, configure the server-side variables in that host's secret settings: `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and the `GROK_AUTH_*` values required for broker sign-in. The shared preview broker also requires `GROK_PREVIEW_CLIENT_SECRET` when no per-app broker secret is available. Google/X sign-in buttons appear only when broker credentials are configured. `XAI_API_KEY` enables the optional AI calls. Do not commit these values or a `.env` file.

The tracked `.grok/app-env.json` contains platform deployment flags, and `migrations/` contains the database schema. `package-lock.json` is included for reproducible installs.

The development sample account has known credentials, so only expose the development server on a trusted network. Broker secrets now come from the host environment and are not included in this repository.
