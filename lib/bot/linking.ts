import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { collectionEntries, igLinks, linkTokens, reels, users } from "@/db/schema";
import { sendBotText } from "@/lib/bot/send";
import type { IgMessageReceivedEvent } from "@/lib/webhook/types";

interface Bot {
  id: string;
  igBusinessId: string;
}

const LINK_PATTERN = /^link\s+([A-Z0-9]{4,10})$/i;

export async function tryHandleLinkCommand(
  bot: Bot,
  accessToken: string | null,
  event: IgMessageReceivedEvent,
): Promise<boolean> {
  const text = event.message?.text?.trim();
  if (!text) return false;

  const match = text.match(LINK_PATTERN);
  if (!match) return false;

  const token = match[1].toUpperCase();
  const senderId = event.sender.id;

  const reply = async (msg: string, statusText: string) => {
    console.log(`
┌────────────────────── 🔗 INSTAGRAM ACCOUNT LINKING ──────────────────────┐
│ Sender ID       : ${senderId}
│ User DM Text    : "${text}"
│ Link Token      : ${token}
│ Status          : ${statusText}
│ 💬 DM Reply Sent : "${msg}"
└──────────────────────────────────────────────────────────────────────────┘
`);
    if (accessToken) await sendBotText(bot.igBusinessId, accessToken, senderId, msg);
  };

  const row = await db.query.linkTokens.findFirst({
    where: and(eq(linkTokens.token, token), eq(linkTokens.botId, bot.id)),
  });

  if (!row || row.used || row.expiresAt < new Date()) {
    await reply(
      "That code is invalid or expired — generate a new one on the site.",
      "⚠️ Code invalid, expired, or already used",
    );
    return true;
  }

  await db
    .update(linkTokens)
    .set({ used: true, igUserId: senderId })
    .where(eq(linkTokens.token, token));

  const shadowLink = await db.query.igLinks.findFirst({
    where: and(eq(igLinks.botId, bot.id), eq(igLinks.igUserId, senderId)),
  });

  if (shadowLink && shadowLink.userId !== row.userId) {
    const shadowUserId = shadowLink.userId;
    await db
      .update(collectionEntries)
      .set({ userId: row.userId })
      .where(eq(collectionEntries.userId, shadowUserId));
    await db.update(reels).set({ userId: row.userId }).where(eq(reels.userId, shadowUserId));
    await db.delete(igLinks).where(eq(igLinks.id, shadowLink.id));
    await db.delete(users).where(eq(users.id, shadowUserId));
  }

  const stillLinked = await db.query.igLinks.findFirst({
    where: and(eq(igLinks.botId, bot.id), eq(igLinks.igUserId, senderId)),
  });
  if (!stillLinked) {
    await db.insert(igLinks).values({ userId: row.userId, botId: bot.id, igUserId: senderId });
  }

  await reply(
    "✅ Linked! View your list at your Sharelist dashboard.",
    "✅ Linked successfully to user " + row.userId,
  );
  return true;
}
