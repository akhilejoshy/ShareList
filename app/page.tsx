import { and, desc, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { collectionEntries, igLinks, items } from "@/db/schema";
import { getMoviesBot } from "@/db/queries/bots";
import { requireUserId } from "@/lib/auth/session";
import { signOut } from "@/auth";

export const dynamic = "force-dynamic";

async function getEntries(userId: string) {
  return db
    .select({
      entryId: collectionEntries.id,
      title: items.title,
      coverImageUrl: items.coverImageUrl,
      metadata: items.metadata,
    })
    .from(collectionEntries)
    .innerJoin(items, eq(collectionEntries.itemId, items.id))
    .where(and(eq(collectionEntries.userId, userId), isNotNull(collectionEntries.itemId)))
    .orderBy(desc(collectionEntries.addedAt));
}

export default async function Home() {
  const userId = await requireUserId();
  const bot = await getMoviesBot();

  const isLinked = await db.query.igLinks.findFirst({
    where: and(eq(igLinks.userId, userId), eq(igLinks.botId, bot.id)),
  });

  const entries = isLinked ? await getEntries(userId) : [];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Sharelist — Movies
        </h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm text-zinc-500 underline">
            Log out
          </button>
        </form>
      </div>

      {!isLinked ? (
        <p className="text-zinc-500">
          Your account isn&apos;t linked to Instagram yet.{" "}
          <Link href="/link" className="underline">
            Link it here
          </Link>{" "}
          to start saving reels.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-zinc-500">
          Nothing saved yet. Share a reel to @share__list to see it appear here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {entries.map((e) => {
            const year = (e.metadata as { year?: string } | null)?.year;
            return (
              <div key={e.entryId} className="flex flex-col gap-2">
                {e.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.coverImageUrl}
                    alt={e.title}
                    className="aspect-[2/3] w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-800">
                    No image
                  </div>
                )}
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  {e.title} {year ? `(${year})` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
