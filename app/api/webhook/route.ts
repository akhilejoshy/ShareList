import { NextRequest, NextResponse } from "next/server";
import { verifyHandshake, verifySignature } from "@/lib/webhook/verify";
import { routeByIgBusinessId } from "@/lib/webhook/routeByBotId";
import type { IgWebhookPayload } from "@/lib/webhook/types";

export async function GET(req: NextRequest) {
  const challenge = verifyHandshake(req.nextUrl.searchParams);
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
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
      // Full ingest/identification pipeline lands in M3+.
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
