import { tmdbProvider } from "@/lib/providers/tmdb";
import type { IdentificationStrategy, PipelineContext, StepResult } from "./types";

async function stepUserText(ctx: PipelineContext): Promise<StepResult | null> {
  if (!ctx.userText) return null;
  const candidates = await tmdbProvider.search(ctx.userText);
  if (candidates.length === 0) return null;
  return { source: "user_text", candidates };
}

async function stepCaption(ctx: PipelineContext): Promise<StepResult | null> {
  if (!ctx.caption) return null;
  // Anti-filler rule: only treat the caption as a title guess if it's short
  // and doesn't look like a sentence/hashtag spam. Full AI extraction (M3
  // upgrade / M5 video step) replaces this heuristic later.
  const cleaned = ctx.caption.split("\n")[0].replace(/#\w+/g, "").trim();
  if (!cleaned || cleaned.length > 60) return null;

  const candidates = await tmdbProvider.search(cleaned);
  if (candidates.length === 0) return null;
  return { source: "caption", candidates };
}

export const moviesStrategy: IdentificationStrategy = {
  steps: [stepUserText, stepCaption],
};
