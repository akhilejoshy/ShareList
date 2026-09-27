import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bots } from "@/db/schema";

export async function getMoviesBot() {
  const bot = await db.query.bots.findFirst({ where: eq(bots.slug, "movies") });
  if (!bot) throw new Error("movies bot not seeded — run `npm run db:seed`");
  return bot;
}
