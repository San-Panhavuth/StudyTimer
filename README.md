# Velea Rien (វេលារៀន)

Study timer + study log, backed by Supabase (per-user Postgres data with RLS) and deployed as a Next.js app.

## Stack

- Next.js 16 (App Router, Server Actions)
- Supabase (Postgres + Auth), Row Level Security on every table
- Drizzle ORM / drizzle-kit for schema + migrations
- Chart.js for the pie/bar charts
- Vitest (unit) + Playwright (e2e)

## Local development

Two Supabase targets exist:

- **`.env.local`** — the hosted project (`gohcoztelszynbdzyvgw.supabase.co`), used for production builds.
- **`.env.development.local`** — a local Supabase stack running in Docker, used automatically by `npm run dev` (Next.js's own env precedence loads `.env.development.local` over `.env.local` in dev). This keeps local hacking from ever touching real hosted data.

```bash
supabase start          # boots the local Postgres/Auth/API stack (Docker)
npm install
npm run dev              # http://localhost:3000, talking to the local stack
```

If port 54321 etc. are already taken by another local Supabase project, this repo's `supabase/config.toml` has every port shifted by +100 (54421, 54422, ...) — check it and `.env.development.local` stay in sync if you change it further.

### Seeding a demo account

```bash
node scripts/seed-demo-user.mjs [email] [password] [displayName]
# defaults to admin@velearien.test / adminadmin / Admin
```

Creates (or resets the password of) a confirmed user directly via the Admin API — no email round-trip needed for local testing. Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.development.local` (already set for the local stack).

`node scripts/reset-demo-data.mjs [email]` wipes that user's sessions/active_session rows for a clean slate (also run automatically before the e2e suite).

## Database schema

Source of truth is `src/lib/db/schema.ts` (Drizzle). Four tables — `profiles`, `subjects`, `sessions`, `active_session` — all RLS-protected (`auth.uid() = user_id`), plus a `handle_new_user` trigger (raw SQL migration) that creates a profile and the default subject list the moment someone signs up.

```bash
npm run db:push       # push schema.ts straight to DATABASE_URL (fast local iteration)
npm run db:generate   # write a versioned migration file instead
npm run db:studio     # Drizzle Studio browser UI
```

`DATABASE_URL` is read from `.env.local` and overridden by `.env.<NODE_ENV>.local`, same precedence as Next's own env loading.

Two tables' worth of grants (`supabase/migrations/20260914194443_grant_table_privileges.sql`) exist separately from the Drizzle-managed schema: tables created outside Supabase's own provisioning flow don't automatically get the `SELECT/INSERT/UPDATE/DELETE` grants the Data API relies on (RLS gates *rows*, this migration is what makes the tables reachable *at all*). If you add a new table by hand later, either add it to that migration or rely on the `ALTER DEFAULT PRIVILEGES` at the bottom of it, which already covers future tables in `public`.

## Testing

```bash
npm run test         # vitest — pure logic (src/lib/format.ts, src/lib/log-calculations.ts)
npm run test:e2e     # playwright — full login → timer → break → stop → study log flow
```

The e2e suite runs against a production-equivalent dev server on port 3100 (see `playwright.config.ts`), targeting the **local** Supabase stack (`supabase start` must already be running). It resets and re-seeds the demo user in `globalSetup` before each run.

## Deploying

1. **Apply the schema to your hosted Supabase project** (this is the one step I couldn't do myself — I only had the publishable key, not the DB password or CLI login):
   - Easiest: open the hosted project's SQL Editor and run, in order, everything under `supabase/migrations/*.sql`.
   - Or: `supabase login`, then `supabase link --project-ref gohcoztelszynbdzyvgw`, then `supabase db push`.
   - Or, once schema.ts should be the ongoing source of truth: get the hosted `DATABASE_URL` (Project Settings → Database → Connection string, use the *direct* connection, not the pooler, for drizzle-kit) into `.env.production.local`, then `npm run db:push`.
2. **Vercel**: import this repo (root directory `web/` if the artifact prototype's `index.html` stays alongside it at the repo root), set the two env vars from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in the Vercel project settings, deploy. No other config needed — it's a standard Next.js App Router app.
3. **Auth email templates**: in the Supabase Dashboard → Authentication → Email Templates, point the "Confirm signup" and "Reset password" templates at:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next={{ .RedirectTo }}
   ```
   instead of the default `{{ .ConfirmationURL }}` — the app's `/auth/confirm` route handler expects that shape. Also add your Vercel domain to Authentication → URL Configuration → Redirect URLs.
