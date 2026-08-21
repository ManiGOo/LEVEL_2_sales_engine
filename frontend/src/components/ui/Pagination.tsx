import { cn } from '@/lib/utils'

function getPageItems(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1)
  }
  const items: (number | '…')[] = [1]
  if (page > 3) items.push('…')
  const left = Math.max(2, page - 1)
  const right = Math.min(pages - 1, page + 1)
  for (let i = left; i <= right; i++) items.push(i)
  if (page < pages - 2) items.push('…')
  items.push(pages)
  return items
}

export default function Pagination({
  page,
  pages,
  start,
  shown,
  total,
  onPrev,
  onNext,
  onPage,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
  className,
}: {
  page: number
  pages: number
  start: number
  shown: number
  total: number
  onPrev: () => void
  onNext: () => void
  onPage?: (page: number) => void
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}) {
  const pageItems = getPageItems(page, pages)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <span className="text-xs sm:text-sm text-slate-400">
        {`Page ${page} / ${pages} · showing ${start}–${start + shown - 1} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        {pageSizeOptions && pageSize != null && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Rows per page"
          >
            {pageSizeOptions.map((o) => (
              <option key={o} value={o}>
                {o} / page
              </option>
            ))}
          </select>
        )}
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg text-sm font-semibold text-white"
        >
          ‹ Prev
        </button>
        {onPage &&
          pageItems.map((it, i) =>
            it === '…' ? (
              <span key={`e${i}`} className="px-2 text-slate-500 select-none">
                …
              </span>
            ) : (
              <button
                key={it}
                onClick={() => onPage(it)}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                  it === page
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white',
                )}
              >
                {it}
              </button>
            ),
          )}
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
