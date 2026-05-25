function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="aspect-square shimmer" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-3.5 w-16 shimmer rounded" />
          <div className="h-3.5 w-20 shimmer rounded" />
        </div>
        <div className="h-4 w-full shimmer rounded" />
        <div className="h-4 w-3/4 shimmer rounded" />
        <div className="h-6 w-24 shimmer rounded" />
        <div className="h-14 w-full shimmer rounded-lg" />
        <div className="h-10 w-full shimmer rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="h-16 bg-white border-b border-gray-100" />
      {/* Banner skeleton */}
      <div className="h-10 bg-blue-50 border-b border-blue-100" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs skeleton */}
        <div className="flex gap-2 py-2">
          {[80, 110, 90, 130, 100].map((w, i) => (
            <div key={i} className="h-9 shimmer rounded-full shrink-0" style={{ width: w }} />
          ))}
        </div>
        {/* Filter bar skeleton */}
        <div className="mt-4 h-14 shimmer rounded-xl" />
        {/* Grid skeleton */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  )
}
