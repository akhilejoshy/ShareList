import crypto from "node:crypto";
import { env } from "@/lib/env";

export function verifyHandshake(searchParams: URLSearchParams): string | null {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN && challenge) {
    return challenge;
  }
  return null;
}

export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !env.META_APP_SECRET) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", env.META_APP_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
