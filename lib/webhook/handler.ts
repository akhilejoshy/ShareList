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

  if (!verifySignature(rawBody, signature)) {
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
      const bot = await routeByIgBusinessId(event.recipient.id);
      if (!bot) {
        console.warn(`No bot found for ig_business_id=${event.recipient.id}`);
        continue;
      }
      console.log(`[webhook] routed to bot=${bot.slug} from sender=${event.sender.id}`, {
        text: event.message?.text,
        postback: event.postback?.payload,
      });

      try {
        const tokenRow = await db.query.metaTokens.findFirst({
          where: eq(metaTokens.botId, bot.id),
        });
        const accessToken = tokenRow?.accessToken ?? null;

        const handledAsLink = await tryHandleLinkCommand(bot, accessToken, event);
        if (!handledAsLink) {
          await ingestReel(bot, accessToken, event);
        }
      } catch (err) {
        console.error("[webhook] ingest failed", err);
      }
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
