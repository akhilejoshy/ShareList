import { env } from "@/lib/env";

// Verify at build time: confirm this is the correct Send API host/path for
// the "Instagram API with Instagram Login" flow (vs. the classic
// graph.facebook.com Page-linked flow) — Meta's docs have shifted this.
const BASE_URL = "https://graph.instagram.com";

export async function sendText(igBusinessId: string, accessToken: string, recipientId: string, text: string) {
  const url = `${BASE_URL}/${env.META_GRAPH_VERSION}/${igBusinessId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API send failed (${res.status}): ${body}`);
  }

  return res.json();
}
