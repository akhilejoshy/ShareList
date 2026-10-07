import Link from "next/link";
import { PosterCard, POSTER_WIDTH_CLASSES, type PosterCardEntry } from "@/components/PosterCard";
import { cn } from "cn";

const PREVIEW_COUNT = 12;

export default function HorizontalRow({
  title,
  entries,
  viewMoreHref,
}: {
  title: string;
  entries: PosterCardEntry[];
  viewMoreHref: string;
}) {
  const preview = entries.slice(0, PREVIEW_COUNT);
  const hasMore = entries.length > PREVIEW_COUNT;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-xl font-bold text-foreground">
          {title} <span className="text-base font-normal text-muted-foreground">({entries.length})</span>
        </h3>
        {hasMore && (
          <Link
            href={viewMoreHref}
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            View more →
          </Link>
        )}
      </div>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {preview.map((e) => (
          <PosterCard key={e.entryId} entry={e} className="snap-start" />
        ))}
        {hasMore && (
          <Link
            href={viewMoreHref}
            className={cn(
              "flex shrink-0 snap-start items-center justify-center rounded-xl border border-white/10 bg-card text-sm text-muted-foreground transition-colors hover:text-primary",
              POSTER_WIDTH_CLASSES,
            )}
            style={{ aspectRatio: "2 / 3" }}
          >
            View more →
          </Link>
        )}
      </div>
    </div>
  );
}
