import { env } from "@/lib/env";
import type { ItemData, MetadataProvider, ProviderCandidate } from "./types";

// Note: api.tmdb.org is TMDB's official endpoint that avoids ISP-level SNI blocks in regions like India
const BASE_URLS = [
  process.env.TMDB_BASE_URL || "https://api.tmdb.org/3",
  "https://api.themoviedb.org/3",
];
const IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TmdbSearchResult {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  genre_ids: number[];
  overview: string;
}

interface TmdbSearchResponse {
  results: TmdbSearchResult[];
}

interface TmdbMovieDetail extends TmdbSearchResult {
  genres: { id: number; name: string }[];
  videos?: { results: { site: string; type: string; key: string }[] };
  alternative_titles?: { titles: { iso_3166_1: string; title: string; type: string }[] };
  original_language: string;
}

function toCandidate(r: TmdbSearchResult): ProviderCandidate {
  return {
    externalId: String(r.id),
    title: r.title,
    coverImageUrl: r.poster_path ? `${IMAGE_BASE}/w500${r.poster_path}` : null,
    year: r.release_date ? r.release_date.slice(0, 4) : null,
    extra: {},
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  let lastError: Error | null = null;

  for (const base of BASE_URLS) {
    try {
      const url = new URL(`${base}${path}`);
      url.searchParams.set("api_key", env.TMDB_API_KEY!);
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, v);
        }
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`TMDB request failed (${res.status}): ${await res.text()}`);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      lastError = err as Error;
      console.warn(`[tmdb] fetch attempt failed on ${base}: ${(err as Error).message}`);
    }
  }

  throw lastError ?? new Error("TMDB request failed on all endpoints");
}

export const tmdbProvider: MetadataProvider = {
  async search(query: string, options?: { year?: string }): Promise<ProviderCandidate[]> {
    const params: Record<string, string> = { query };
    if (options?.year) {
      params.year = options.year;
    }

    const data = await tmdbFetch<TmdbSearchResponse>("/search/movie", params);
    let results = data.results;

    if (results.length === 0 && options?.year) {
      const relaxed = await tmdbFetch<TmdbSearchResponse>("/search/movie", { query });
      results = relaxed.results;
    }

    return results.slice(0, 5).map((r) => ({
      ...toCandidate(r),
      extra: { matchedQuery: query },
    }));
  },

  async getById(externalId: string): Promise<ItemData> {
    const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${externalId}`, {
      append_to_response: "videos,alternative_titles",
    });
    const trailer = detail.videos?.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer",
    );
    const alts = detail.alternative_titles?.titles?.map((t) => t.title) ?? [];

    return {
      externalId: String(detail.id),
      title: detail.title,
      coverImageUrl: detail.poster_path ? `${IMAGE_BASE}/w500${detail.poster_path}` : null,
      bannerUrl: detail.backdrop_path ? `${IMAGE_BASE}/w1280${detail.backdrop_path}` : null,
      metadata: {
        genres: detail.genres.map((g) => g.name),
        year: detail.release_date ? detail.release_date.slice(0, 4) : null,
        language: detail.original_language,
        trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
        overview: detail.overview,
        alternativeTitles: alts,
      },
    };
  },
};
