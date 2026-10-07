import { eq, lte, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { metaTokens } from "@/db/schema";
import { refreshLongLivedToken } from "@/lib/meta/graphClient";

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // refresh if expiring within 7 days

export async function refreshExpiringTokens(): Promise<{ refreshed: number; failed: number }> {
  const soon = new Date(Date.now() + REFRESH_WINDOW_MS);
  const dueTokens = await db
    .select()
    .from(metaTokens)
    .where(or(isNull(metaTokens.expiresAt), lte(metaTokens.expiresAt, soon)));

  let refreshed = 0;
  let failed = 0;

  for (const token of dueTokens) {
    const result = await refreshLongLivedToken(token.accessToken);
    if (!result) {
      failed++;
      console.warn(`[cron/refreshTokens] failed to refresh token for bot=${token.botId}`);
      continue;
    }

    await db
      .update(metaTokens)
      .set({
        accessToken: result.accessToken,
        expiresAt: new Date(Date.now() + result.expiresInSeconds * 1000),
        refreshedAt: new Date(),
      })
      .where(eq(metaTokens.id, token.id));
    refreshed++;
  }

  return { refreshed, failed };
}
