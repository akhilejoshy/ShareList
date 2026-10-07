import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bots, metaTokens } from "@/db/schema";

async function main() {
  const igBusinessId = process.env.SEED_MOVIES_IG_BUSINESS_ID;
  const accessToken = process.env.SEED_MOVIES_ACCESS_TOKEN;

  if (!igBusinessId || !accessToken) {
    throw new Error(
      "Set SEED_MOVIES_IG_BUSINESS_ID and SEED_MOVIES_ACCESS_TOKEN env vars before seeding.",
    );
  }

  const existing = await db.query.bots.findFirst({ where: eq(bots.slug, "movies") });

  const bot =
    existing ??
    (
      await db
        .insert(bots)
        .values({
          slug: "movies",
          displayName: "Sharelist Movies",
          igBusinessId,
          metadataSource: "tmdb",
        })
        .returning()
    )[0];

  const existingToken = await db.query.metaTokens.findFirst({
    where: eq(metaTokens.botId, bot.id),
  });

  // IG long-lived tokens last ~60 days; the daily cron refreshes them
  // before this expiry (see lib/cron/refreshTokens.ts).
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  if (existingToken) {
    await db
      .update(metaTokens)
      .set({ accessToken, expiresAt, refreshedAt: new Date() })
      .where(eq(metaTokens.id, existingToken.id));
  } else {
    await db.insert(metaTokens).values({ botId: bot.id, accessToken, expiresAt });
  }

  console.log(`Seeded bot '${bot.slug}' (id=${bot.id}, ig_business_id=${bot.igBusinessId})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
