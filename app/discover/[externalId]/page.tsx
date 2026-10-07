import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { collectionEntries, items } from "@/db/schema";
import { requireUserId } from "@/lib/auth/session";
import { getMoviesBot } from "@/db/queries/bots";
import { tmdbProvider } from "@/lib/providers/tmdb";
import Header from "@/components/layout/Header";
import SubmitButton from "@/components/SubmitButton";
import TrailerPreview from "@/components/movie/TrailerPreview";
import WatchProviders from "@/components/movie/WatchProviders";
import { addAndGo } from "./actions";

export const dynamic = "force-dynamic";

interface ItemMetadata {
  genres?: string[];
  year?: string;
  type?: string;
  trailerUrl?: string | null;
  overview?: string;
  runtime?: number | null;
  rating?: number | null;
  director?: string | null;
  cast?: string[];
  imdbId?: string | null;
  watchProviders?: {
    region: string;
    providers: { name: string; logoUrl: string | null; type: "flatrate" | "rent" | "buy" }[];
    link: string;
  } | null;
}

const PILL = "rounded-full bg-[#212529]/75 px-3 py-1 text-xl font-medium text-white";
const LABEL = "mt-4 text-xl font-medium text-white/50 uppercase";

export default async function DiscoverPreviewPage({
  params,
}: {
  params: Promise<{ externalId: string }>;
}) {
  const { externalId } = await params;
  const userId = await requireUserId();
  const bot = await getMoviesBot();

  let itemData;
  try {
    itemData = await tmdbProvider.getById(decodeURIComponent(externalId));
  } catch {
    notFound();
  }

  const existingItem = await db.query.items.findFirst({
    where: and(eq(items.botId, bot.id), eq(items.externalId, itemData.externalId)),
  });
  const existingEntry = existingItem
    ? await db.query.collectionEntries.findFirst({
        where: and(eq(collectionEntries.userId, userId), eq(collectionEntries.itemId, existingItem.id)),
      })
    : null;

  const metadata = itemData.metadata as ItemMetadata;
  const heroImage = itemData.bannerUrl ?? itemData.coverImageUrl ?? null;

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-fixed"
      style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
    >
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.568)]" />

      <div className="relative">
        <Header transparent />

        <main className="grid min-h-screen gap-1 px-4 py-12 md:grid-cols-12 md:px-6">
          <div className="flex flex-col justify-center gap-1 md:col-span-7 md:py-12 md:pl-8">
            <div className="flex w-full max-w-[700px] flex-col gap-1">
              <h1 className="text-[2rem] font-bold text-white md:text-[3.5rem]">{itemData.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-6">
                {metadata.runtime && <p className="text-xl font-semibold text-white">{metadata.runtime} min</p>}
                {metadata.year && <p className="text-xl font-semibold text-white">{metadata.year}</p>}
                {metadata.rating && (
                  <p className="flex items-center gap-2 text-xl font-semibold text-white">
                    {metadata.rating}{" "}
                    <span className="rounded bg-[#ffc107] px-2 py-0.5 text-base font-semibold text-black">
                      IMDb
                    </span>
                  </p>
                )}
              </div>

              {metadata.genres && metadata.genres.length > 0 && (
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

              {metadata.director && (
                <>
                  <h5 className={LABEL}>Director</h5>
                  <div className="mb-2 flex">
                    <span className={PILL}>{metadata.director}</span>
                  </div>
                </>
              )}

              {metadata.cast && metadata.cast.length > 0 && (
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

              {metadata.overview && (
                <>
                  <h5 className={LABEL}>Summary</h5>
                  <p className="mb-2 text-xl font-light text-white">{metadata.overview}</p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 px-0 md:col-span-5 md:ml-auto md:w-full md:max-w-[700px] md:pt-12">
            <div className="flex flex-wrap items-center gap-3">
              {existingEntry ? (
                <Link
                  href={`/movie/${existingEntry.id}`}
                  className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                >
                  Already in your list — View
                </Link>
              ) : (
                <form action={addAndGo.bind(null, itemData.externalId)}>
                  <SubmitButton>Add to list</SubmitButton>
                </form>
              )}
            </div>

            {(metadata.watchProviders?.providers.length || metadata.imdbId) && (
              <div className="mt-6">
                <h5 className="mb-2 text-xl font-medium text-white">Where to watch</h5>
                <WatchProviders
                  watchProviders={metadata.watchProviders}
                  imdbId={metadata.imdbId}
                  type={metadata.type}
                />
              </div>
            )}

            {metadata.trailerUrl && (
              <div className="mt-6">
                <h5 className="mb-2 text-xl font-medium text-white">Trailer</h5>
                <TrailerPreview trailerUrl={metadata.trailerUrl} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
