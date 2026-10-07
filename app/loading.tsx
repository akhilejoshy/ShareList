import { Skeleton } from "@/components/ui/skeleton";
import { POSTER_WIDTH_CLASSES } from "@/components/PosterCard";

function SkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex shrink-0 flex-col gap-2 ${POSTER_WIDTH_CLASSES}`}>
          <Skeleton className="aspect-[2/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-6">
        <Skeleton className="h-9 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <main className="flex w-full flex-col gap-10 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-7 w-32" />
          <SkeletonRow />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-7 w-32" />
          <SkeletonRow />
        </div>
      </main>
    </div>
  );
}
