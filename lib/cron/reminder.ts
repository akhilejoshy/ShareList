import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { botPrompts, bots, igLinks, metaTokens, reels } from "@/db/schema";
import { sendBotText } from "@/lib/bot/send";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function sweepPromptReminders(): Promise<{ reminded: number; expired: number }> {
  const now = Date.now();
  let reminded = 0;
  let expired = 0;

  // First nudge: open prompts older than 24h.
  const openPrompts = await db
    .select()
    .from(botPrompts)
    .where(and(eq(botPrompts.status, "open"), lt(botPrompts.createdAt, new Date(now - DAY_MS))));

  for (const prompt of openPrompts) {
    const reel = await db.query.reels.findFirst({ where: eq(reels.id, prompt.reelId) });
    if (!reel) continue;
    const bot = await db.query.bots.findFirst({ where: eq(bots.id, reel.botId) });
    if (!bot) continue;

    const link = await db.query.igLinks.findFirst({
      where: and(eq(igLinks.botId, bot.id), eq(igLinks.userId, prompt.userId)),
    });
    const tokenRow = await db.query.metaTokens.findFirst({ where: eq(metaTokens.botId, bot.id) });
    if (link && tokenRow) {
      await sendBotText(
        bot.igBusinessId,
        tokenRow.accessToken,
        link.igUserId,
        "👋 Still want to name that reel you sent? Reply with the title, or ignore to skip.",
      );
    }

    await db.update(botPrompts).set({ status: "reminded" }).where(eq(botPrompts.id, prompt.id));
    reminded++;
  }

  // Expire: reminded prompts still unanswered after another 24h -> Unknown shelf.
  const remindedPrompts = await db
    .select()
    .from(botPrompts)
    .where(and(eq(botPrompts.status, "reminded"), lt(botPrompts.createdAt, new Date(now - 2 * DAY_MS))));

  for (const prompt of remindedPrompts) {
    await db.update(botPrompts).set({ status: "expired" }).where(eq(botPrompts.id, prompt.id));
    await db.update(reels).set({ status: "unknown" }).where(eq(reels.id, prompt.reelId));
    expired++;
  }

  return { reminded, expired };
}
