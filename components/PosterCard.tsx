import Link from "next/link";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "cn";

// 2 cards per row on mobile, up to 6 on desktop — same breakpoints as the /list grid,
// so a horizontal row and its "view more" grid feel like the same card size.
export const POSTER_WIDTH_CLASSES =
  "w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.667rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(16.666%-0.834rem)]";

export interface PosterCardEntry {
  entryId: string;
  title: string;
  coverImageUrl: string | null;
  year: string | null;
  visited: boolean;
}

export function PosterCard({
  entry,
  className = "",
}: {
  entry: PosterCardEntry;
  className?: string;
}) {
  return (
    <Link
      href={`/movie/${entry.entryId}`}
      className={cn("group flex shrink-0 flex-col gap-2", POSTER_WIDTH_CLASSES, className)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-card transition-shadow duration-200 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
        {entry.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.coverImageUrl}
            alt={entry.title}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        {entry.visited && (
          <span className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-black/70 p-1 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        )}
      </div>
      <span className="line-clamp-2 text-center text-lg font-medium text-foreground">
        {entry.title} {entry.year ? `(${entry.year})` : ""}
      </span>
    </Link>
  );
}

export function UnknownPosterCard({
  entryId,
  thumbnailUrl,
}: {
  entryId: string;
  thumbnailUrl: string | null;
}) {
  return (
    <Link
      href={`/movie/${entryId}`}
      className={cn("group flex shrink-0 flex-col gap-2", POSTER_WIDTH_CLASSES)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-dashed border-white/20 bg-card">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt="Unidentified reel"
            className="h-full w-full object-cover opacity-50"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <HelpCircle className="h-6 w-6" />
          </div>
        )}
      </div>
      <span className="text-center text-sm text-muted-foreground">Tap to identify</span>
    </Link>
  );
}
