import { tmdbProvider } from "@/lib/providers/tmdb";
import { fetchMediaUrl } from "@/lib/meta/graphClient";
import { extractMovieFromVideo } from "./gemini";
import type { IdentificationStep } from "./types";

const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // keep inline Gemini payloads small

// Best-effort: Instagram's Graph API generally only exposes media_url for
// content the connected business account itself owns, not arbitrary posts a
// user shared via DM. This step is expected to fail for most third-party
// reels and falls through gracefully when it does — it is not a reliable
// path, just an extra attempt before asking the user directly.
export const stepVideo: IdentificationStep = async (ctx, logs) => {
  if (!ctx.mediaId || !ctx.accessToken) {
    logs.push("[Step: Video] Skipped (no media id / access token available)");
    return null;
  }

  try {
    const mediaUrl = await fetchMediaUrl(ctx.accessToken, ctx.mediaId);
    if (!mediaUrl) {
      logs.push("[Step: Video] Could not resolve a media_url for this reel");
      return null;
    }

    const res = await fetch(mediaUrl);
    if (!res.ok) {
      logs.push(`[Step: Video] Failed to download video (${res.status})`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_VIDEO_BYTES) {
      logs.push(`[Step: Video] Video too large (${buffer.byteLength} bytes), skipping`);
      return null;
    }

    const mimeType = res.headers.get("content-type") ?? "video/mp4";
    const base64 = Buffer.from(buffer).toString("base64");

    logs.push("[Step: Video] Sending video to Gemini for analysis...");
    const extracted = await extractMovieFromVideo(base64, mimeType);
    if (!extracted?.title) {
      logs.push("[Step: Video] Gemini could not identify a title from the video");
      return null;
    }

    logs.push(`[Step: Video] Gemini extracted: "${extracted.title}" (year: ${extracted.year ?? "N/A"})`);
    const candidates = await tmdbProvider.search(extracted.title, { year: extracted.year });
    if (candidates.length === 0) {
      logs.push(`[Step: Video] No TMDB results for "${extracted.title}"`);
      return null;
    }

    return {
      source: "video",
      candidates,
      method: "Gemini Video Analysis",
      extractedQuery: extracted.title,
      details: "Identified from on-screen/spoken content in the shared video",
    };
  } catch (err) {
    logs.push(`[Step: Video] Error: ${(err as Error).message}`);
    return null;
  }
};
