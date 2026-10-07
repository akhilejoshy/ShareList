"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TmdbResultsList, { type TmdbSearchResult } from "@/components/search/TmdbResultsList";

export default function SwapSearch({
  entryId,
  onSwap,
}: {
  entryId: string;
  onSwap: (entryId: string, externalId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(result: TmdbSearchResult) {
    setPendingId(result.externalId);
    startTransition(async () => {
      await onSwap(entryId, result.externalId);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Change match
          </Button>
        }
      />
      <DialogContent className="flex min-h-[26rem] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Not the right match?</DialogTitle>
        </DialogHeader>
        <form onSubmit={search} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for the correct title..."
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={loading} size="sm">
            {loading ? "…" : "Search"}
          </Button>
        </form>

        <TmdbResultsList
          results={results}
          actionLabel="Use this"
          pendingId={pending ? pendingId : null}
          onSelect={handleSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
