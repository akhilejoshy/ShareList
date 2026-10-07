import type { ProviderCandidate } from "@/lib/providers/types";

export interface PipelineContext {
  reelId: string;
  userText: string | null;
  caption: string | null;
  // Only present when a video id + credentials are available, for the
  // best-effort video-analysis step. Fetching media not owned by the bot's
  // own account is not officially documented/guaranteed to work — this step
  // fails gracefully if Meta rejects the request.
  mediaId?: string | null;
  accessToken?: string | null;
}

export interface StepResult {
  source: "user_text" | "caption" | "video" | "location_tag" | "user_reply";
  candidates: ProviderCandidate[];
  method?: string;
  extractedQuery?: string;
  details?: string;
}

export interface PipelineOutcome {
  result: StepResult | null;
  pipelineLogs: string[];
}

export type IdentificationStep = (
  ctx: PipelineContext,
  logs: string[],
) => Promise<StepResult | null>;

export interface IdentificationStrategy {
  steps: IdentificationStep[];
}

