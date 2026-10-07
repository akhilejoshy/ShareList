import { eq } from "drizzle-orm";
import { db } from "@/db";
import { collectionEntries, items, reels } from "@/db/schema";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { sendBotText } from "@/lib/bot/send";
import type { ProviderCandidate } from "@/lib/providers/types";

interface Bot {
  id: string;
  igBusinessId: string;
}

/**
 * Resolves a chosen TMDB candidate into a saved items/collectionEntries row,
 * marks the reel matched, and sends the confirmation DM. Shared by the
 * auto-match path (single confident candidate), the card-carousel pick
 * (postback), and a typed answer to the bot's "what movie is this?" prompt.
 */
export async function finalizeMatch(
  bot: Bot,
  accessToken: string | null,
  userId: string,
  reelId: string,
  candidate: Pick<ProviderCandidate, "externalId" | "extra">,
) {
  const itemData = await tmdbProvider.getById(candidate.externalId);

  const matchedQuery = (candidate.extra?.matchedQuery as string | undefined)?.trim();
  let titleToSave = itemData.title;
  const altTitles = (itemData.metadata.alternativeTitles as string[] | undefined) ?? [];
  const isAltMatch =
    matchedQuery &&
    matchedQuery.toLowerCase() !== itemData.title.toLowerCase() &&
    altTitles.some((alt) => alt.toLowerCase() === matchedQuery.toLowerCase());

  if (isAltMatch) {
    titleToSave = `${itemData.title} (aka ${matchedQuery})`;
  }

  const existingItem = await db.query.items.findFirst({
    where: (i, { and, eq: eqOp }) => and(eqOp(i.botId, bot.id), eqOp(i.externalId, itemData.externalId)),
  });

  if (existingItem && isAltMatch && existingItem.title !== titleToSave) {
    await db.update(items).set({ title: titleToSave }).where(eq(items.id, existingItem.id));
    existingItem.title = titleToSave;
  }

  const [item] =
    existingItem !== undefined
      ? [existingItem]
      : await db
          .insert(items)
          .values({
            botId: bot.id,
            externalId: itemData.externalId,
            title: titleToSave,
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

  await db.update(reels).set({ status: "matched", entryId: entry.id }).where(eq(reels.id, reelId));

  const year = itemData.metadata.year ? ` (${itemData.metadata.year})` : "";
  return { titleToSave, year, itemData, entry };
}

export async function sendMatchConfirmation(
  bot: Bot,
  accessToken: string | null,
  recipientId: string,
  titleToSave: string,
  year: string,
) {
  if (!accessToken) return;
  await sendBotText(bot.igBusinessId, accessToken, recipientId, `✅ Saved: ${titleToSave}${year}`);
}
