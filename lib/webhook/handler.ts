import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { metaTokens } from "@/db/schema";
import { verifyHandshake, verifySignature } from "@/lib/webhook/verify";
import { routeByIgBusinessId } from "@/lib/webhook/routeByBotId";
import { ingestReel } from "@/lib/reels/ingest";
import { tryHandleLinkCommand } from "@/lib/bot/linking";
import type { IgWebhookPayload } from "@/lib/webhook/types";

export async function handleWebhookGet(req: NextRequest) {
  const challenge = verifyHandshake(req.nextUrl.searchParams);
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function handleWebhookPost(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const contentLength = req.headers.get("content-length");

  if (!verifySignature(rawBody, signature, contentLength)) {
    console.warn("Webhook signature verification failed");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let payload: IgWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      // Ignore echoes, read receipts, delivery receipts, or events without user content
      if (
        event.message?.is_echo ||
        event.read ||
        event.delivery ||
        (!event.message && !event.postback) ||
        !event.sender?.id
      ) {
        continue;
      }

      const businessId = event.recipient?.id || entry.id;
      const bot = await routeByIgBusinessId(businessId);
      if (!bot) {
        console.warn(`[webhook] No bot found for ig_business_id=${businessId}`);
        continue;
      }

      try {
        const tokenRow = await db.query.metaTokens.findFirst({
          where: eq(metaTokens.botId, bot.id),
        });
        const accessToken = tokenRow?.accessToken ?? null;

        const messageEvent = {
          ...event,
          sender: { id: event.sender.id },
          recipient: { id: businessId },
        };

        const handledAsLink = await tryHandleLinkCommand(bot, accessToken, messageEvent);
        if (!handledAsLink) {
          await ingestReel(bot, accessToken, messageEvent);
        }
      } catch (err) {
        console.error("[webhook] ingest failed", err);
      }
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
