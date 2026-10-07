import { env } from "@/lib/env";

// Verify at build time: confirm this is the correct Send API host/path for
// the "Instagram API with Instagram Login" flow (vs. the classic
// graph.facebook.com Page-linked flow) — Meta's docs have shifted this.
const BASE_URL = "https://graph.instagram.com";

async function sendMessage(igBusinessId: string, accessToken: string, body: Record<string, unknown>) {
  const url = `${BASE_URL}/${env.META_GRAPH_VERSION}/${igBusinessId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Graph API send failed (${res.status}): ${errBody}`);
  }

  return res.json();
}

export async function sendText(igBusinessId: string, accessToken: string, recipientId: string, text: string) {
  return sendMessage(igBusinessId, accessToken, {
    recipient: { id: recipientId },
    message: { text },
  });
}

export interface QuickReply {
  title: string;
  payload: string;
}

export async function sendQuickReplies(
  igBusinessId: string,
  accessToken: string,
  recipientId: string,
  text: string,
  quickReplies: QuickReply[],
) {
  return sendMessage(igBusinessId, accessToken, {
    recipient: { id: recipientId },
    message: {
      text,
      quick_replies: quickReplies.map((q) => ({
        content_type: "text",
        title: q.title,
        payload: q.payload,
      })),
    },
  });
}

export interface CardElement {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  postbackPayload: string;
  buttonTitle?: string;
}

export async function sendGenericTemplate(
  igBusinessId: string,
  accessToken: string,
  recipientId: string,
  elements: CardElement[],
) {
  return sendMessage(igBusinessId, accessToken, {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements.map((e) => ({
            title: e.title,
            subtitle: e.subtitle,
            image_url: e.imageUrl,
            buttons: [
              {
                type: "postback",
                title: e.buttonTitle ?? "This one ✅",
                payload: e.postbackPayload,
              },
            ],
          })),
        },
      },
    },
  });
}

async function fetchMediaUrl(accessToken: string, mediaId: string): Promise<string | null> {
  const url = `${BASE_URL}/${env.META_GRAPH_VERSION}/${mediaId}?fields=media_url&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[graphClient] fetchMediaUrl failed (${res.status}): ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as { media_url?: string };
  return data.media_url ?? null;
}

export { fetchMediaUrl };

export async function refreshLongLivedToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresInSeconds: number } | null> {
  const url = `${BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[graphClient] token refresh failed (${res.status}): ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in ?? 60 * 24 * 60 * 60 };
}
