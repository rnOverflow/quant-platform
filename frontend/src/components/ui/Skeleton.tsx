import { cn } from '../../utils/helpers'

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'skeleton rounded',
        className
      )}
    />
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  const heights = [45, 65, 40, 80, 55, 70, 50, 90, 60, 75, 45, 85, 55, 65, 40, 70, 60, 80, 50, 65]
  return (
    <div className="glass-card p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <div style={{ height }} className="flex items-end gap-1 px-2">
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm skeleton"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function MetricGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
