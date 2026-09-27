# Sharelist — Product Plan (Generic Multi-Vertical, Phased)

**Turn what you save from Instagram reels into a real, organized list — movies today, anything tomorrow.**

Working name: **Sharelist** (alt: Stashreel, Reelnest, Keepio) · Version 2.0 · 2026-08-17 · Owner: Susmitha

---

## 1. Product Positioning

Sharelist is a platform of Instagram DM-bots, one per content category (Movies, Food Spots, Travel Spots, Music...). A user follows/DMs whichever bot matches what they save. Every reel they share becomes a rich card — with the real-world details (poster/trailer for movies, address/rating for food, location/photos for travel) plus the original reel embedded, so they instantly recognize why they saved it.

**Core idea (unchanged from v1):** Instagram's API can't read a user's Saved collections or other accounts' comments. So Sharelist never tries to. Capture happens via **Share → DM to the relevant bot** (one tap, mobile-native, fully official), and unidentifiable content is resolved by **asking the user directly** — the one person who actually knows.

## 2. Phasing Strategy (locked)

> Build ONE vertical completely, prove it on real usage, THEN replicate the pattern. Never build three shallow verticals before one deep one works.

| Phase | What ships | Goal |
|---|---|---|
| **Phase 1** | Movies bot only — fully built, fully tested, real daily use | Prove the core loop end-to-end (capture → identify → display) with the hardest vertical (name-finding is genuinely hard for movies) |
| **Phase 2** | Add Food Spots bot + Travel Spots bot, reusing the same architecture | Prove the "add a vertical" motion is cheap and mechanical, not a rewrite |
| **Phase 3** | Public launch: Meta App Review, more verticals as demand appears (Music, Books, Products...) | Scale beyond the owner + testers |

**The architecture is built generic from day one** (Section 4), even though Phase 1 only turns on Movies. This costs nothing extra now and avoids a schema rewrite in Phase 2.

## 3. The Multi-Bot Model

```
Your Facebook account (personal)
  -> Meta Developer Account (one, auto-created from FB login)
    -> Meta App "Sharelist" (one app, recommended — not one per vertical)
      -> Instagram Professional Account: @sharelist_movies   (Phase 1)
      -> Instagram Professional Account: @sharelist_food     (Phase 2)
      -> Instagram Professional Account: @sharelist_travel   (Phase 2)
```

- **1 Facebook account, 1 developer account, 1 Meta app** — that's the root. No duplication needed as verticals grow.
- **1 separate Instagram Professional account per bot** — this is the only thing that must be created per vertical (each needs its own username/email at signup; Gmail "+" aliases work: `you+movies@gmail.com`, `you+food@gmail.com`).
- **One webhook URL handles every bot.** Every incoming event carries which IG account (bot) received it — the backend routes by that id. Content never mixes because the *bot chosen at share-time* already defines the category — no guessing after the fact.
- If a user shares a food reel to the Movies bot, that's on them — the product isn't responsible for miscategorized shares (documented in ToS, not something we engineer around).
- Dev-mode testers are added at the **app** level, so once your personal Instagram is a tester, it works across all bots on that app.

## 4. Generic Architecture (built once, reused per vertical)

Everything below is **vertical-agnostic** — it doesn't change when Food/Travel are added in Phase 2.

- Webhook receiver, dedupe rules, bot conversation engine, reply-mapping (last-asked-wins / swipe-reply / button-tap), pending+retry, daily cron, auth, account linking.

Only **two things are swappable per vertical**, and they're isolated behind an interface:

1. **Identification strategy** — what signal to look for, in what order, to find a name/entity.
2. **Metadata provider** — where to fetch rich details once a name/entity is known.

| Vertical | Identification signal | Metadata provider |
|---|---|---|
| Movies | Title in caption/hashtags → text on video → scene recognition → ask user | TMDB (poster, banner, genre, trailer, language) |
| Food Spots | **Location tag on the post** (best signal) → place name in caption → signage/menu text in video → ask user | Google Places API (address, rating, photos, price level, map link, "open now") — or Foursquare/OpenStreetMap as a free-tier alternative; verify current pricing at signup, this shifts over time |
| Travel Spots | Location tag → place/destination name in caption → landmark recognition in video → ask user | Same as Food (Places API); category tagged as attraction/landmark/beach/etc. |

**Location tag bonus (new insight for this generic version):** Instagram posts are often geo-tagged by their creator (the little pin under the username). For Food and Travel, that tag — when present in the shared post's data — is a near-perfect identifying signal: one Places lookup, done, often with *higher* confidence than Movies gets from captions alone. This makes Food/Travel Phase 2 potentially *easier* to auto-identify than Movies was.

## 5. Generic Database Schema (Neon Postgres / Drizzle)

Built generic now so Phase 2 is additive, not a migration nightmare.

