import { moviesStrategy } from "./movies";
import type { IdentificationStrategy, PipelineContext, StepResult } from "./types";

const STRATEGIES: Record<string, IdentificationStrategy> = {
  movies: moviesStrategy,
};

export interface PipelineOutcome {
  result: StepResult | null;
  pipelineLogs: string[];
}

export async function runPipeline(botSlug: string, ctx: PipelineContext): Promise<PipelineOutcome> {
  const strategy = STRATEGIES[botSlug];
  const pipelineLogs: string[] = [];

  if (!strategy) {
    pipelineLogs.push(`No strategy configured for bot: "${botSlug}"`);
    return { result: null, pipelineLogs };
  }

  for (const step of strategy.steps) {
    const result = await step(ctx, pipelineLogs);
    if (result && result.candidates.length > 0) {
      return { result, pipelineLogs };
    }
  }

  return { result: null, pipelineLogs };
}
