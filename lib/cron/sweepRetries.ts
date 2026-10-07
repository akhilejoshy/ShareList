import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { bots, igLinks, metaTokens, reels } from "@/db/schema";
import { runPipeline } from "@/lib/identification/pipeline";
import { presentOrFinalize } from "@/lib/reels/resolveCandidates";
import { markPendingRetry } from "@/lib/reels/retry";

export async function sweepPendingRetries(): Promise<{ processed: number }> {
  const due = await db
    .select()
    .from(reels)
    .where(and(eq(reels.status, "pending_retry"), lte(reels.nextRetryAt, new Date())));

  let processed = 0;

  for (const reel of due) {
    const bot = await db.query.bots.findFirst({ where: eq(bots.id, reel.botId) });
    if (!bot) continue;

    const tokenRow = await db.query.metaTokens.findFirst({ where: eq(metaTokens.botId, bot.id) });
    const accessToken = tokenRow?.accessToken ?? null;

    const link = await db.query.igLinks.findFirst({
      where: and(eq(igLinks.botId, bot.id), eq(igLinks.userId, reel.userId)),
    });
    const recipientId = link?.igUserId;
    if (!recipientId) continue;

    try {
      const outcome = await runPipeline(bot.slug, {
        reelId: reel.id,
        userText: reel.userMessage,
        caption: reel.caption,
        mediaId: null,
        accessToken,
      });

      await presentOrFinalize({
        bot,
        accessToken,
        userId: reel.userId,
        reelId: reel.id,
        recipientId,
        source: outcome.result?.source ?? "caption",
        providerCandidates: outcome.result?.candidates ?? [],
      });
      processed++;
    } catch (err) {
      await markPendingRetry(reel.id, reel.attempts, err as Error);
    }
  }

  return { processed };
}
