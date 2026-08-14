import { useMemo, useState } from 'react'
import { GitBranch, MoveRight, UserRound, Clock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { CampaignActivity } from '@/types/api'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  activities: CampaignActivity[]
  entityType: 'campaign' | 'lead' | 'team_activity'
  leadId?: string
}

const NODE_COLORS: Record<string, string> = {
  draft: 'bg-slate-400 border-slate-400',
  queued: 'bg-slate-400 border-slate-400',
  active: 'bg-emerald-500 border-emerald-500',
  contacted: 'bg-amber-400 border-amber-400',
  completed: 'bg-sky-400 border-sky-400',
  replied: 'bg-emerald-500 border-emerald-500',
  archived: 'bg-slate-600 border-slate-600',
  not_interested: 'bg-red-500 border-red-500',
  closed: 'bg-indigo-500 border-indigo-500',
}

const LABEL_COLORS: Record<string, string> = {
  draft: 'text-slate-400',
  queued: 'text-slate-400',
  active: 'text-emerald-400',
  contacted: 'text-amber-400',
  completed: 'text-sky-400',
  replied: 'text-emerald-400',
  archived: 'text-slate-500',
  not_interested: 'text-red-400',
  closed: 'text-indigo-400',
}

const SNAPSHOT_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  status: 'Status',
  objective: 'Objective',
  target_audience: 'Target audience',
  offer_context: 'Offer context',
  sender_identity: 'Sender identity',
  approved_channels: 'Approved channels',
  daily_send_limit: 'Daily send limit',
  stop_conditions: 'Stop conditions',
  preflight_complete: 'Preflight complete',
  lead_count: 'Lead count',
  company_name: 'Company',
  contact_name: 'Contact name',
  contact_role: 'Role',
  email: 'Email',
  phone: 'Phone',
  next_follow_up_at: 'Next follow-up',
  last_contact_at: 'Last contact',
  notes: 'Notes',
}

function nodeKey(event: CampaignActivity): string {
  if (event.to_state) return event.to_state
  return event.action
}

function eventLabel(event: CampaignActivity): string {
  return (event.to_state || event.action).replace(/_/g, ' ')
}

function nodeColor(event: CampaignActivity): string {
  const key = nodeKey(event)
  if (event.action === 'status_change' && !event.to_state) return 'bg-purple-500 border-purple-500'
  return NODE_COLORS[key] || (event.action === 'status_change' ? 'bg-purple-500 border-purple-500' : 'bg-slate-500 border-slate-500')
}

function labelColor(event: CampaignActivity): string {
  return LABEL_COLORS[nodeKey(event)] || 'text-slate-400'
}

function SnapshotValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return <Row label={label} value={value.join(', ')} />
  }
  if (typeof value === 'boolean') return <Row label={label} value={value ? 'Yes' : 'No'} />
  if (typeof value === 'object') return null
  return <Row label={label} value={String(value)} />
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold shrink-0">{label}</span>
      <span className="text-xs text-slate-200 text-right break-words min-w-0">{value}</span>
    </div>
  )
}

export function StateHistory({ title, activities, entityType, leadId }: Props) {
  const [selected, setSelected] = useState<CampaignActivity | null>(null)
  const events = useMemo(
    () => activities.filter((a) => a.entity_type === entityType && (!leadId || a.lead_id === leadId)).slice().reverse(),
    [activities, entityType, leadId]
  )

  if (!events.length) return null

  return <>
    <div className="rounded-xl border border-white/5 bg-slate-900/35 p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-3"><GitBranch size={13} className="text-indigo-400" /> {title}</p>
      <div className="flex items-start overflow-x-auto pb-2 scrollbar-thin">
        {events.map((event, index) => (
          <div key={event.id} className="flex items-start shrink-0">
            {index > 0 && <div className="w-5 mt-[7px] h-px bg-slate-600 shrink-0" aria-hidden="true" />}
            <button
              onClick={() => setSelected(event)}
              className="group flex flex-col items-center w-24 text-center"
              title={`${eventLabel(event)} — ${event.created_at?.slice(0, 10)}`}
            >
              <div className="relative">
                <span className={cn('block h-3.5 w-3.5 rounded-full border-2 transition-transform group-hover:scale-125', nodeColor(event))} />
              </div>
              <span className={cn('text-[11px] font-semibold capitalize leading-tight mt-1.5 group-hover:text-white transition-colors', labelColor(event))}>
                {eventLabel(event)}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5">{event.created_at?.slice(0, 10)}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-1.5">Click a stage to view the saved record.</p>
    </div>
    <Modal open={!!selected} onClose={() => setSelected(null)} title="Saved stage record" className="max-w-lg">
      <div className="p-5 space-y-3">
        {selected?.detail && <p className="text-sm leading-6 text-slate-300">{selected.detail}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          {selected?.from_state && selected?.to_state && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-300">
              {selected.from_state.replace('_', ' ')} <MoveRight size={11} /> {selected.to_state.replace('_', ' ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-slate-500"><UserRound size={12} /> {selected?.actor_name || 'Teammate'}</span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock size={12} /> {selected?.created_at?.slice(0, 16).replace('T', ' ')}</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
          {Object.entries(selected?.snapshot || {}).map(([key, value]) => (
            <SnapshotValue key={key} label={SNAPSHOT_LABELS[key] || key.replace(/_/g, ' ')} value={value} />
          ))}
        </div>
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
