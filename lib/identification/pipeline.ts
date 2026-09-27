import { moviesStrategy } from "./movies";
import type { IdentificationStrategy, PipelineContext, StepResult } from "./types";

const STRATEGIES: Record<string, IdentificationStrategy> = {
  movies: moviesStrategy,
};

export interface PipelineOutcome {
  result: StepResult | null;
}

export async function runPipeline(botSlug: string, ctx: PipelineContext): Promise<PipelineOutcome> {
  const strategy = STRATEGIES[botSlug];
  if (!strategy) return { result: null };

  for (const step of strategy.steps) {
    const result = await step(ctx);
    if (result && result.candidates.length > 0) {
      return { result };
    }
  }
  return { result: null };
}
