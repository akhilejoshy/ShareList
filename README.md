# Sharelist — Movies Bot (Phase 1)

Turns Instagram reels shared via DM into a movie list, with a web dashboard.
See [`Plan/SHARELIST_PRODUCT_PLAN.md`](Plan/SHARELIST_PRODUCT_PLAN.md) for the
full product plan.

## Local setup (from scratch, on any machine)

### 1. Prerequisites

- Node.js 20+
- A local PostgreSQL server running on `localhost:5432`
- [ngrok](https://ngrok.com/) (for exposing your local server to Meta's webhook)

### 2. Install dependencies

```bash
npm install
```

### 3. Create the local database

In `psql`:

```sql
create user share_list with password 'share_list' superuser;
create database "share_list";
grant all privileges on database share_list to share_list;
```

### 4. Create `.env.local`

Copy `.env.example` to `.env.local` and fill in the values below.

```bash
cp .env.example .env.local
```

Required for basic local dev:

```
DATABASE_URL=postgresql://share_list:share_list@localhost:5432/share_list
DATABASE_URL_UNPOOLED=postgresql://share_list:share_list@localhost:5432/share_list
AUTH_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
TMDB_API_KEY=<your TMDB v3 API key, from themoviedb.org/settings/api>
```

Needed once you're wiring up the Instagram bot (see "Meta app setup" below):

```
META_VERIFY_TOKEN=<any string you choose, e.g. sharelist_dev_verify_token>
META_APP_ID=<Meta app ID, Settings > Basic>
META_APP_SECRET=<Meta app secret, Settings > Basic>
META_INSTAGRAM_APP_SECRET=<Instagram app secret, shown on the Instagram API setup page>
SEED_MOVIES_IG_BUSINESS_ID=<the connected IG account's business ID, shown in API setup>
SEED_MOVIES_ACCESS_TOKEN=<long-lived access token generated for that account>
```

Optional debug flags (leave unset normally):

```
DEBUG_WEBHOOK_SIG=1        # logs signature comparison details on every webhook POST
DEBUG_ATTACHMENTS=1        # logs raw message.attachments payload on every webhook POST
ALLOW_INSECURE_DEV_WEBHOOK=1  # ⚠️ bypasses webhook signature verification — local-only, never deploy with this set
```

### 5. Run database migrations

```bash
npx drizzle-kit migrate
```

### 6. Seed the `movies` bot

Requires `SEED_MOVIES_IG_BUSINESS_ID` and `SEED_MOVIES_ACCESS_TOKEN` in `.env.local`:

```bash
npm run db:seed
```

Re-run this any time you regenerate the IG account's access token — it
updates the existing row rather than duplicating it.

### 7. Run the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected
to `/login`. Sign up with a username/password to create an account.

### 8. Expose it to Instagram via ngrok

In a second terminal:

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.dev` URL it prints.

### 9. Point Meta's webhook at your tunnel

In the Meta App dashboard → Instagram API setup → Configure webhooks:

- **Callback URL**: `https://xxxx.ngrok-free.dev/api/webhook`
  (the app also serves the same handler at `/webhooks/instagram`, in case
  Meta's console points there instead — both work)
- **Verify token**: whatever you set as `META_VERIFY_TOKEN`

Click **Verify and save**.

Note: ngrok's free URL changes every time you restart it, so you'll need to
update the Callback URL in Meta's dashboard each time you restart ngrok,
until this is deployed to a stable domain (Vercel).

### 10. Try it

1. On the site, go to `/link`, click **Generate link code**.
2. DM the resulting `link ABCDEF` code to the connected Instagram account.
3. The bot should reply `✅ Linked!`.
4. Share a movie reel to the same account (with or without typing the movie
   name) — the bot should reply `✅ Saved: <Title> (<year>)`.
5. Refresh the dashboard (`/`) to see it appear.

## Known local-environment gotcha

`api.themoviedb.org` is blocked by some ISPs (confirmed to happen on at
least one dev machine used on this project, likely an India-based ISP
blocking that specific domain while `image.tmdb.org` stays reachable). The
TMDB provider (`lib/providers/tmdb.ts`) already tries `api.tmdb.org` as a
fallback before `api.themoviedb.org` to work around this. If movie lookups
still fail with a connection-reset error, try a VPN or a different network —
this is expected to be a non-issue once deployed to Vercel, since requests
will originate from Vercel's servers instead of a local ISP connection.

## Project status

See [`Plan/SHARELIST_PRODUCT_PLAN.md`](Plan/SHARELIST_PRODUCT_PLAN.md) for
the full phased plan. Current progress (Phase 1, Movies bot):

- ✅ M1 — repo, generic Drizzle schema, DB health check
- ✅ M2 — webhook verify/receive, bot routing by IG business ID
- ✅ M3 — TMDB identification pipeline (user-typed text + caption parsing)
- ✅ M4 — username/password auth, dashboard, DM-code Instagram account linking
- ⬜ M5 — video analysis (Gemini), ask-the-user flow, pending/retry state machine
- ⬜ M6 — dedupe polish, `/import`, daily cron (token refresh + retry sweep)
- ⬜ M7 — filters, visited toggle, Unknown shelf, fix-item search, 24h reminder

Tenant-facing login is plain username/password (not Google/Instagram OAuth)
per product decision — Instagram Business Login is used only on the
admin/Meta-console side to connect bot accounts, never shown to end users.

## Tech stack

Next.js (App Router, TypeScript) · Drizzle ORM · PostgreSQL (local for now,
Neon planned for deployment) · Auth.js (Credentials/JWT) · Tailwind CSS ·
TMDB API.
