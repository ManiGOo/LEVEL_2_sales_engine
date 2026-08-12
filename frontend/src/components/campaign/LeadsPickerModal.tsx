import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Lead, DecisionMaker } from '@/types/api'
import { Modal } from '@/components/ui/Modal'
import { Search, Users, Briefcase, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showToast } from '@/components/ui/toast'

export interface LeadSeed {
  company_key: string
  company_name: string
  website: string
  linkedin_url: string
  contact_name: string
  contact_role: string
  contact_email: string
  contact_source: string
  contact_source_url: string
  contact_evidence: string
  contact_confidence: string
  verification_status: string
  outreach_readiness: string
  verified_at: string | null
  do_not_contact: boolean
}

const STATUS_BTN =
  'w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors'

export default function LeadsPickerModal({
  open,
  onClose,
  onPick,
  title = 'Select researched leads',
  exclude = new Set<string>(),
}: {
  open: boolean
  onClose: () => void
  onPick: (seeds: LeadSeed[]) => void
  title?: string
  exclude?: Set<string>
}) {
  const { fetchApi } = useApi()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Map<string, DecisionMaker>>(new Map())
  const [confirming, setConfirming] = useState(false)

  const { data, isFetching } = useQuery({
    queryKey: ['leads', 'status'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/leads/status')
      return (await res.json()) as { items: Lead[] }
    },
  })

  const leads = useMemo(() => {
    const items = (data?.items || []).filter(
      (l) => l.status === 'completed' && (l.decision_makers || []).length > 0 && !exclude.has(l.company_key)
    )
    const filtered = q.trim()
      ? items.filter((l) => (l.company_name || l.company_key).toLowerCase().includes(q.trim().toLowerCase()))
      : items
    return filtered
  }, [data, q, exclude])

  function toggleLead(key: string, dm: DecisionMaker) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.get(key)?.name === dm.name) next.delete(key)
      else next.set(key, dm)
      return next
    })
  }

  function confirm() {
    setConfirming(true)
    try {
      const seeds: LeadSeed[] = leads
        .map((l) => {
          const dm = selected.get(l.company_key)
          if (!dm) return null
          return {
            company_key: l.company_key,
            company_name: l.company_name || l.company_key,
            website: l.website || '',
            linkedin_url: dm.linkedin_url || l.linkedin_url || '',
            contact_name: dm.name || '',
            contact_role: dm.role || '',
            contact_email: dm.email || '',
            contact_source: dm.source || '',
            contact_source_url: dm.source_url || '',
            contact_evidence: '',
            contact_confidence: dm.confidence || '',
            verification_status: dm.confidence === 'high' ? 'verified' : 'needs_review',
            outreach_readiness: dm.email ? 'ready_for_email' : dm.linkedin_url ? 'ready_for_linkedin' : 'missing_contact_info',
            verified_at: dm.confidence === 'high' ? new Date().toISOString() : null,
            do_not_contact: false,
          }
        })
        .filter((s): s is LeadSeed => !!s)
      if (seeds.length === 0) {
        showToast({ variant: 'warning', title: 'Nothing selected', description: 'Pick at least one contact' })
        return
      }
      onPick(seeds)
      setSelected(new Map())
      onClose()
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} className="lg:max-w-2xl">
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies…"
              className="w-full pl-8 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <span className="text-xs text-slate-500 self-center shrink-0">
            {selected.size}/{leads.length}
          </span>
        </div>

        {isFetching ? (
          <div className="space-y-3 py-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 glass rounded-xl animate-pulse" />)}
          </div>
        ) : leads.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No researched leads with decision makers. Research leads first or the company is already in this campaign.
          </p>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto scrollbar-thin pr-1">
            {leads.map((l) => (
              <div key={l.company_key} className="rounded-xl glass p-3">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <p className="text-sm font-semibold text-white">{l.company_name || l.company_key}</p>
                  {l.website && <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{l.website}</span>}
                  {(l.trigger_events?.length || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                      <Users size={9} /> {(l.decision_makers || []).length} contacts
                    </span>
                  )}
                  {(l.hiring?.length || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      <Briefcase size={9} /> {l.hiring.length} jobs
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {(l.decision_makers || []).map((dm, i) => {
                    const isOn = selected.get(l.company_key)?.name === dm.name
                    return (
                      <button
                        key={`${dm.name}-${i}`}
                        onClick={() => toggleLead(l.company_key, dm)}
                        className={cn(
                          STATUS_BTN,
                          isOn
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-300 hover:bg-white/5 border border-transparent'
                        )}
                      >
                        <span className={cn('w-3 h-3 rounded-full border shrink-0', isOn ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500')} />
                        <span className="truncate flex-1">{dm.name}</span>
                        <span className="text-slate-500 truncate max-w-[140px]">{dm.role}</span>
                        {dm.email && <span className="text-[10px] text-amber-400 truncate max-w-[140px] hidden sm:inline">{dm.email}</span>}
                        {dm.confidence && (
                          <span className={cn('text-[9px] px-1 rounded shrink-0', dm.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' : dm.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600/30 text-slate-400')}>
                            {dm.confidence}
                          </span>
                        )}
                        {dm.source && <span className="text-[9px] text-slate-500">from {dm.source.replace('_', ' ')}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">{selected.size} contact{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={selected.size === 0 || confirming}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
            >
              {confirming && <Loader2 size={14} className="animate-spin" />}
              Add {selected.size} lead{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
