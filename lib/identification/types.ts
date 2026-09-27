import type { ProviderCandidate } from "@/lib/providers/types";

export interface PipelineContext {
  reelId: string;
  userText: string | null;
  caption: string | null;
}

export interface StepResult {
  source: "user_text" | "caption" | "video" | "location_tag" | "user_reply";
  candidates: ProviderCandidate[];
}

export type IdentificationStep = (ctx: PipelineContext) => Promise<StepResult | null>;

export interface IdentificationStrategy {
  steps: IdentificationStep[];
}
