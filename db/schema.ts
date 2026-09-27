import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bots = pgTable("bots", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // 'movies' | 'food' | 'travel' | ...
  displayName: text("display_name").notNull(), // "Sharelist Movies"
  igBusinessId: text("ig_business_id").notNull().unique(),
  metadataSource: text("metadata_source").notNull(), // 'tmdb' | 'google_places' | ...
  active: boolean("active").notNull().default(true),
});

export const igLinks = pgTable(
  "ig_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id),
    igUserId: text("ig_user_id").notNull(),
  },
  (table) => [uniqueIndex("ig_links_bot_ig_user_unique").on(table.botId, table.igUserId)],
);

export const linkTokens = pgTable("link_tokens", {
  token: text("token").primaryKey(),
  botId: uuid("bot_id")
    .notNull()
    .references(() => bots.id),
  igUserId: text("ig_user_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").notNull().default(false),
});

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id),
    externalId: text("external_id").notNull(), // tmdb_id / place_id, as text
    title: text("title").notNull(),
    coverImageUrl: text("cover_image_url"), // poster / place photo
    bannerUrl: text("banner_url"), // backdrop / place cover photo
    metadata: jsonb("metadata"), // vertical-specific fields
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("items_bot_external_unique").on(table.botId, table.externalId)],
);

export const collectionEntries = pgTable(
  "collection_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    itemId: uuid("item_id").references(() => items.id), // NULL = "Unknown" card
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id),
    visited: boolean("visited").notNull().default(false), // watched/visited/tried
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("collection_entries_user_item_unique").on(table.userId, table.itemId)],
);

export const reels = pgTable(
  "reels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id), // routes to the right pipeline
    igMediaId: text("ig_media_id").notNull(),
    permalink: text("permalink"),
    caption: text("caption"),
    locationTag: jsonb("location_tag"), // {name, lat, lng} if IG provided one
    userMessage: text("user_message"),
    thumbnailUrl: text("thumbnail_url"),
    status: text("status").notNull().default("received"), // received|identifying|pending_retry|awaiting_user|matched|unknown
    entryId: uuid("entry_id").references(() => collectionEntries.id),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reels_user_ig_media_unique").on(table.userId, table.igMediaId)],
);

export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  reelId: uuid("reel_id")
    .notNull()
    .references(() => reels.id),
  source: text("source").notNull(), // user_text|caption|video|location_tag|user_reply
  titleGuess: text("title_guess"),
  externalId: text("external_id"),
  confidence: numeric("confidence"),
  chosen: boolean("chosen").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const botPrompts = pgTable("bot_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  reelId: uuid("reel_id")
    .notNull()
    .references(() => reels.id),
  type: text("type").notNull(), // options|ask_name|confirm|category_pick
  options: jsonb("options"),
  botMessageId: text("bot_message_id"),
  status: text("status").notNull().default("open"), // open|answered|expired
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const metaTokens = pgTable("meta_tokens", {
  id: serial("id").primaryKey(),
  botId: uuid("bot_id")
    .notNull()
    .references(() => bots.id), // each bot has its own long-lived token
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
});
