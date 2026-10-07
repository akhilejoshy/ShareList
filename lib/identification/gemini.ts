import { env } from "@/lib/env";

interface GeminiMovieExtraction {
  title: string | null;
  year: string | null;
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
].filter((m): m is string => Boolean(m && m.trim()));

export async function extractMovieWithGemini(
  caption: string,
): Promise<{ title: string; year?: string } | null> {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = `You are a movie identification expert. Extract the exact movie or series title and release year (if mentioned or implied) from this Instagram caption.
- The caption may have emojis attached to words (e.g. "🎬Aaram" -> title is "Aaram").
- The movie may be from any language/industry (Hollywood, Malayalam, Tamil, Hindi, Telugu, Korean, etc.).
- Ignore social media chatter, hashtags like #movies #cinema #viral, episode tags like "Part 1", and Wikipedia citations like "[1]".
- If no movie or film is mentioned (e.g. purely personal vlog or meme), return title as null.

Caption:
"""
${caption}
"""

Respond ONLY with a JSON object in this exact format:
{"title": "Movie Title or null", "year": "YYYY or null"}`;

  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        // If 503 or 404, try next candidate model
        if (res.status === 503 || res.status === 404) {
          continue;
        }
        console.warn(`[gemini] API call failed with status ${res.status}: ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      // Clean markdown code blocks if present
      rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(rawText) as GeminiMovieExtraction;
      if (parsed.title && typeof parsed.title === "string" && parsed.title.toLowerCase() !== "null") {
        return {
          title: parsed.title.trim(),
          year: parsed.year && parsed.year !== "null" ? parsed.year.trim() : undefined,
        };
      }
      return null;
    } catch (err) {
      console.warn(`[gemini] Error calling model ${model}:`, (err as Error).message);
    }
  }

  return null;
}

export async function extractMovieFromVideo(
  base64Data: string,
  mimeType: string,
): Promise<{ title: string; year?: string } | null> {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Watch this short video clip. If it shows or mentions a movie/series title (e.g. on-screen text, title card, or spoken dialogue referencing the title), identify the exact movie/series title and release year if determinable.
Respond ONLY with a JSON object: {"title": "Movie Title or null", "year": "YYYY or null"}`;

  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      });

      if (!res.ok) {
        if (res.status === 503 || res.status === 404 || res.status === 400) continue;
        console.warn(`[gemini-video] API call failed with status ${res.status}: ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(rawText) as GeminiMovieExtraction;
      if (parsed.title && typeof parsed.title === "string" && parsed.title.toLowerCase() !== "null") {
        return {
          title: parsed.title.trim(),
          year: parsed.year && parsed.year !== "null" ? parsed.year.trim() : undefined,
        };
      }
      return null;
    } catch (err) {
      console.warn(`[gemini-video] Error calling model ${model}:`, (err as Error).message);
    }
  }

  return null;
}
