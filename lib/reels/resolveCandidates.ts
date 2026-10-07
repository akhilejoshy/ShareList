import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botPrompts, candidates, reels } from "@/db/schema";
import { sendBotQuickReplies, sendBotCards } from "@/lib/bot/send";
import { buildCandidateCarousel, skipQuickReply } from "@/lib/bot/cards";
import { finalizeMatch, sendMatchConfirmation } from "./finalize";
import type { ProviderCandidate } from "@/lib/providers/types";

interface Bot {
  id: string;
  igBusinessId: string;
}

type CandidateSource = "user_text" | "caption" | "video" | "location_tag" | "user_reply";

/**
 * Given a list of provider candidates for a reel, either: asks the user
 * (none found), auto-saves (exactly one), or sends a pick-one carousel
 * (multiple). Shared by the initial ingest pipeline, a typed answer to an
 * open "what movie is this?" prompt, and (indirectly) the card postback
 * handler, which calls finalizeMatch directly once a single pick is made.
 */
export async function presentOrFinalize(params: {
  bot: Bot;
  accessToken: string | null;
  userId: string;
  reelId: string;
  recipientId: string;
  source: CandidateSource;
  providerCandidates: ProviderCandidate[];
  askMessage?: string;
}): Promise<{ status: "asked" | "matched" | "awaiting_pick"; titleToSave?: string; year?: string }> {
  const { bot, accessToken, userId, reelId, recipientId, source, providerCandidates } = params;

  if (providerCandidates.length === 0) {
    await db.update(reels).set({ status: "awaiting_user" }).where(eq(reels.id, reelId));
    await db.insert(botPrompts).values({ userId, reelId, type: "ask_name" });
    const askMsg = params.askMessage ?? "🤔 What movie or show is this?";
    if (accessToken) {
      await sendBotQuickReplies(bot.igBusinessId, accessToken, recipientId, askMsg, [
        skipQuickReply(reelId),
      ]);
    }
    return { status: "asked" };
  }

  if (providerCandidates.length === 1) {
    const top = providerCandidates[0];
    await db.insert(candidates).values({
      reelId,
      source,
      titleGuess: top.title,
      externalId: top.externalId,
      chosen: true,
    });
    const { titleToSave, year } = await finalizeMatch(bot, accessToken, userId, reelId, top);
    await sendMatchConfirmation(bot, accessToken, recipientId, titleToSave, year);
    return { status: "matched", titleToSave, year };
  }

  const inserted = await db
    .insert(candidates)
    .values(
      providerCandidates.map((c) => ({
        reelId,
        source,
        titleGuess: c.title,
        externalId: c.externalId,
        chosen: false,
      })),
    )
    .returning();

  await db.update(reels).set({ status: "awaiting_user" }).where(eq(reels.id, reelId));

  const cardElements = buildCandidateCarousel(
    inserted.map((row, i) => ({
      candidateId: row.id,
      title: row.titleGuess ?? "Unknown",
      year: providerCandidates[i].year,
      coverImageUrl: providerCandidates[i].coverImageUrl,
    })),
  );

  if (accessToken) {
    await sendBotCards(bot.igBusinessId, accessToken, recipientId, cardElements);
  }

  return { status: "awaiting_pick" };
}
