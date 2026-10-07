import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { botPrompts, candidates, reels } from "@/db/schema";
import { resolveUserId } from "@/db/queries/users";
import { tryHandleLinkCommand } from "@/lib/bot/linking";
import { tryHandleImportCommand } from "@/lib/bot/commands";
import { sendBotText } from "@/lib/bot/send";
import { finalizeMatch, sendMatchConfirmation } from "@/lib/reels/finalize";
import { presentOrFinalize } from "@/lib/reels/resolveCandidates";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { ingestReel } from "@/lib/reels/ingest";
import type { IgMessageReceivedEvent } from "@/lib/webhook/types";

interface Bot {
  id: string;
  slug: string;
  igBusinessId: string;
}

async function handlePostback(bot: Bot, accessToken: string | null, event: IgMessageReceivedEvent) {
  const payload = event.postback?.payload;
  if (!payload) return false;

  const pickMatch = payload.match(/^PICK_CANDIDATE:(.+)$/);
  if (!pickMatch) return false;

  const candidateId = pickMatch[1];
  const candidate = await db.query.candidates.findFirst({ where: eq(candidates.id, candidateId) });
  if (!candidate || !candidate.externalId) {
    if (accessToken) {
      await sendBotText(bot.igBusinessId, accessToken, event.sender.id, "That option expired — share the reel again.");
    }
    return true;
  }

  const reel = await db.query.reels.findFirst({ where: eq(reels.id, candidate.reelId) });
  if (!reel) return true;

  await db.update(candidates).set({ chosen: true }).where(eq(candidates.id, candidate.id));

  const userId = reel.userId;
  const { titleToSave, year } = await finalizeMatch(bot, accessToken, userId, reel.id, {
    externalId: candidate.externalId,
    extra: {},
  });
  await sendMatchConfirmation(bot, accessToken, event.sender.id, titleToSave, year);
  return true;
}

async function handleSkipQuickReply(bot: Bot, accessToken: string | null, event: IgMessageReceivedEvent) {
  const payload = event.message?.quick_reply?.payload;
  if (!payload) return false;

  const skipMatch = payload.match(/^SKIP_PROMPT:(.+)$/);
  if (!skipMatch) return false;

  const reelId = skipMatch[1];
  await db.update(reels).set({ status: "unknown" }).where(eq(reels.id, reelId));
  await db
    .update(botPrompts)
    .set({ status: "answered" })
    .where(and(eq(botPrompts.reelId, reelId), eq(botPrompts.status, "open")));

  if (accessToken) {
    await sendBotText(
      bot.igBusinessId,
      accessToken,
      event.sender.id,
      "No worries — saved as unidentified. You can fix it anytime on the website.",
    );
  }
  return true;
}

async function handleOpenPromptAnswer(bot: Bot, accessToken: string | null, event: IgMessageReceivedEvent) {
  const text = event.message?.text?.trim();
  if (!text) return false;

  const userId = await resolveUserId(bot.id, event.sender.id);
  const openPrompt = await db.query.botPrompts.findFirst({
    where: and(eq(botPrompts.userId, userId), eq(botPrompts.status, "open"), eq(botPrompts.type, "ask_name")),
    orderBy: desc(botPrompts.createdAt),
  });
  if (!openPrompt) return false;

  await db.update(botPrompts).set({ status: "answered" }).where(eq(botPrompts.id, openPrompt.id));

  const providerCandidates = await tmdbProvider.search(text);
  await presentOrFinalize({
    bot,
    accessToken,
    userId,
    reelId: openPrompt.reelId,
    recipientId: event.sender.id,
    source: "user_reply",
    providerCandidates,
    askMessage: "🤔 Still couldn't find it — try a different name, or tap Skip.",
  });
  return true;
}

export async function routeIncoming(bot: Bot, accessToken: string | null, event: IgMessageReceivedEvent) {
  if (await tryHandleLinkCommand(bot, accessToken, event)) return;
  if (await tryHandleImportCommand(bot, accessToken, event)) return;
  if (await handlePostback(bot, accessToken, event)) return;
  if (await handleSkipQuickReply(bot, accessToken, event)) return;
  if (await handleOpenPromptAnswer(bot, accessToken, event)) return;
  await ingestReel(bot, accessToken, event);
}
