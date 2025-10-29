import { Skeleton } from '@/components/ui/skeleton'

export function LayoutLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <div className="grid grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-3xl bg-white/10" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <Skeleton className="col-span-2 h-96 rounded-3xl bg-white/10" />
        <Skeleton className="h-96 rounded-3xl bg-white/10" />
      </div>
    </div>
  )
}
