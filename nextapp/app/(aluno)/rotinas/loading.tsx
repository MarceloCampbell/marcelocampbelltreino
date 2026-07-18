import { Skeleton } from '@/components/ui/Skeleton'

export default function RotinasLoading() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-8 w-40 mb-5" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
