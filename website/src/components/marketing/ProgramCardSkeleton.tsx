/** Loading placeholder for `ProgramCard` — real skeleton UI (this codebase had none before the dynamic-programs migration); shown while `getPrograms()`/`getFeaturedPrograms()` are in flight. */
export function ProgramCardSkeleton() {
  return (
    <div className="border-border-soft bg-surface flex h-full flex-col overflow-hidden rounded-2xl border">
      <div className="bg-surface-raised aspect-[4/3] animate-pulse" aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-raised h-5 w-3/4 animate-pulse rounded-full" />
          <div className="bg-surface-raised h-4 w-full animate-pulse rounded-full" />
          <div className="bg-surface-raised h-4 w-2/3 animate-pulse rounded-full" />
        </div>
        <div className="flex gap-1.5">
          <div className="bg-surface-raised h-6 w-16 animate-pulse rounded-full" />
          <div className="bg-surface-raised h-6 w-20 animate-pulse rounded-full" />
        </div>
        <div className="bg-surface-raised mt-auto h-4 w-1/2 animate-pulse rounded-full" />
      </div>
    </div>
  )
}

export function ProgramCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading programs"
    >
      {Array.from({ length: count }, (_, index) => (
        <ProgramCardSkeleton key={index} />
      ))}
    </div>
  )
}
