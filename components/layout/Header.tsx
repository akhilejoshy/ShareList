import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { LogOut, Search } from "lucide-react";
import { cn } from "cn";
import { db } from "@/db";
import { igLinks } from "@/db/schema";
import { getMoviesBot } from "@/db/queries/bots";
import { requireUserId } from "@/lib/auth/session";
import { signOut } from "@/auth";
import LinkInstagramDialog from "./LinkInstagramDialog";

const NAV_BUTTON =
  "flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-foreground";

export default async function Header({ transparent = false }: { transparent?: boolean }) {
  const userId = await requireUserId();
  const bot = await getMoviesBot();
  const isLinked = await db.query.igLinks.findFirst({
    where: and(eq(igLinks.userId, userId), eq(igLinks.botId, bot.id)),
  });

  return (
    <header
      className={cn(
        "top-0 z-20 w-full",
        transparent ? "absolute bg-transparent" : "sticky bg-background",
      )}
    >
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Share<span className="text-primary">list</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/discover"
            aria-label="Discover"
            className="flex items-center justify-center rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
          <LinkInstagramDialog linked={Boolean(isLinked)} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className={NAV_BUTTON}>
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
