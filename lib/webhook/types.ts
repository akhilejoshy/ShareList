export interface IgWebhookEntry {
  id: string; // IG business account id that received the event
  time: number;
  messaging?: IgMessagingEvent[];
}

export interface IgWebhookPayload {
  object: string;
  entry: IgWebhookEntry[];
}

export interface IgMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: IgAttachment[];
    quick_reply?: { payload: string };
  };
  postback?: {
    mid: string;
    payload: string;
  };
}

export interface IgAttachment {
  type: string; // 'share' | 'image' | 'video' | ...
  payload: {
    url?: string;
    title?: string;
  };
}
