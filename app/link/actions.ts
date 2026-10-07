"use server";

import { customAlphabet } from "nanoid";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { linkTokens } from "@/db/schema";
import { getMoviesBot } from "@/db/queries/bots";
import { requireUserId } from "@/lib/auth/session";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export async function generateLinkCode() {
  const token = await createLinkToken();
  redirect(`/link?code=${token}`);
}

/** Same as generateLinkCode, but returns the token instead of redirecting — for the nav dialog. */
export async function generateLinkCodeValue(): Promise<string> {
  return createLinkToken();
}

async function createLinkToken(): Promise<string> {
  const userId = await requireUserId();
  const bot = await getMoviesBot();

  const token = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(linkTokens).values({ token, userId, botId: bot.id, expiresAt });

  return token;
}
