"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import TmdbPosterGrid from "./TmdbPosterGrid";
import type { TmdbSearchResult } from "@/components/search/TmdbResultsList";
const DEBOUNCE_MS = 400;

export default function DiscoverGrid({ trending }: { trending: TmdbSearchResult[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const handle = setTimeout(() => {
      setSearching(true);
      fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  function handleSelect(result: TmdbSearchResult) {
    router.push(`/discover/${encodeURIComponent(result.externalId)}`);
  }

  const showing = query.trim() ? results : trending;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          className="pl-9"
          autoFocus
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">
          {query.trim() ? (searching ? "Searching…" : "Results") : "Trending this week"}
        </h2>
        <TmdbPosterGrid results={showing} onSelect={handleSelect} />
      </div>
    </div>
  );
}
