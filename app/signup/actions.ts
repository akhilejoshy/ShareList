"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signIn } from "@/auth";

const signupSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6),
});

export async function signup(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Username must be 3+ chars, password 6+ chars." };
  }
  const { username, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (existing) {
    return { error: "That username is already taken." };
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ username, passwordHash });

  await signIn("credentials", { username, password, redirectTo: "/" });
}
