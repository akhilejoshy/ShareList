import { env } from "@/lib/env";
import { languageLabel } from "@/lib/entries/language";
import type { ItemData, MetadataProvider, ProviderCandidate } from "./types";

// Note: api.tmdb.org is TMDB's official endpoint that avoids ISP-level SNI blocks in regions like India
const BASE_URLS = [
  process.env.TMDB_BASE_URL || "https://api.tmdb.org/3",
  "https://api.themoviedb.org/3",
];
const IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TmdbMovieResult {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  genre_ids: number[];
  overview: string;
  popularity?: number;
  original_language?: string;
}

interface TmdbTvResult {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  genre_ids: number[];
  overview: string;
  popularity?: number;
  original_language?: string;
}

interface TmdbSearchResponse<T> {
  results: T[];
}

interface TmdbCredits {
  cast: { name: string; order: number }[];
  crew: { name: string; job: string }[];
}

interface TmdbWatchProviderEntry {
  provider_name: string;
  logo_path: string | null;
}

interface TmdbWatchProvidersResponse {
  results?: Record<
    string,
    {
      link: string;
      flatrate?: TmdbWatchProviderEntry[];
      rent?: TmdbWatchProviderEntry[];
      buy?: TmdbWatchProviderEntry[];
    }
  >;
}

const WATCH_REGION_PREFERENCE = ["IN", "US", "GB"];

function pickWatchProviders(watchProviders?: TmdbWatchProvidersResponse) {
  const results = watchProviders?.results;
  if (!results) return null;

  const region =
    WATCH_REGION_PREFERENCE.find((r) => results[r]) ?? Object.keys(results)[0];
  if (!region) return null;

  const entry = results[region];
  const seen = new Set<string>();
  const providers = [
    ...(entry.flatrate ?? []).map((p) => ({ ...p, type: "flatrate" as const })),
    ...(entry.rent ?? []).map((p) => ({ ...p, type: "rent" as const })),
    ...(entry.buy ?? []).map((p) => ({ ...p, type: "buy" as const })),
  ]
    .filter((p) => (seen.has(p.provider_name) ? false : (seen.add(p.provider_name), true)))
    .map((p) => ({
      name: p.provider_name,
      logoUrl: p.logo_path ? `${IMAGE_BASE}/w92${p.logo_path}` : null,
      type: p.type,
    }));

  if (providers.length === 0) return null;
  return { region, providers, link: entry.link };
}

interface TmdbMovieDetail extends TmdbMovieResult {
  genres: { id: number; name: string }[];
  videos?: { results: { site: string; type: string; key: string }[] };
  alternative_titles?: { titles: { iso_3166_1: string; title: string; type: string }[] };
  original_language: string;
  runtime?: number | null;
  vote_average?: number;
  credits?: TmdbCredits;
  imdb_id?: string | null;
  "watch/providers"?: TmdbWatchProvidersResponse;
}

interface TmdbTvDetail extends TmdbTvResult {
  genres: { id: number; name: string }[];
  videos?: { results: { site: string; type: string; key: string }[] };
  alternative_titles?: { results: { iso_3166_1: string; title: string; type: string }[] };
  original_language: string;
  number_of_seasons?: number;
  episode_run_time?: number[];
  vote_average?: number;
  credits?: TmdbCredits;
  external_ids?: { imdb_id?: string | null };
  "watch/providers"?: TmdbWatchProvidersResponse;
}

function pickDirector(credits?: TmdbCredits): string | null {
  return credits?.crew.find((c) => c.job === "Director")?.name ?? null;
}

function pickCast(credits?: TmdbCredits, count = 5): string[] {
  return (
    credits?.cast
      .slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, count)
      .map((c) => c.name) ?? []
  );
}

function movieToCandidate(r: TmdbMovieResult, matchedQuery: string): ProviderCandidate {
  return {
    externalId: String(r.id),
    title: r.title,
    coverImageUrl: r.poster_path ? `${IMAGE_BASE}/w500${r.poster_path}` : null,
    year: r.release_date ? r.release_date.slice(0, 4) : null,
    language: languageLabel(r.original_language),
    extra: { matchedQuery, mediaType: "movie", popularity: r.popularity ?? 0 },
  };
}

