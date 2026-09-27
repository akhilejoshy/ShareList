import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { igLinks, users } from "@/db/schema";

/**
 * Resolves an Instagram sender to a users.id, auto-creating a user +
 * ig_links row on first contact (no Google/Instagram login required yet).
 * M4's real login flow re-points these rows to an authenticated user later.
 */
export async function resolveUserId(botId: string, igUserId: string): Promise<string> {
  const existingLink = await db.query.igLinks.findFirst({
    where: and(eq(igLinks.botId, botId), eq(igLinks.igUserId, igUserId)),
  });
  if (existingLink) return existingLink.userId;

  const [user] = await db.insert(users).values({}).returning();
  await db.insert(igLinks).values({ userId: user.id, botId, igUserId });
  return user.id;
}
