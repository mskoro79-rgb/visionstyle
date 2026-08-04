import clsx from "clsx";

/** Phase 13 — shimmer loading placeholder, used instead of a spinner for list/grid content. */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl bg-white/5",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-0 overflow-hidden h-full flex flex-col">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 flex-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/4 mt-2" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