```
users
  id            uuid PK
  email         text UNIQUE
  name          text
  created_at    timestamptz

ig_links                                -- one row per (user, bot) they've linked
  id            uuid PK
  user_id       uuid FK -> users
  bot_id        uuid FK -> bots
  ig_user_id    text
  UNIQUE (bot_id, ig_user_id)

link_tokens
  token         text PK
  bot_id        uuid FK -> bots
  ig_user_id    text
  expires_at    timestamptz
  used          boolean DEFAULT false

bots                                     -- one row per Instagram bot account
  id              uuid PK
  slug            text UNIQUE            -- 'movies' | 'food' | 'travel' | ...
  display_name    text                   -- "Sharelist Movies"
  ig_business_id  text UNIQUE            -- Meta's id for this IG account
  metadata_source text                   -- 'tmdb' | 'google_places' | ...
  active          boolean DEFAULT true

items                                    -- generic "card" (was `movies`)
  id            uuid PK
  bot_id        uuid FK -> bots
  external_id   text                    -- tmdb_id / place_id, as text
  title         text
  cover_image_url text                  -- poster / place photo
  banner_url    text NULL               -- backdrop / place cover photo
  metadata      jsonb                   -- vertical-specific fields, e.g.
                                         --  movie: {genres, trailer_url, language, year}
                                         --  food:  {address, lat, lng, rating, price_level}
                                         --  travel:{address, lat, lng, category}
  created_at    timestamptz
  UNIQUE (bot_id, external_id)

collection_entries                       -- an item ON a user's list (was `watchlist_items`)
  id            uuid PK
  user_id       uuid FK -> users
  item_id       uuid FK -> items NULL   -- NULL = "Unknown" card
  bot_id        uuid FK -> bots
  visited       boolean DEFAULT false  -- generic name for "watched"/"visited"/"tried"
  added_at      timestamptz
  UNIQUE (user_id, item_id)

reels                                    -- every shared reel/post, any bot
  id                 uuid PK
  user_id            uuid FK -> users
  bot_id             uuid FK -> bots      -- <- routes to the right pipeline
  ig_media_id        text
  permalink          text
  caption            text
  location_tag       jsonb NULL          -- {name, lat, lng} if IG provided one
  user_message       text NULL
  thumbnail_url      text NULL
  status             text                -- received|identifying|pending_retry|
                                          -- awaiting_user|matched|unknown
  entry_id           uuid FK -> collection_entries NULL
  attempts           integer DEFAULT 0
  last_error         text NULL
  next_retry_at      timestamptz NULL
  shared_at          timestamptz
  UNIQUE (user_id, ig_media_id)

candidates
  id            uuid PK
  reel_id       uuid FK -> reels
  source        text                    -- user_text|caption|video|location_tag|user_reply
  title_guess   text
  external_id   text NULL
  confidence    numeric
  chosen        boolean DEFAULT false
  created_at    timestamptz

bot_prompts
  id             uuid PK
  user_id        uuid FK -> users
  reel_id        uuid FK -> reels
  type           text                   -- options|ask_name|confirm|category_pick
  options        jsonb NULL
  bot_message_id text NULL
  status         text                   -- open|answered|expired
  created_at     timestamptz

meta_tokens
  id            serial PK
  bot_id        uuid FK -> bots         -- each bot has its own long-lived token
  access_token  text
  expires_at    timestamptz
  refreshed_at  timestamptz
```

**What changed from the v1 (movies-only) schema:** `movies`→`items` (+ `metadata jsonb` instead of fixed columns), `watchlist_items`→`collection_entries`, added `bots`, `ig_links`, `location_tag` on reels. Everything else (reels, candidates, bot_prompts, dedupe logic) is identical — this is a rename + one new table, not a rebuild.

## 6. Generic Identification Pipeline

Same 4-step escalation shape for every vertical; only the *content* of each step swaps.

```
STEP 0 (Food/Travel only) - LOCATION TAG CHECK
  If the shared post has a location tag -> Places lookup on it directly.
  Near-instant, near-certain match. Movies has no equivalent (skip).

STEP 1 - USER-SENT NAME (no AI, no download)
  Typed name/place with the share -> direct provider lookup (TMDB /
  Places) -> exact match saves; ambiguous -> numbered options / cards.

STEP 2 - CAPTION ANALYSIS (no download)
  AI reads caption + hashtags for a title/place name. Anti-filler
  rule: ignore unrelated spam captions, return nothing rather than
  guess wrong.

STEP 3 - VIDEO ANALYSIS (download only now)
  Video sent directly to Gemini (no ffmpeg needed):
  - Movies: on-video title text + scene/actor recognition
  - Food/Travel: signage/menu text + landmark/place recognition

STEP 4 - ASK THE USER
  One-line question, tap-chip [Skip] option, tap poster/photo cards
  for disambiguation. Unknown items still saved with the reel
  embedded — fixable anytime on the site.
```

