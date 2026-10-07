"use client";

export interface TmdbSearchResult {
  externalId: string;
  title: string;
  year: string | null;
  coverImageUrl: string | null;
  language: string | null;
}

export default function TmdbResultsList({
  results,
  actionLabel,
  pendingId,
  onSelect,
}: {
  results: TmdbSearchResult[];
  actionLabel: string;
  pendingId?: string | null;
  onSelect: (result: TmdbSearchResult) => void;
}) {
  if (results.length === 0) return null;

  return (
    <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
      {results.map((r) => (
        <li
          key={r.externalId}
          className="flex items-center gap-3 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
        >
          <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-card">
            {r.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.coverImageUrl} alt={r.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              {r.title} {r.year ? `(${r.year})` : ""}
            </span>
            {r.language && <span className="text-xs text-muted-foreground">{r.language}</span>}
          </div>
          <button
            type="button"
            disabled={pendingId === r.externalId}
            onClick={() => onSelect(r)}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
          >
            {pendingId === r.externalId ? "…" : actionLabel}
          </button>
        </li>
      ))}
    </ul>
  );
}
