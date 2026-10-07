import {
  sendText as graphSendText,
  sendQuickReplies as graphSendQuickReplies,
  sendGenericTemplate as graphSendGenericTemplate,
  type QuickReply,
  type CardElement,
} from "@/lib/meta/graphClient";

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

export async function sendBotQuickReplies(
  igBusinessId: string,
  accessToken: string,
  recipientId: string,
  text: string,
  quickReplies: QuickReply[],
) {
  try {
    await graphSendQuickReplies(igBusinessId, accessToken, recipientId, text, quickReplies);
  } catch (err) {
    console.error("[bot/send] failed to send quick replies", err);
  }
}

export async function sendBotCards(
  igBusinessId: string,
  accessToken: string,
  recipientId: string,
  elements: CardElement[],
) {
  try {
    await graphSendGenericTemplate(igBusinessId, accessToken, recipientId, elements);
  } catch (err) {
    console.error("[bot/send] failed to send card carousel", err);
  }
}
