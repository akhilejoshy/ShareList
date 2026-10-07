"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { collectionEntries, items } from "@/db/schema";
import { requireUserId } from "@/lib/auth/session";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { getMoviesBot } from "@/db/queries/bots";

/** Manually add a TMDB title to the current user's list (not via the Instagram bot). */
export async function addItemToList(externalId: string): Promise<string> {
  const userId = await requireUserId();
  const bot = await getMoviesBot();
  const itemData = await tmdbProvider.getById(externalId);

  const existingItem = await db.query.items.findFirst({
    where: (i, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(i.botId, bot.id), eqOp(i.externalId, itemData.externalId)),
  });

  const [item] = existingItem
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
    where: and(eq(collectionEntries.userId, userId), eq(collectionEntries.itemId, item.id)),
  });

  const [entry] = existingEntry
    ? [existingEntry]
    : await db
        .insert(collectionEntries)
        .values({ userId, itemId: item.id, botId: bot.id })
        .returning();

  revalidatePath("/");
  revalidatePath("/list");
  return entry.id;
}
