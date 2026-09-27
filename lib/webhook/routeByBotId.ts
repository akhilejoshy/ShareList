import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bots } from "@/db/schema";

export async function routeByIgBusinessId(igBusinessId: string) {
  const bot = await db.query.bots.findFirst({
    where: eq(bots.igBusinessId, igBusinessId),
  });
  return bot ?? null;
}
