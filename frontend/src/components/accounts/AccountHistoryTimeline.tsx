import type { AccountHistoryItem } from '@/types/api'
import { stageStatusMeta } from '@/lib/account'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { History } from 'lucide-react'

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function AccountHistoryTimeline({ items }: { items: AccountHistoryItem[] | undefined }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 sticky top-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <History size={15} className="text-indigo-400" /> Activity
      </h3>
      {!items || items.length === 0 ? (
        <p className="text-[12px] text-slate-500">No changes yet. Edits to stages will appear here.</p>
      ) : (
        <ol className="relative space-y-3 before:absolute before:top-1 before:bottom-1 before:left-[5px] before:w-px before:bg-white/10">
          {items.map((h) => {
            const meta = stageStatusMeta(h.status)
            return (
              <li key={h.id} className="relative pl-4">
                <span className={cn('absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900', meta.dot)} />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-medium text-white">{h.stage_name}</span>
                  <Badge variant={meta.badge}>{meta.label}</Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {h.actor_name || 'Teammate'} · {relativeTime(h.created_at)}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
