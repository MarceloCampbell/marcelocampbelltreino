import { Skeleton } from '@/components/ui/Skeleton'

export default function BibliotecaLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-1/4" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
