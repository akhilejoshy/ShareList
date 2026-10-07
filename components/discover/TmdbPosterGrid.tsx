"use client";

import { Loader2 } from "lucide-react";
import type { TmdbSearchResult } from "@/components/search/TmdbResultsList";

export default function TmdbPosterGrid({
  results,
  pendingId,
  onSelect,
}: {
  results: TmdbSearchResult[];
  pendingId?: string | null;
  onSelect: (result: TmdbSearchResult) => void;
}) {
  if (results.length === 0) {
    return <p className="text-muted-foreground">No results.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {results.map((r) => {
        const isPending = pendingId === r.externalId;
        return (
          <button
            key={r.externalId}
            type="button"
            disabled={isPending}
            onClick={() => onSelect(r)}
            className="group flex flex-col gap-2 text-left disabled:opacity-60"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-card transition-shadow duration-200 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {r.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.coverImageUrl}
                  alt={r.title}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <span className="line-clamp-2 text-center text-sm font-medium text-foreground">
              {r.title} {r.year ? `(${r.year})` : ""}
            </span>
            {r.language && (
              <span className="-mt-1 text-center text-xs text-muted-foreground">{r.language}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
