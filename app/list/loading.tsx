import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <main className="w-full px-4 py-6 md:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
