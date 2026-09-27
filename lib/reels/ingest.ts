import { eq } from "drizzle-orm";
import { db } from "@/db";
import { candidates, collectionEntries, items, reels } from "@/db/schema";
import { resolveUserId } from "@/db/queries/users";
import { runPipeline } from "@/lib/identification/pipeline";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { sendBotText } from "@/lib/bot/send";
import type { IgMessagingEvent } from "@/lib/webhook/types";

interface Bot {
  id: string;
  slug: string;
  igBusinessId: string;
}

function extractShare(event: IgMessagingEvent) {
  const share = event.message?.attachments?.find((a) => a.type === "share");
  return {
    permalink: share?.payload.url ?? null,
    caption: share?.payload.title ?? null,
  };
}

export async function ingestReel(bot: Bot, accessToken: string | null, event: IgMessagingEvent) {
  if (!event.message?.mid) return;

  const userId = await resolveUserId(bot.id, event.sender.id);
  const igMediaId = event.message.mid;

  const existing = await db.query.reels.findFirst({
    where: (r, { and, eq: eqOp }) => and(eqOp(r.userId, userId), eqOp(r.igMediaId, igMediaId)),
  });
  if (existing) {
    console.log(`[ingest] reel already recorded (id=${existing.id}), skipping`);
    return;
  }

  const { permalink, caption } = extractShare(event);
  const userText = event.message.text ?? null;

  const [reel] = await db
    .insert(reels)
    .values({
      userId,
      botId: bot.id,
      igMediaId,
      permalink,
      caption,
      userMessage: userText,
      status: "identifying",
    })
    .returning();

  const outcome = await runPipeline(bot.slug, { reelId: reel.id, userText, caption });

  if (!outcome.result || outcome.result.candidates.length === 0) {
    await db.update(reels).set({ status: "unknown" }).where(eq(reels.id, reel.id));
    if (accessToken) {
      await sendBotText(
        bot.igBusinessId,
        accessToken,
        event.sender.id,
        "🤔 Couldn't identify that one — reply with the movie's name and I'll try again.",
      );
    }
    return;
  }

  for (const c of outcome.result.candidates) {
    await db.insert(candidates).values({
      reelId: reel.id,
      source: outcome.result.source,
      titleGuess: c.title,
      externalId: c.externalId,
      chosen: c === outcome.result.candidates[0],
    });
  }

  const top = outcome.result.candidates[0];
  const itemData = await tmdbProvider.getById(top.externalId);

  const existingItem = await db.query.items.findFirst({
    where: (i, { and, eq: eqOp }) => and(eqOp(i.botId, bot.id), eqOp(i.externalId, itemData.externalId)),
  });

  const [item] =
    existingItem !== undefined
      ? [existingItem]
      : await db
          .insert(items)
          .values({
            botId: bot.id,
            externalId: itemData.externalId,
            title: itemData.title,
            coverImageUrl: itemData.coverImageUrl,
            bannerUrl: itemData.bannerUrl,
            metadata: itemData.metadata,
          })
          .returning();

  const existingEntry = await db.query.collectionEntries.findFirst({
    where: (e, { and, eq: eqOp }) => and(eqOp(e.userId, userId), eqOp(e.itemId, item.id)),
  });

  const [entry] =
    existingEntry !== undefined
      ? [existingEntry]
      : await db
          .insert(collectionEntries)
          .values({ userId, itemId: item.id, botId: bot.id })
          .returning();

  await db.update(reels).set({ status: "matched", entryId: entry.id }).where(eq(reels.id, reel.id));

  if (accessToken) {
    const year = itemData.metadata.year ? ` (${itemData.metadata.year})` : "";
    await sendBotText(
      bot.igBusinessId,
      accessToken,
      event.sender.id,
      `✅ Saved: ${itemData.title}${year}`,
    );
  }
}
