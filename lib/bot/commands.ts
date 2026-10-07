import { db } from "@/db";
import { items, collectionEntries } from "@/db/schema";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { sendBotText } from "@/lib/bot/send";
import { resolveUserId } from "@/db/queries/users";
import type { IgMessageReceivedEvent } from "@/lib/webhook/types";

interface Bot {
  id: string;
  igBusinessId: string;
}

export async function tryHandleImportCommand(
  bot: Bot,
  accessToken: string | null,
  event: IgMessageReceivedEvent,
): Promise<boolean> {
  const text = event.message?.text;
  if (!text || !/^\/import\b/i.test(text.trim())) return false;

  const lines = text
    .replace(/^\/import\b/i, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    if (accessToken) {
      await sendBotText(
        bot.igBusinessId,
        accessToken,
        event.sender.id,
        "Send /import followed by one movie title per line.",
      );
    }
    return true;
  }

  const userId = await resolveUserId(bot.id, event.sender.id);
  let imported = 0;
  const needsReview: string[] = [];

  for (const title of lines) {
    const results = await tmdbProvider.search(title);
    if (results.length === 0) {
      needsReview.push(title);
      continue;
    }

    const top = results[0];
    const itemData = await tmdbProvider.getById(top.externalId);

    const existingItem = await db.query.items.findFirst({
      where: (i, { and, eq }) => and(eq(i.botId, bot.id), eq(i.externalId, itemData.externalId)),
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
      where: (e, { and, eq }) => and(eq(e.userId, userId), eq(e.itemId, item.id)),
    });

    if (!existingEntry) {
      await db.insert(collectionEntries).values({ userId, itemId: item.id, botId: bot.id });
    }

    imported++;
  }

  const summary =
    needsReview.length > 0
      ? `Imported ${imported}/${lines.length}. Needs review: ${needsReview.join(", ")}`
      : `Imported ${imported}/${lines.length}. All done ✅`;

  if (accessToken) {
    await sendBotText(bot.igBusinessId, accessToken, event.sender.id, summary);
  }
  return true;
}
