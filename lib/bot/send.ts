import { sendText as graphSendText } from "@/lib/meta/graphClient";

export async function sendBotText(
  igBusinessId: string,
  accessToken: string,
  recipientId: string,
  text: string,
) {
  try {
    await graphSendText(igBusinessId, accessToken, recipientId, text);
  } catch (err) {
    console.error("[bot/send] failed to send message", err);
  }
}
