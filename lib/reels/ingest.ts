import { db } from "@/db";
import { reels } from "@/db/schema";
import { resolveUserId } from "@/db/queries/users";
import { runPipeline } from "@/lib/identification/pipeline";
import { presentOrFinalize } from "@/lib/reels/resolveCandidates";
import { markPendingRetry } from "@/lib/reels/retry";
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
  const mediaId = share?.payload.reel_video_id ?? null;

  if (!permalink && event.message?.text) {
    const urlMatch = event.message.text.match(
      /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+/i,
    );
    if (urlMatch) {
      permalink = urlMatch[0];
    }
  }

  return { permalink, caption, mediaId };
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

  const { permalink, caption, mediaId } = extractShare(event);
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

  const formattedCaption = caption
    ? caption.replace(/\r?\n+/g, " ").slice(0, 140) + (caption.length > 140 ? "..." : "")
    : "(none)";

  try {
    const outcome = await runPipeline(bot.slug, {
      reelId: reel.id,
      userText,
      caption,
      mediaId,
      accessToken,
    });

    const result = await presentOrFinalize({
      bot,
      accessToken,
      userId,
      reelId: reel.id,
      recipientId: event.sender.id,
      source: outcome.result?.source ?? "caption",
      providerCandidates: outcome.result?.candidates ?? [],
    });

    const outcomeLine =
      result.status === "matched"
        ? `🎯 Saved Movie          : ${result.titleToSave}${result.year ?? ""}`
        : result.status === "awaiting_pick"
          ? "⚠️  Identification Result : 🔀 Multiple candidates, awaiting pick"
          : "⚠️  Identification Result : ❓ Asked user";

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
│ ${outcomeLine}
└─────────────────────────────────────────────────────────────────────────┘
`);
  } catch (err) {
    console.error(`[ingest] pipeline failed for reel ${reel.id}`, err);
    await markPendingRetry(reel.id, reel.attempts, err as Error);
  }
}
