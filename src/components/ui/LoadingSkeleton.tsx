export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-surface-alt rounded w-1/3 mb-3" />
      <div className="h-8 bg-surface-alt rounded w-1/2 mb-2" />
      <div className="h-3 bg-surface-alt rounded w-1/4" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-3 bg-surface-alt rounded w-20 mb-2" />
          <div className="h-7 bg-surface-alt rounded w-28" />
        </div>
        <div className="h-8 w-8 bg-surface-alt rounded" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-surface-alt" />
      <div className="flex-1">
        <div className="h-4 bg-surface-alt rounded w-1/3 mb-1" />
        <div className="h-3 bg-surface-alt rounded w-1/4" />
      </div>
      <div className="h-4 bg-surface-alt rounded w-16" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
