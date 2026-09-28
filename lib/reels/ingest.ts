import { eq } from "drizzle-orm";
import { db } from "@/db";
import { candidates, collectionEntries, items, reels } from "@/db/schema";
import { resolveUserId } from "@/db/queries/users";
import { runPipeline } from "@/lib/identification/pipeline";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { sendBotText } from "@/lib/bot/send";
import type { IgMessageReceivedEvent, IgMessagingEvent } from "@/lib/webhook/types";

interface Bot {
  id: string;
  slug: string;
  igBusinessId: string;
}

function extractShare(event: IgMessagingEvent) {
  const share = event.message?.attachments?.find(
    (a) => a.type === "share" || a.type === "ig_reel",
  );
  let permalink = share?.payload.url ?? null;
  const caption = share?.payload.title ?? null;

  if (!permalink && event.message?.text) {
    const urlMatch = event.message.text.match(
      /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+/i,
    );
    if (urlMatch) {
      permalink = urlMatch[0];
    }
  }

  return {
    permalink,
    caption,
  };
}

export async function ingestReel(bot: Bot, accessToken: string | null, event: IgMessageReceivedEvent) {
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

  const formattedCaption = caption
    ? caption.replace(/\r?\n+/g, " ").slice(0, 140) + (caption.length > 140 ? "..." : "")
    : "(none)";

  if (!outcome.result || outcome.result.candidates.length === 0) {
    await db.update(reels).set({ status: "unknown" }).where(eq(reels.id, reel.id));
    const replyMsg = "🤔 Couldn't identify that one — reply with the movie's name and I'll try again.";

    console.log(`
┌────────────────────── 📥 INSTAGRAM MESSAGE INGEST ──────────────────────┐
│ Sender IG ID    : ${event.sender.id}
│ User DM Text    : ${userText ? `"${userText}"` : "(none)"}
│ Reel URL        : ${permalink ?? "(none)"}
│ Post Caption    : "${formattedCaption}"
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Identification Pipeline Logs:
${outcome.pipelineLogs.map((l) => `│   • ${l}`).join("\n")}
├─────────────────────────────────────────────────────────────────────────┤
│ ⚠️  Identification Result : ❌ UNRECOGNIZED
│ 💬 DM Reply Sent        : "${replyMsg}"
└─────────────────────────────────────────────────────────────────────────┘
`);

    if (accessToken) {
      await sendBotText(bot.igBusinessId, accessToken, event.sender.id, replyMsg);
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

  const matchedQuery = (top.extra?.matchedQuery as string | undefined)?.trim();
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

  await db.update(reels).set({ status: "matched", entryId: entry.id }).where(eq(reels.id, reel.id));

  const year = itemData.metadata.year ? ` (${itemData.metadata.year})` : "";
  const replyMsg = `✅ Saved: ${titleToSave}${year}`;

  console.log(`
┌────────────────────── 📥 INSTAGRAM MESSAGE INGEST ──────────────────────┐
│ Sender IG ID    : ${event.sender.id}
│ User DM Text    : ${userText ? `"${userText}"` : "(none)"}
│ Reel URL        : ${permalink ?? "(none)"}
│ Post Caption    : "${formattedCaption}"
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Identification Pipeline Logs:
${outcome.pipelineLogs.map((l) => `│   • ${l}`).join("\n")}
├─────────────────────────────────────────────────────────────────────────┤
│ 🎯 Saved Movie          : ${titleToSave}${year} [TMDB ID: ${itemData.externalId}]
│ 🏷️  Identified Via       : ${outcome.result.method ?? outcome.result.source}
│ 📝 Query Extracted      : "${outcome.result.extractedQuery ?? ""}"
${outcome.result.details ? `│ ℹ️  Extraction Context  : ${outcome.result.details}\n` : ""}│ 💬 DM Reply Sent        : "${replyMsg}"
└─────────────────────────────────────────────────────────────────────────┘
`);

  if (accessToken) {
    await sendBotText(
      bot.igBusinessId,
      accessToken,
      event.sender.id,
      replyMsg,
    );
  }
}
