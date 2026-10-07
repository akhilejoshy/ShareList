import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { collectionEntries, igLinks, items, reels } from "@/db/schema";
import { getMoviesBot } from "@/db/queries/bots";
import { requireUserId } from "@/lib/auth/session";
import { groupByTypeAndLanguage, normalizeEntry } from "@/lib/entries/group";
import Header from "@/components/layout/Header";
import HorizontalRow from "@/components/layout/HorizontalRow";
import { UnknownPosterCard } from "@/components/PosterCard";
import { Card } from "@/components/ui/card";
import FilterPopover from "@/components/filters/FilterPopover";

export const dynamic = "force-dynamic";

async function getEntries(userId: string) {
  return db
    .select({
      entryId: collectionEntries.id,
      title: items.title,
      coverImageUrl: items.coverImageUrl,
      metadata: items.metadata,
      visited: collectionEntries.visited,
    })
    .from(collectionEntries)
    .innerJoin(items, eq(collectionEntries.itemId, items.id))
    .where(and(eq(collectionEntries.userId, userId), isNotNull(collectionEntries.itemId)))
    .orderBy(desc(collectionEntries.addedAt));
}

async function getUnknownEntries(userId: string) {
  const rows = await db
    .select({
      entryId: collectionEntries.id,
      permalink: reels.permalink,
      thumbnailUrl: reels.thumbnailUrl,
    })
    .from(collectionEntries)
    .leftJoin(reels, eq(reels.entryId, collectionEntries.id))
    .where(and(eq(collectionEntries.userId, userId), isNull(collectionEntries.itemId)))
    .orderBy(desc(collectionEntries.addedAt));

  // De-dupe: multiple reels can point at one Unknown entry.
  const seen = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!seen.has(r.entryId)) seen.set(r.entryId, r);
  return [...seen.values()];
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; watched?: string }>;
}) {
  const userId = await requireUserId();
  const bot = await getMoviesBot();
  const { genre, watched } = await searchParams;

  const isLinked = await db.query.igLinks.findFirst({
    where: and(eq(igLinks.userId, userId), eq(igLinks.botId, bot.id)),
  });

  const allEntries = isLinked ? await getEntries(userId) : [];
  const unknownEntries = isLinked ? await getUnknownEntries(userId) : [];

  const genres = [
    ...new Set(
      allEntries.flatMap((e) => (e.metadata as { genres?: string[] } | null)?.genres ?? []),
    ),
  ].sort();

  const filtered = allEntries.filter((e) => {
    const g = (e.metadata as { genres?: string[] } | null)?.genres ?? [];
    if (genre && !g.includes(genre)) return false;
    if (watched === "yes" && !e.visited) return false;
    if (watched === "no" && e.visited) return false;
    return true;
  });

  const normalized = filtered.map(normalizeEntry);
  const sections = groupByTypeAndLanguage(normalized);

  const query = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { genre, watched, ...overrides };
    if (merged.genre) params.set("genre", merged.genre);
    if (merged.watched) params.set("watched", merged.watched);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const filterGroups = [
    {
      label: "Genre",
      options: [
        { label: "All", href: query({ genre: undefined }), active: !genre },
        ...genres.map((g) => ({ label: g, href: query({ genre: g }), active: genre === g })),
      ],
    },
    {
      label: "Watched",
      options: [
        { label: "All", href: query({ watched: undefined }), active: !watched },
        { label: "Watched", href: query({ watched: "yes" }), active: watched === "yes" },
        { label: "Unwatched", href: query({ watched: "no" }), active: watched === "no" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full px-4 py-6 md:px-6">
        {!isLinked ? (
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="text-lg font-semibold text-foreground">Link your Instagram</h2>
            <p className="text-sm text-muted-foreground">
              Your account isn&apos;t linked to Instagram yet.{" "}
              <Link href="/link" className="text-primary underline">
                Link it here
              </Link>{" "}
              to start saving reels.
            </p>
          </Card>
        ) : (
          <>
            {genres.length > 0 && (
              <div className="mb-8">
                <FilterPopover
                  groups={filterGroups}
                  activeCount={(genre ? 1 : 0) + (watched ? 1 : 0)}
                />
              </div>
            )}

            {normalized.length === 0 && unknownEntries.length === 0 ? (
              <p className="text-muted-foreground">
                Nothing saved yet. Share a reel to @share__list to see it appear here.
              </p>
            ) : (
              <div className="flex flex-col gap-10">
                {unknownEntries.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-xl font-bold text-foreground">
                      Unidentified <span className="text-base font-normal text-muted-foreground">({unknownEntries.length})</span>
                    </h3>
                    <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                      {unknownEntries.map((e) => (
                        <UnknownPosterCard
                          key={e.entryId}
                          entryId={e.entryId}
                          thumbnailUrl={e.thumbnailUrl}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sections.map((section) => (
                  <div key={section.type} className="flex flex-col gap-6">
                    <h2 className="text-2xl font-bold text-foreground">{section.label}</h2>
                    {section.rows.map((row) => (
                      <HorizontalRow
                        key={row.language}
                        title={row.language}
                        entries={row.entries}
                        viewMoreHref={`/list?type=${section.type}&language=${encodeURIComponent(row.language)}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
