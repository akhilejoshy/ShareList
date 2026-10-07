import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { collectionEntries, items, reels } from "@/db/schema";
import { requireUserId } from "@/lib/auth/session";
import { tmdbProvider } from "@/lib/providers/tmdb";
import { CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { toggleVisited, deleteEntry, swapItem } from "./actions";
import SwapSearch from "./SwapSearch";
import Header from "@/components/layout/Header";
import SubmitButton from "@/components/SubmitButton";
import TrailerPreview from "@/components/movie/TrailerPreview";
import WatchProviders from "@/components/movie/WatchProviders";

interface WatchProvider {
  name: string;
  logoUrl: string | null;
  type: "flatrate" | "rent" | "buy";
}

interface ItemMetadata {
  genres?: string[];
  year?: string;
  language?: string;
  type?: string;
  trailerUrl?: string | null;
  overview?: string;
  numberOfSeasons?: number;
  runtime?: number | null;
  rating?: number | null;
  director?: string | null;
  cast?: string[];
  imdbId?: string | null;
  watchProviders?: { region: string; providers: WatchProvider[]; link: string } | null;
}

export const dynamic = "force-dynamic";

// Matches MovieRev's `.rounded-pill.bg-dark.opacity-75` used for every genre/director/
// cast/action pill on the detail page — same dark-grey-at-75%-opacity pill everywhere.
const PILL = "rounded-full bg-[#212529]/75 px-3 py-1 text-xl font-medium text-white";
const LABEL = "mt-4 text-xl font-medium text-white/50 uppercase";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const userId = await requireUserId();

  const entry = await db.query.collectionEntries.findFirst({
    where: eq(collectionEntries.id, entryId),
  });
  if (!entry || entry.userId !== userId) notFound();

  let item = entry.itemId
    ? await db.query.items.findFirst({ where: eq(items.id, entry.itemId) })
    : null;

  // Items saved before cast/director/runtime/rating/watch-providers were added to the
  // TMDB provider are missing those fields in their stored `metadata` — backfill once.
  if (item && !("watchProviders" in (item.metadata as object))) {
    try {
      const fresh = await tmdbProvider.getById(item.externalId);
      const [updated] = await db
        .update(items)
        .set({
          title: fresh.title,
          coverImageUrl: fresh.coverImageUrl,
          bannerUrl: fresh.bannerUrl,
          metadata: fresh.metadata,
        })
        .where(eq(items.id, item.id))
        .returning();
      item = updated;
    } catch (err) {
      console.error(`[movie detail] metadata backfill failed for item ${item.id}:`, err);
    }
  }

  const linkedReels = await db.query.reels.findMany({ where: eq(reels.entryId, entryId) });

  const metadata = (item?.metadata as ItemMetadata | null) ?? null;

  const heroImage = item?.bannerUrl ?? item?.coverImageUrl ?? null;

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-fixed"
      style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
    >
      {/* MovieRev's `.overlay`: rgba(0,0,0,.568) scrim over the backdrop */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.568)]" />

      <div className="relative">
        <Header transparent />

        <main className="grid min-h-screen gap-1 px-4 py-12 md:grid-cols-12 md:px-6">
          {/* Left column: col-md-7, vertically centered, gap-1 flex column like the reference */}
          <div className="flex flex-col justify-center gap-1 md:col-span-7 md:py-12 md:pl-8">
            <div className="flex w-full max-w-[700px] flex-col gap-1">
              <h1 className="text-[2rem] font-bold text-white md:text-[3.5rem]">
                {item ? item.title : "Unidentified reel"}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-6">
                {metadata?.runtime && (
                  <p className="text-xl font-semibold text-white">{metadata.runtime} min</p>
                )}
                {metadata?.year && <p className="text-xl font-semibold text-white">{metadata.year}</p>}
                {metadata?.rating && (
                  <p className="flex items-center gap-2 text-xl font-semibold text-white">
                    {metadata.rating}{" "}
                    <span className="rounded bg-[#ffc107] px-2 py-0.5 text-base font-semibold text-black">
                      IMDb
                    </span>
                  </p>
                )}
              </div>

              {metadata?.genres && metadata.genres.length > 0 && (
                <>
                  <h5 className={LABEL}>Genres</h5>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {metadata.genres.map((g) => (
                      <span key={g} className={PILL}>
                        {g}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {metadata?.director && (
                <>
                  <h5 className={LABEL}>Director</h5>
                  <div className="mb-2 flex">
                    <span className={PILL}>{metadata.director}</span>
                  </div>
                </>
              )}

              {metadata?.cast && metadata.cast.length > 0 && (
                <>
                  <h5 className={LABEL}>Cast</h5>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {metadata.cast.map((c) => (
                      <span key={c} className={PILL}>
                        {c}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {metadata?.overview && (
                <>
                  <h5 className={LABEL}>Summary</h5>
                  <p className="mb-2 text-xl font-light text-white">{metadata.overview}</p>
                </>
              )}
            </div>
          </div>

          {/* Right column: col-md-5, ms-auto, no card/box — plain like the reference's comment column */}
          <div className="flex flex-col gap-1 px-0 md:col-span-5 md:ml-auto md:w-full md:max-w-[700px] md:pt-12">
            <div className="flex flex-wrap items-center gap-3">
              {item && (
                <form action={toggleVisited.bind(null, entryId)}>
                  <SubmitButton variant={entry.visited ? "secondary" : "default"}>
                    <CheckCircle2 />
                    {entry.visited ? "Watched" : "Mark as watched"}
                  </SubmitButton>
                </form>
              )}
              <form action={deleteEntry.bind(null, entryId)}>
                <SubmitButton
                  variant="destructive"
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  <Trash2 />
                  Remove from my list
                </SubmitButton>
              </form>
              <SwapSearch entryId={entryId} onSwap={swapItem} />
            </div>

            {(metadata?.watchProviders?.providers.length || metadata?.imdbId) && (
              <div className="mt-6">
                <h5 className="mb-2 text-xl font-medium text-white">Where to watch</h5>
                <WatchProviders
                  watchProviders={metadata?.watchProviders}
                  imdbId={metadata?.imdbId}
                  type={metadata?.type}
                />
              </div>
            )}

            {metadata?.trailerUrl && (
              <div className="mt-6">
                <h5 className="mb-2 text-xl font-medium text-white">Trailer</h5>
                <TrailerPreview trailerUrl={metadata.trailerUrl} />
              </div>
            )}

            {linkedReels.length > 0 && (
              <div className="mt-6">
                <h5 className="mb-2 text-xl font-medium text-white">Original post(s)</h5>
                <div className="flex flex-wrap gap-3">
                  {linkedReels.map((r) =>
                    r.permalink ? (
                      <a
                        key={r.id}
                        href={r.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square w-32 overflow-hidden rounded-lg bg-card"
                      >
                        {r.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.thumbnailUrl}
                            alt="Original Instagram post"
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            Instagram post
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                          <ExternalLink className="h-5 w-5 text-white" />
                        </div>
                      </a>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
