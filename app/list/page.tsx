import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { collectionEntries, items } from "@/db/schema";
import { requireUserId } from "@/lib/auth/session";
import { filterEntries, listLanguages, normalizeEntry } from "@/lib/entries/group";
import Header from "@/components/layout/Header";
import { PosterCard } from "@/components/PosterCard";
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

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; language?: string }>;
}) {
  const userId = await requireUserId();
  const { type, language } = await searchParams;

  const rawEntries = await getEntries(userId);
  const normalized = rawEntries.map(normalizeEntry);
  const languages = listLanguages(normalized);
  const filtered = filterEntries(normalized, { type, language });

  const title =
    type === "movie" ? "Movies" : type === "series" ? "Series" : "All titles";

  const buildHref = (overrides: { type?: string; language?: string }) => {
    const merged = { type, language, ...overrides };
    const params = new URLSearchParams();
    if (merged.type) params.set("type", merged.type);
    if (merged.language) params.set("language", merged.language);
    const qs = params.toString();
    return qs ? `/list?${qs}` : "/list";
  };

  const filterGroups = [
    {
      label: "Type",
      options: [
        { label: "All", href: buildHref({ type: undefined }), active: !type },
        { label: "Movies", href: buildHref({ type: "movie" }), active: type === "movie" },
        { label: "Series", href: buildHref({ type: "series" }), active: type === "series" },
      ],
    },
    {
      label: "Language",
      options: [
        { label: "All", href: buildHref({ language: undefined }), active: !language },
        ...languages.map((l) => ({
          label: l,
          href: buildHref({ language: l }),
          active: language === l,
        })),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full px-4 py-6 md:px-6">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {title}
            {language ? ` — ${language}` : ""}{" "}
            <span className="text-lg font-normal text-muted-foreground">({filtered.length})</span>
          </h1>
          <FilterPopover groups={filterGroups} activeCount={(type ? 1 : 0) + (language ? 1 : 0)} />
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map((e) => (
              <PosterCard key={e.entryId} entry={e} className="w-full" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