## 7. Bot Conversation Design (generic, one-line rule holds)

Same rules as the Movies plan (Section 7 of the original doc): every message is one line except the options list, which is a card carousel (poster/photo + name + "This one ✅" button) with a text fallback.

**New for multi-bot / Phase 2:**

| Situation | Message |
|---|---|
| Location tag auto-matched | `✅ Saved: Leo's Cafe, Bandra` |
| Ask place name (no location tag, no caption match) | `🤔 What's this place called?` + [Skip] |
| Wrong bot used (optional, non-blocking) | *(no enforcement — product isn't responsible for miscategorized shares; optionally: a one-time pinned bot bio note: "Share food reels here, not movies 🎬➡️ use @sharelist_movies")* |

Everything else (duplicate reel/item, pending retry, reply-mapping, 24h reminder) is identical across bots — the engine doesn't know or care which vertical it's serving.

## 8. Edge Cases (new ones from generalizing)

| # | Edge case | Handling |
|---|---|---|
| G1 | User shares to the wrong bot (food reel to Movies bot) | Not engineered around — product not responsible; optional bio hint |
| G2 | Post has a location tag but it's wrong/generic (e.g. tagged "Mumbai" not the actual cafe) | Location match still attempted; low specificity → falls to Step 1/2/3 instead |
| G3 | Same place, multiple reels (2 different cafe visits) | Same dedupe rule as movies: `UNIQUE (user_id, item_id)` → reel attached to existing card |
| G4 | Google Places pricing/free-tier changes | Verify current pricing at signup (was historically a monthly free credit); OpenStreetMap Nominatim as a fully-free fallback if needed |
| G5 | A bot's Meta token expires independently of others | `meta_tokens` keyed per `bot_id`; cron refreshes each bot's token separately |
| G6 | New vertical needed later (e.g. Music) | Add one `bots` row + one metadata-provider integration (e.g. Spotify API) + one identification prompt — no core-engine changes |

All edge cases from the original Movies-only doc (E1–E20) still apply unchanged — they're all in the generic engine layer.

## 9. Build Milestones

### Phase 1 — Movies (build & fully test before Phase 2)

| M | Deliverable |
|---|---|
| M1 | Repo + generic Drizzle schema (Section 5) + Vercel deploy skeleton |
| M2 | `bots` table seeded with 1 row (`movies`); webhook verify + receive + routing-by-bot-id (routing logic built now even with 1 bot, so it's proven before Phase 2 adds more) |
| M3 | Pipeline Steps 1+2 for Movies + TMDB provider + bot confirms |
| M4 | Web grid + detail page + Auth.js + linking flow |
| M5 | Step 3 (video→Gemini) + Step 4 (ask flow) + pending/retry + quick replies/cards |
| M6 | Dedupe + `/import` backlog + daily cron (token refresh + sweep) |
| M7 | Polish: filters, visited toggle, Unknown shelf, fix-item search, 24h reminder |
| **Test gate** | **Run Phase 1 for real, daily, for at least 1–2 weeks before starting Phase 2** |

### Phase 2 — Food + Travel (repeat the template)

| M | Deliverable |
|---|---|
| M8 | Create `@sharelist_food` + `@sharelist_travel` IG accounts, connect to the same Meta app, seed `bots` rows |
| M9 | Google Places metadata provider (shared code for both verticals) + location-tag Step 0 + caption/video prompts tuned for places |
| M10 | Bot-picker UI on the web platform (choose which bot(s) to follow/link) + per-bot filtering on the grid |

Notice Phase 2 has no milestone for "rebuild the webhook/dedupe/reply-mapping/cron" — that's the payoff of building generic in Phase 1.

## 10. Tech Stack (unchanged, confirmed fixed)

Next.js (TS, App Router) · Vercel (Hobby, free) · Neon Postgres (free) · Drizzle ORM · Auth.js (Google) · Tailwind · Gemini API (free tier) · TMDB (Movies) · Google Places API or OpenStreetMap (Food/Travel, verify current free-tier terms at signup).

## 11. Naming Notes

- **Working name: Sharelist.** Short, generic across verticals, easy to say/spell, no category lock-in.
- Check domain/handle availability before committing: `sharelist.app`, `@sharelist_movies` / `@sharelist_food` / `@sharelist_travel` on Instagram.
- Alternates if taken: **Stashreel**, **Reelnest**, **Keepio**.
- Bot naming convention: `sharelist_<vertical>` keeps them recognizable as a family while being distinct accounts.

## 12. Legal / Privacy (updated)

- Not affiliated with/endorsed by Instagram/Meta, TMDB, or Google.
- "Powered by TMDB" and Google Places attribution where each is used.
- No responsibility for content shared to a mismatched bot (state in ToS).
- Minimum data stored per item: permalink, caption, location tag (if present), extracted name, cached metadata, thumbnail — private per user.
