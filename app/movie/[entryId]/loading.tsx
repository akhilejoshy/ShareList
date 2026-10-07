import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <main className="grid min-h-screen gap-8 px-4 py-12 md:grid-cols-12 md:px-6">
        <div className="flex flex-col justify-center gap-4 md:col-span-7 md:pl-8">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
        <div className="flex flex-col gap-3 md:col-span-5 md:pt-12">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
      </main>
    </div>
  );
}
