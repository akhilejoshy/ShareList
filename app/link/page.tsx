import { eq, and } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { igLinks } from "@/db/schema";
import { getMoviesBot } from "@/db/queries/bots";
import { requireUserId } from "@/lib/auth/session";
import { generateLinkCode } from "./actions";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col justify-center gap-4 px-6 py-24">
        <h1 className="text-2xl font-semibold text-foreground">Link your Instagram</h1>

        <Card className="p-6">
          {existingLink ? (
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" /> Your Instagram account is linked.
            </p>
          ) : code ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                DM this code to <strong className="text-foreground">@share__list</strong>:
              </p>
              <p className="rounded-md bg-background px-4 py-3 text-center text-2xl font-mono tracking-widest text-foreground">
                link {code}
              </p>
              <p className="text-xs text-muted-foreground">Expires in 15 minutes.</p>
            </div>
          ) : (
            <form action={generateLinkCode}>
              <Button type="submit" size="lg" className="w-full">
                Generate link code
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
