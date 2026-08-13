import { cn } from '@/lib/utils'

export default function Pagination({
  page,
  pages,
  start,
  shown,
  total,
  onPrev,
  onNext,
  className,
}: {
  page: number
  pages: number
  start: number
  shown: number
  total: number
  onPrev: () => void
  onNext: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <span className="text-xs sm:text-sm text-slate-400">
        {`Page ${page} / ${pages} · showing ${start}–${start + shown - 1} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg text-sm font-semibold text-white"
        >
          ‹ Prev
        </button>
        <button
          onClick={onNext}
          disabled={page >= pages}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg text-sm font-semibold text-white"
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
