import { requireUserId } from "@/lib/auth/session";
import { tmdbProvider } from "@/lib/providers/tmdb";
import Header from "@/components/layout/Header";
import DiscoverGrid from "@/components/discover/DiscoverGrid";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  await requireUserId();
  const trending = await tmdbProvider.getTrending();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full px-4 py-6 md:px-6">
        <DiscoverGrid trending={trending} />
      </main>
    </div>
  );
}