function tvToCandidate(r: TmdbTvResult, matchedQuery: string): ProviderCandidate {
  return {
    externalId: `tv:${r.id}`,
    title: r.name,
    coverImageUrl: r.poster_path ? `${IMAGE_BASE}/w500${r.poster_path}` : null,
    year: r.first_air_date ? r.first_air_date.slice(0, 4) : null,
    language: languageLabel(r.original_language),
    extra: { matchedQuery, mediaType: "tv", popularity: r.popularity ?? 0 },
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
    const [movieData, tvData] = await Promise.all([
      tmdbFetch<TmdbSearchResponse<TmdbMovieResult>>("/search/movie", {
        query,
        year: options?.year ?? "",
      }),
      tmdbFetch<TmdbSearchResponse<TmdbTvResult>>("/search/tv", {
        query,
        first_air_date_year: options?.year ?? "",
      }),
    ]);

    let movieResults = movieData.results;
    let tvResults = tvData.results;

    // If a year was given but filtered everything out, retry without it.
    if (movieResults.length === 0 && tvResults.length === 0 && options?.year) {
      const [relaxedMovie, relaxedTv] = await Promise.all([
        tmdbFetch<TmdbSearchResponse<TmdbMovieResult>>("/search/movie", { query }),
        tmdbFetch<TmdbSearchResponse<TmdbTvResult>>("/search/tv", { query }),
      ]);
      movieResults = relaxedMovie.results;
      tvResults = relaxedTv.results;
    }

    const combined: ProviderCandidate[] = [
      ...movieResults.map((r) => movieToCandidate(r, query)),
      ...tvResults.map((r) => tvToCandidate(r, query)),
    ];

    combined.sort(
      (a, b) => ((b.extra?.popularity as number) ?? 0) - ((a.extra?.popularity as number) ?? 0),
    );

    return combined.slice(0, 5);
  },

  async getById(externalId: string): Promise<ItemData> {
    const isTv = externalId.startsWith("tv:");
    const id = isTv ? externalId.slice(3) : externalId;

    if (isTv) {
      const detail = await tmdbFetch<TmdbTvDetail>(`/tv/${id}`, {
        append_to_response: "videos,alternative_titles,credits,external_ids,watch/providers",
      });
      const trailer = detail.videos?.results.find(
        (v) => v.site === "YouTube" && v.type === "Trailer",
      );
      const alts = detail.alternative_titles?.results?.map((t) => t.title) ?? [];

      return {
        externalId: `tv:${detail.id}`,
        title: detail.name,
        coverImageUrl: detail.poster_path ? `${IMAGE_BASE}/w500${detail.poster_path}` : null,
        bannerUrl: detail.backdrop_path ? `${IMAGE_BASE}/w1280${detail.backdrop_path}` : null,
        metadata: {
          type: "series",
          genres: detail.genres.map((g) => g.name),
          year: detail.first_air_date ? detail.first_air_date.slice(0, 4) : null,
          language: detail.original_language,
          trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
          overview: detail.overview,
          alternativeTitles: alts,
          numberOfSeasons: detail.number_of_seasons ?? null,
          runtime: detail.episode_run_time?.[0] ?? null,
          rating: detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : null,
          director: pickDirector(detail.credits),
          cast: pickCast(detail.credits),
          imdbId: detail.external_ids?.imdb_id ?? null,
          watchProviders: pickWatchProviders(detail["watch/providers"]),
        },
      };
    }

    const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, {
      append_to_response: "videos,alternative_titles,credits,watch/providers",
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
        type: "movie",
        genres: detail.genres.map((g) => g.name),
        year: detail.release_date ? detail.release_date.slice(0, 4) : null,
        language: detail.original_language,
        trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
        overview: detail.overview,
        alternativeTitles: alts,
        runtime: detail.runtime ?? null,
        rating: detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : null,
        director: pickDirector(detail.credits),
        cast: pickCast(detail.credits),
        imdbId: detail.imdb_id ?? null,
        watchProviders: pickWatchProviders(detail["watch/providers"]),
      },
    };
  },

  async getTrending(): Promise<ProviderCandidate[]> {
    const [movieData, tvData] = await Promise.all([
      tmdbFetch<TmdbSearchResponse<TmdbMovieResult>>("/trending/movie/week"),
      tmdbFetch<TmdbSearchResponse<TmdbTvResult>>("/trending/tv/week"),
    ]);

    const combined: ProviderCandidate[] = [
      ...movieData.results.map((r) => movieToCandidate(r, "")),
      ...tvData.results.map((r) => tvToCandidate(r, "")),
    ];

    combined.sort(
      (a, b) => ((b.extra?.popularity as number) ?? 0) - ((a.extra?.popularity as number) ?? 0),
    );

    return combined.slice(0, 24);
  },
};
