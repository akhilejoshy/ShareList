import { tmdbProvider } from "@/lib/providers/tmdb";
import { env } from "@/lib/env";
import { extractMovieWithGemini } from "./gemini";
import { stepVideo } from "./video";
import type { IdentificationStrategy, PipelineContext, StepResult } from "./types";

async function stepUserText(
  ctx: PipelineContext,
  logs: string[],
): Promise<StepResult | null> {
  if (!ctx.userText) return null;

  logs.push(`[Step: User Text] Searching TMDB directly for: "${ctx.userText}"`);
  const candidates = await tmdbProvider.search(ctx.userText);
  if (candidates.length === 0) {
    logs.push(`[Step: User Text] No TMDB results found for "${ctx.userText}"`);
    return null;
  }

  logs.push(`[Step: User Text] Found ${candidates.length} candidate(s) for "${ctx.userText}"`);
  return {
    source: "user_text",
    candidates,
    method: "User DM Text",
    extractedQuery: ctx.userText,
    details: `User typed "${ctx.userText}" directly in DM`,
  };
}

// Regex patterns for heuristic extraction when Gemini is not configured
const TITLE_YEAR_LINE = /([\p{L}\p{N}][\p{L}\p{N}\s'’:,.\-&!?]{1,58}?)\s*\((\d{4})\)/u;
const IS_A_MOVIE_LINE =
  /^([A-Za-z0-9][a-zA-Z0-9\s'’:-]{1,35}?)\s+(?:is an?|is the)\s+(?:[A-Za-z]+\s+)*(?:movie|film|thriller|drama|comedy|action|sci-fi|horror|series)/iu;
const STREAMING_LINE =
  /^([A-Za-z0-9][a-zA-Z0-9\s'’:-]{1,35}?)\s+(?:now streaming|streaming on|in theatres|now in cinemas|releasing on)/iu;
const PREFIX_LINE =
  /(?:🎬|🎥|Movie|Film|Title)\s*[:•\-]?\s*([A-Za-z0-9][a-zA-Z0-9\s'’:,.\-&!?]{1,40})/iu;

const GENERIC_HASHTAGS =
  /^(movies?|films?|cinema|movieclips?|reels?|viral|explore(?:page)?|trending|hollywood|bollywood|mollywood|tollywood|kollywood|malayalamcinema|tamilcinema|hindicinema|telugucinema|kannadacinema|indiancinema|instareels?|foryou|fyp|shorts?|post|scene|clip|acting|theatre)$/i;

async function stepCaption(
  ctx: PipelineContext,
  logs: string[],
): Promise<StepResult | null> {
  if (!ctx.caption) {
    logs.push("[Step: Caption] No caption found on post/reel");
    return null;
  }

  // 1. Try Gemini AI if API key is provided
  const hasGeminiKey = Boolean(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY);
  if (hasGeminiKey) {
    try {
      logs.push("[AI: Gemini] Analyzing caption with Gemini Flash...");
      const geminiResult = await extractMovieWithGemini(ctx.caption);
      if (geminiResult?.title) {
        logs.push(
          `[AI: Gemini] Extracted: "${geminiResult.title}" (year: ${geminiResult.year ?? "N/A"})`,
        );
        const candidates = await tmdbProvider.search(geminiResult.title, {
          year: geminiResult.year,
        });
        if (candidates.length > 0) {
          logs.push(`[AI: Gemini] Found ${candidates.length} TMDB candidate(s) for "${geminiResult.title}"`);
          return {
            source: "caption",
            candidates,
            method: "Gemini AI",
            extractedQuery: geminiResult.title,
            details: `Gemini AI extracted title="${geminiResult.title}", year="${geminiResult.year ?? "N/A"}"`,
          };
        } else {
          logs.push(`[AI: Gemini] No TMDB results for AI title "${geminiResult.title}"`);
        }
      } else {
        logs.push("[AI: Gemini] No movie title identified by AI");
      }
    } catch (err) {
      logs.push(`[AI: Gemini] Error: ${(err as Error).message}`);
    }
  } else {
    logs.push("[AI: Gemini] Skipped (GEMINI_API_KEY not configured in .env.local)");
  }

  const lines = ctx.caption
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // 2. High-precision heuristic: "Title (Year)" on any line (e.g. "Magic Mushrooms(2026)", "Titanium (2014)")
  for (const line of lines) {
    const match = line.match(TITLE_YEAR_LINE);
    if (!match) continue;

    const title = match[1].trim();
    const year = match[2]?.trim();
    if (!title || title.length > 60) continue;

    logs.push(`[Heuristic: Title (Year)] Matched "${title}" (${year}) on line: "${line}"`);
    const candidates = await tmdbProvider.search(title, { year });
    if (candidates.length > 0) {
      logs.push(`[Heuristic: Title (Year)] Found ${candidates.length} TMDB match(es) for "${title}" (${year})`);
      return {
        source: "caption",
        candidates,
        method: "Title (Year) Pattern",
        extractedQuery: `${title} (${year})`,
        details: `Matched line: "${line}"`,
      };
    }
  }

  // 3. First-line header heuristic: e.g. "Karakkam 👻 | Part |61" -> "Karakkam"
  if (lines.length > 0) {
    const firstLine = lines[0];
    const cleanedHeader = firstLine
      .replace(/\|\s*part\s*\|?\s*\d+/i, "")
      .replace(/[^\p{L}\p{N}\s'’:-]/gu, "")
      .trim();

    if (cleanedHeader.length >= 2 && cleanedHeader.length <= 40) {
      logs.push(`[Heuristic: Header Line] Cleaned raw line "${firstLine}" -> "${cleanedHeader}"`);
      const candidates = await tmdbProvider.search(cleanedHeader);
      if (candidates.length > 0) {
        logs.push(`[Heuristic: Header Line] Found ${candidates.length} TMDB match(es) for "${cleanedHeader}"`);
        return {
          source: "caption",
          candidates,
          method: "Header Title Cleaning",
          extractedQuery: cleanedHeader,
          details: `Raw line "${firstLine}" cleaned to "${cleanedHeader}"`,
        };
      }
    }
  }

  // 4. Line-by-line narrative heuristics: e.g. "Karakkam is a Malayalam...", "Unmadham Now Streaming..."
  for (const line of lines) {
    const isMovieMatch = line.match(IS_A_MOVIE_LINE);
    const streamingMatch = line.match(STREAMING_LINE);
    const prefixMatch = line.match(PREFIX_LINE);

    const m = isMovieMatch || streamingMatch || prefixMatch;
    if (!m) continue;

    const title = m[1].replace(/^[^\w]+/, "").trim();
    if (title.length >= 2 && title.length <= 40) {
      logs.push(`[Heuristic: Narrative Line] Matched phrase in line: "${line.slice(0, 60)}..." -> "${title}"`);
      const candidates = await tmdbProvider.search(title);
      if (candidates.length > 0) {
        logs.push(`[Heuristic: Narrative Line] Found ${candidates.length} TMDB match(es) for "${title}"`);
        return {
          source: "caption",
          candidates,
          method: "Narrative Sentence Pattern",
          extractedQuery: title,
          details: `Matched line: "${line}"`,
        };
      }
    }
  }

  // 5. Hashtag heuristics: scan hashtags for title matches (excluding generic words & tags)
  const COMMON_NON_MOVIE_WORDS = /^(fun|food|friends?|love|cute|happy|life|music|style|nature|travel|fitness|workout|photo|photography|party|morning|night|today|me|selfie|family|dog|cat|art|vlog|follow|like|subscribe|trending|viral|reels?|shorts?|post)$/i;
  const hashtags = ctx.caption.match(/#(\w{3,30})/g);
  if (hashtags) {
    for (const tag of hashtags.slice(0, 5)) {
      const candidateName = tag.replace(/^#/, "").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
      if (GENERIC_HASHTAGS.test(candidateName) || COMMON_NON_MOVIE_WORDS.test(candidateName)) {
        continue;
      }
      // Require either multi-word (PascalCase/spaces), containing digits, or at least 5 chars to avoid short dictionary words
      const isQualifiedTag =
        candidateName.includes(" ") ||
        /\d/.test(tag) ||
        /_/.test(tag) ||
        candidateName.length >= 6;

      if (!isQualifiedTag) {
        continue;
      }

      logs.push(`[Heuristic: Hashtags] Checking candidate tag: #${tag} ("${candidateName}")`);
      const candidates = await tmdbProvider.search(candidateName);
      if (candidates.length > 0) {
        logs.push(`[Heuristic: Hashtags] Found ${candidates.length} TMDB match(es) for tag #${tag} ("${candidateName}")`);
        return {
          source: "caption",
          candidates,
          method: "Hashtag Extraction",
          extractedQuery: candidateName,
          details: `Extracted from hashtag #${tag}`,
        };
      }
    }
  }

  logs.push("[Heuristic] No movie could be identified from caption heuristics");
  return null;
}

export const moviesStrategy: IdentificationStrategy = {
  steps: [stepUserText, stepCaption, stepVideo],
};
