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
  sender?: { id: string };
  recipient?: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    attachments?: IgAttachment[];
    quick_reply?: { payload: string };
  };
  postback?: {
    mid: string;
    payload: string;
  };
  read?: {
    mid?: string;
    watermark?: number;
  };
  delivery?: {
    mids?: string[];
    watermark?: number;
  };
}

export interface IgMessageReceivedEvent extends IgMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
}

export interface IgAttachment {
  type: string; // 'share' | 'ig_reel' | 'image' | 'video' | ...
  payload: {
    url?: string;
    title?: string;
    reel_video_id?: string;
  };
}
