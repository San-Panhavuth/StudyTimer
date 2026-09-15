# Velea Rien (វេលារៀន)

Study timer + study log for students, with an optional Parent role that can
watch a linked child's progress. Backed by Supabase (Postgres + Auth, RLS on
every table) and deployed as a Next.js app on Vercel.

**Live:** https://webstudytimer.vercel.app

## Stack

- Next.js 16 (App Router, Server Actions, Turbopack)
- Supabase (Postgres + Auth), Row Level Security on every table
- Chart.js for the pie/bar charts
- `qrcode` (generate) + `qr-scanner` (camera scan) for the parent↔child linking flow
- Vitest (unit) + Playwright (e2e)
- Deployed on Vercel, functions pinned to `sin1` (Singapore) to sit next to the Supabase project — see `vercel.json`

## Project shape

Two account roles, chosen once at signup, each with its own bottom nav:

- **Child** — Timer / Study Log. Gets a short `child_code` (profile menu → Copy
  or Show QR) for a parent to add them.
- **Parent** — Children / Children Log, with a middle **+** button to add a
  child by typing their code or scanning their QR. Linking is instant (no
  approval step — this is for internal/family use), and a parent can remove a
  link any time. Children Log reuses the pie/bar/session-list view scoped to
  whichever child is selected.

An `ActiveSessionProvider` lives at the `(app)` layout level (not inside the
Timer page) so a running timer keeps ticking — and shows as a small badge on
every other tab — instead of looking "stopped" when you navigate away.

## Local development

Two Supabase targets exist:

- **`.env.local`** — the hosted project, used for production builds.
- **`.env.development.local`** — a local Supabase stack running in Docker,
  used automatically by `npm run dev` (Next's own env precedence loads
  `.env.development.local` over `.env.local` in dev). Keeps local hacking from
  ever touching real hosted data.

```bash
supabase start          # boots the local Postgres/Auth/API stack (Docker)
npm install
npm run dev              # http://localhost:3000, talking to the local stack
```

If port 54321 etc. are already taken by another local Supabase project, this
repo's `supabase/config.toml` has every port shifted by +100 (54421, 54422,
...) — check it and `.env.development.local` stay in sync if you change it
further.

### Seeding a demo account

```bash
node scripts/seed-demo-user.mjs [email] [password] [displayName]
# defaults to admin@velearien.test / adminadmin / Admin
```

Creates (or resets the password of) a confirmed user directly via the Admin
API — no email round-trip needed for local testing. Requires `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` in `.env.development.local` (already set for the
local stack). Signs up as a **child** account by default.

`node scripts/reset-demo-data.mjs [email]` wipes that user's sessions/
active_session rows for a clean slate (also run automatically before the e2e
suite).

## Database schema

Source of truth is the migration files in `supabase/migrations/`, applied in
order:

1. `20260914192416_init_schema.sql` — `profiles`, `subjects`, `sessions`,
   `active_session`, all RLS-protected (`auth.uid() = user_id`), plus the
   `handle_new_user` trigger that bootstraps a profile + default subject list
   on signup.
2. `20260914194443_grant_table_privileges.sql` — table-level grants the
   Data API needs (RLS gates *rows*, this is what makes the tables reachable
   *at all*).
3. `20260915160000_parent_child_links.sql` — adds `role` + `child_code` to
   `profiles`, the `parent_child_links` table, `resolve_child_code` /
   `get_pending_link_requests` / `get_linked_children` RPCs (SECURITY
   DEFINER, scoped to rows the caller is actually a party to), and an extra
   `sessions` SELECT policy so an approved parent can read a linked child's
   sessions.
4. `20260915161500_parent_child_link_rpcs.sql` — the two `get_*` RPCs above.
5. `20260915163000_simplify_child_linking.sql` — linking is instant now
   (a parent adding a valid code creates an *already-approved* link, no
   child-side confirmation step) and `resolve_child_code` also returns email.

```bash
supabase link --project-ref <ref>   # once per machine
supabase db push                    # apply any new migrations under supabase/migrations/
```

`src/lib/db/schema.ts` + `drizzle.config.ts` exist for `drizzle-kit studio`
(a handy DB browser) but have **drifted** from the real schema above — treat
the SQL migrations as authoritative, not the Drizzle file, until/unless
someone reconciles them.

## Testing

```bash
npm run test         # vitest — pure logic (src/lib/format.ts, src/lib/log-calculations.ts)
npm run test:e2e     # playwright — full login → timer → break → stop → study log flow
```

The e2e suite runs against a production-equivalent dev server on port 3100
(see `playwright.config.ts`), targeting the **local** Supabase stack
(`supabase start` must already be running). It resets and re-seeds the demo
user in `globalSetup` before each run.

## Deploying

1. **Apply the schema** to the hosted Supabase project:
   ```bash
   supabase login --token <personal-access-token>   # from supabase.com/dashboard/account/tokens
   supabase link --project-ref <ref>
   supabase db push
   ```
2. **Vercel env vars** (Project Settings → Environment Variables, or
   `vercel env add`): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the hosted project's API
   settings.
3. **Deploy**: `vercel --prod` (or push to the connected Git branch). No other
   config needed — `vercel.json` already pins the function region.
4. **Auth settings** (Supabase Dashboard → Authentication):
   - **URL Configuration** → Site URL = your production URL; add
     `<url>/**` to Redirect URLs.
   - **Sign In / Providers → Email**: this project runs with email
     confirmation **disabled** (`mailer_autoconfirm`) — signup logs the user
     in immediately. Flip it back on in the dashboard if you want the
     confirm-email step back, and revert `signUpAction`'s straight-to-
     `redirect("/timer")` behavior in `src/app/(auth)/actions.ts`
     accordingly.
   - If you want real "parent wants to link" email notifications (currently
     an in-app instant-link flow instead, see schema notes above), that
     needs a transactional email provider (Resend, SMTP) wired in — not set
     up in this project yet.
