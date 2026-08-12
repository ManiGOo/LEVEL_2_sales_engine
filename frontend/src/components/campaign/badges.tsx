import { cn } from '@/lib/utils'

export const CAMPAIGN_STATUSES = ['draft', 'active', 'completed', 'archived'] as const

export const LEAD_STATUSES = ['queued', 'contacted', 'replied', 'not_interested', 'closed'] as const

const campaignMap: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-500/15 text-slate-400' },
  active: { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-400' },
  completed: { label: 'Completed', cls: 'bg-sky-500/15 text-sky-400' },
  archived: { label: 'Archived', cls: 'bg-slate-600/20 text-slate-500' },
}

const leadMap: Record<string, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'bg-slate-500/15 text-slate-400' },
  contacted: { label: 'Contacted', cls: 'bg-amber-500/15 text-amber-400' },
  replied: { label: 'Replied', cls: 'bg-emerald-500/15 text-emerald-400' },
  not_interested: { label: 'Not interested', cls: 'bg-red-500/15 text-red-400' },
  closed: { label: 'Closed', cls: 'bg-indigo-500/15 text-indigo-400' },
}

const actionMap: Record<string, { label: string; cls: string }> = {
  created: { label: 'Created', cls: 'bg-indigo-500/15 text-indigo-400' },
  updated: { label: 'Updated', cls: 'bg-slate-500/15 text-slate-400' },
  lead_added: { label: 'Lead added', cls: 'bg-sky-500/15 text-sky-400' },
  lead_removed: { label: 'Lead removed', cls: 'bg-red-500/15 text-red-400' },
  status_change: { label: 'Status', cls: 'bg-purple-500/15 text-purple-400' },
  contacted: { label: 'Contacted', cls: 'bg-amber-500/15 text-amber-400' },
  emailed: { label: 'Emailed', cls: 'bg-blue-500/15 text-blue-400' },
  called: { label: 'Called', cls: 'bg-teal-500/15 text-teal-400' },
  linkedin: { label: 'LinkedIn', cls: 'bg-sky-500/15 text-sky-400' },
  note: { label: 'Note', cls: 'bg-slate-500/15 text-slate-300' },
}

function Pill({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const m = map[status] || map.replied || { label: status, cls: 'bg-slate-500/15 text-slate-400' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', m.cls)}>
      {m.label}
    </span>
  )
}

export function CampaignStatusBadge({ status }: { status: string }) {
  const m = campaignMap[status] || campaignMap.draft
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', m.cls)}>
      {m.label}
    </span>
  )
}

export function LeadStatusBadge({ status }: { status: string }) {
  return <Pill status={status} map={leadMap} />
}

export function ActionBadge({ action }: { action: string }) {
  return <Pill status={action} map={actionMap} />
}