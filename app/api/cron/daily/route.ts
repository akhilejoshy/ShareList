import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { refreshExpiringTokens } from "@/lib/cron/refreshTokens";
import { sweepPendingRetries } from "@/lib/cron/sweepRetries";
import { sweepPromptReminders } from "@/lib/cron/reminder";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tokens = await refreshExpiringTokens();
  const retries = await sweepPendingRetries();
  const reminders = await sweepPromptReminders();

  return NextResponse.json({ ok: true, tokens, retries, reminders });
}
