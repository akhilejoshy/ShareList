import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reels } from "@/db/schema";

const MAX_ATTEMPTS = 5;

/** Exponential backoff in minutes, capped at 24h. */
function backoffMinutes(attempts: number): number {
  return Math.min(2 ** attempts, 60 * 24);
}

export async function markPendingRetry(reelId: string, currentAttempts: number, error: Error) {
  const attempts = currentAttempts + 1;
  const status = attempts >= MAX_ATTEMPTS ? "unknown" : "pending_retry";
  const nextRetryAt =
    status === "pending_retry" ? new Date(Date.now() + backoffMinutes(attempts) * 60_000) : null;

  await db
    .update(reels)
    .set({ status, attempts, lastError: error.message.slice(0, 500), nextRetryAt })
    .where(eq(reels.id, reelId));
}
