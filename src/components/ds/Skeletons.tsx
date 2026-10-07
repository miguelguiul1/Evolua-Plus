import { Skeleton } from "@/components/ui/skeleton";

export const CardSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="bg-card rounded-2xl border border-border/50 shadow-soft p-5 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-3 w-full" style={{ maxWidth: `${90 - i * 15}%` }} />
    ))}
  </div>
);

export const StatGridSkeleton = ({ items = 4 }: { items?: number }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border/50 shadow-soft p-4 space-y-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    ))}
  </div>
);

export const ListSkeleton = ({ items = 4 }: { items?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border/50 shadow-soft p-5 flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export const PageSkeleton = () => (
  <div className="min-h-dvh bg-background pt-20 pb-16">
    <div className="container mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>
      <StatGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
      <ListSkeleton items={3} />
    </div>
  </div>
);

export default PageSkeleton;