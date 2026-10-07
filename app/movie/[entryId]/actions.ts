"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { collectionEntries, items, reels } from "@/db/schema";
import { requireUserId } from "@/lib/auth/session";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { getMoviesBot } from "@/db/queries/bots";

async function requireOwnedEntry(entryId: string) {
  const userId = await requireUserId();
  const entry = await db.query.collectionEntries.findFirst({
    where: eq(collectionEntries.id, entryId),
  });
  if (!entry || entry.userId !== userId) {
    throw new Error("Not found");
  }
  return entry;
}

export async function toggleVisited(entryId: string) {
  const entry = await requireOwnedEntry(entryId);
  await db
    .update(collectionEntries)
    .set({ visited: !entry.visited })
    .where(eq(collectionEntries.id, entryId));
  revalidatePath(`/movie/${entryId}`);
  revalidatePath("/");
}

export async function deleteEntry(entryId: string) {
  await requireOwnedEntry(entryId);
  await db.delete(reels).where(eq(reels.entryId, entryId));
  await db.delete(collectionEntries).where(eq(collectionEntries.id, entryId));
  revalidatePath("/");
  redirect("/");
}

export async function swapItem(entryId: string, externalId: string) {
  await requireOwnedEntry(entryId);
  const bot = await getMoviesBot();
  const itemData = await tmdbProvider.getById(externalId);

  const existingItem = await db.query.items.findFirst({
    where: (i, { and, eq: eqOp }) => and(eqOp(i.botId, bot.id), eqOp(i.externalId, itemData.externalId)),
  });

  // Always refresh with the latest TMDB fetch (even for an existing row) so older
  // saved items pick up fields added to the provider later, e.g. cast/director/runtime.
  const [item] = existingItem
    ? await db
        .update(items)
        .set({
          title: itemData.title,
          coverImageUrl: itemData.coverImageUrl,
          bannerUrl: itemData.bannerUrl,
          metadata: itemData.metadata,
        })
        .where(eq(items.id, existingItem.id))
        .returning()
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

  await db.update(collectionEntries).set({ itemId: item.id }).where(eq(collectionEntries.id, entryId));
  await db.update(reels).set({ status: "matched" }).where(eq(reels.entryId, entryId));

  revalidatePath(`/movie/${entryId}`);
  revalidatePath("/");
}
