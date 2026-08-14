import { cn } from '@/lib/utils'
import { ResourceLoader } from './ResourceLoader'

export function Skeleton({ className, resource = false }: { className?: string; resource?: boolean }) {
  return (
    <div className={cn('relative overflow-hidden animate-pulse rounded-xl bg-slate-800/70', className)}>
      {resource && <ResourceLoader className="absolute inset-0" />}
    </div>
  )
}
