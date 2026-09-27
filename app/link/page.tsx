import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { igLinks } from "@/db/schema";
import { getMoviesBot } from "@/db/queries/bots";
import { requireUserId } from "@/lib/auth/session";
import { generateLinkCode } from "./actions";

export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const userId = await requireUserId();
  const bot = await getMoviesBot();
  const { code } = await searchParams;

  const existingLink = await db.query.igLinks.findFirst({
    where: and(eq(igLinks.userId, userId), eq(igLinks.botId, bot.id)),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Link your Instagram
      </h1>

      {existingLink ? (
        <p className="text-green-600">✅ Your Instagram account is linked.</p>
      ) : code ? (
        <div className="flex flex-col gap-3">
          <p className="text-zinc-600 dark:text-zinc-400">
            DM this code to <strong>@sharelist_movies</strong>:
          </p>
          <p className="rounded bg-zinc-100 px-4 py-3 text-center text-2xl font-mono tracking-widest dark:bg-zinc-900">
            link {code}
          </p>
          <p className="text-xs text-zinc-500">Expires in 15 minutes.</p>
        </div>
      ) : (
        <form action={generateLinkCode}>
          <button
            type="submit"
            className="rounded bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
          >
            Generate link code
          </button>
        </form>
      )}
    </main>
  );
}
