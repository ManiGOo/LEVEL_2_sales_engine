import { useMemo, useState } from 'react'
import { GitBranch, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { CampaignActivity } from '@/types/api'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  activities: CampaignActivity[]
  entityType: 'campaign' | 'lead' | 'team_activity'
  leadId?: string
}

export function StateHistory({ title, activities, entityType, leadId }: Props) {
  const [selected, setSelected] = useState<CampaignActivity | null>(null)
  const events = useMemo(() => activities.filter((a) => a.entity_type === entityType && (!leadId || a.lead_id === leadId)).slice().reverse(), [activities, entityType, leadId])

  if (!events.length) return null

  return <>
    <div className="rounded-xl border border-white/5 bg-slate-900/35 p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2"><GitBranch size={13} className="text-indigo-400" /> {title}</p>
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {events.map((event, index) => (
          <div key={event.id} className="flex items-center shrink-0">
            {index > 0 && <ChevronRight size={14} className="text-slate-600 mx-0.5" />}
            <button onClick={() => setSelected(event)} className={cn('rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:border-indigo-400/60 hover:bg-indigo-500/10', event.to_state ? 'border-indigo-500/25 bg-indigo-500/5' : 'border-white/10 bg-slate-800/60')}>
              <p className="text-[11px] font-semibold text-slate-200 capitalize">{event.to_state?.replace('_', ' ') || event.action.replace('_', ' ')}</p>
              <p className="text-[9px] text-slate-500">{event.created_at?.slice(0, 10)}</p>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-1.5">Click a stage to view the saved record.</p>
    </div>
    <Modal open={!!selected} onClose={() => setSelected(null)} title="Saved stage record" className="max-w-lg">
      <div className="p-5 space-y-3">
        <p className="text-sm text-slate-300">{selected?.detail || 'Saved state'}</p>
        <p className="text-xs text-slate-500">{selected?.created_at?.slice(0, 16).replace('T', ' ')}</p>
        <pre className="overflow-auto rounded-lg border border-white/10 bg-slate-950/70 p-3 text-xs leading-5 text-slate-300 whitespace-pre-wrap">{JSON.stringify(selected?.snapshot || {}, null, 2)}</pre>
      </div>
    </Modal>
  </>
}

export function ConfirmationDialog({ open, title, description, onReject, onContinue }: { open: boolean; title: string; description: string; onReject: () => void; onContinue: () => void }) {
  return <Modal open={open} onClose={onReject} title={title} className="max-w-md">
    <div className="p-5">
      <p className="text-sm leading-6 text-slate-300">{description}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onReject} className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/5">Reject</button>
        <button onClick={onContinue} className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold text-white">Continue</button>
      </div>
    </div>
  </Modal>
}
