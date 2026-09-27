"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function login(_prevState: { error?: string } | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid username or password." };
    }
    throw err;
  }
}
