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

function sign(secret: string, rawBody: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

let hasWarnedDevOverride = false;

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  contentLengthHeader?: string | null,
): boolean {
  if (!signatureHeader) return false;

  const candidateSecrets = [
    env.META_APP_SECRET,
    env.META_INSTAGRAM_APP_SECRET,
    process.env.META_INSTAGRAM_APP_SECRET,
  ].filter((s): s is string => Boolean(s && s.trim()));

  for (const secret of candidateSecrets) {
    const expected = sign(secret, rawBody);
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }

  if (env.DEBUG_WEBHOOK_SIG === "1" || process.env.DEBUG_WEBHOOK_SIG === "1") {
    console.log("[webhook-sig-debug] content-length header:", contentLengthHeader);
    console.log("[webhook-sig-debug] actual body length    :", rawBody.length);
    console.log("[webhook-sig-debug] body first 40 chars   :", JSON.stringify(rawBody.slice(0, 40)));
    console.log("[webhook-sig-debug] body last 40 chars    :", JSON.stringify(rawBody.slice(-40)));
    console.log("[webhook-sig-debug] received :", signatureHeader);
    for (const secret of candidateSecrets) {
      console.log(`[webhook-sig-debug] tested(${secret.slice(0, 6)}...):`, sign(secret, rawBody));
    }
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (env.ALLOW_INSECURE_DEV_WEBHOOK === "1" || env.BYPASS_WEBHOOK_VERIFY === "1")
  ) {
    if (!hasWarnedDevOverride) {
      console.log(
        "[webhook/verify] ⚠️ Development mode override active (ALLOW_INSECURE_DEV_WEBHOOK=1)",
      );
      hasWarnedDevOverride = true;
    }
    return true;
  }

  return false;
}
