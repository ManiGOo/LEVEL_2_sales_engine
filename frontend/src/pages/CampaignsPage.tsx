import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Campaign } from '@/types/api'
import { motion } from 'motion/react'
import { Plus, Play, Pause, Mail, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showToast } from '@/components/ui/toast'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ComponentType<{ size?: number }> }> = {
    draft: { label: 'Draft', cls: 'bg-slate-500/15 text-slate-400', icon: Clock },
    running: { label: 'Running', cls: 'bg-emerald-500/15 text-emerald-400', icon: Play },
    paused: { label: 'Paused', cls: 'bg-amber-500/15 text-amber-400', icon: Pause },
    completed: { label: 'Completed', cls: 'bg-sky-500/15 text-sky-400', icon: CheckCircle2 },
    failed: { label: 'Failed', cls: 'bg-red-500/15 text-red-400', icon: AlertCircle },
  }
  const m = map[status] || map.draft
  const Icon = m.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', m.cls)}>
      <Icon size={10} />
      {m.label}
    </span>
  )
}

export default function CampaignsPage() {
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isFetching } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/campaigns')
      return ((await res.json()) as { items: Campaign[] }).items
    },
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-slate-400 text-sm mt-1">
            {data?.length ?? 0} campaign{(data?.length ?? 0) !== 1 ? 's' : ''} · multi-step outreach to researched leads
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition-colors text-sm font-semibold text-white"
        >
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {isFetching ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 glass rounded-xl animate-pulse" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((c) => (
            <CampaignCard key={c.campaign_id} campaign={c} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl p-12 text-center">
          <Mail size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No campaigns yet</p>
          <p className="text-sm text-slate-500 mt-1">Create a campaign to start outreach to your researched leads</p>
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['campaigns'] }) }} />
      )}
    </motion.div>
  )
}

function CampaignCard({ campaign, onRefresh }: { campaign: Campaign; onRefresh: () => void }) {
  const { fetchApi } = useApi()
  const [expanded, setExpanded] = useState(false)

  const { data: detail } = useQuery({
    queryKey: ['campaign', campaign.campaign_id],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/campaigns/${campaign.campaign_id}`)
      return (await res.json()) as Campaign
    },
    enabled: expanded,
  })

  async function startCampaign() {
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaign.campaign_id}/start`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to start')
      showToast({ variant: 'success', title: 'Campaign started', description: 'Messages are being generated and sent' })
      onRefresh()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed to start', description: e instanceof Error ? e.message : 'Error' })
    }
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{campaign.name}</h3>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {campaign.lead_count} leads · {(campaign.sequence_config || []).length} steps · created {campaign.created_at?.slice(0, 10)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === 'draft' && (
            <button onClick={startCampaign} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-white flex items-center gap-1">
              <Play size={12} /> Start
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white">
            {expanded ? 'Collapse' : 'View'}
          </button>
        </div>
      </div>
      {expanded && detail?.leads && (
        <div className="border-t border-white/5 p-4 space-y-2 max-h-96 overflow-y-auto">
          {detail.leads.map((cl) => (
            <div key={cl.company_key} className="flex items-center gap-3 text-xs">
              <StatusBadge status={cl.status} />
              <span className="text-white font-medium truncate flex-1">{cl.company_key}</span>
              {cl.decision_maker?.name && <span className="text-slate-400 truncate max-w-[150px]">{cl.decision_maker.name}</span>}
              <span className="text-slate-500">step {cl.current_step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { fetchApi } = useApi()
  const [name, setName] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<{ company_key: string; decision_maker: DecisionMaker }[]>([])
  const [leads, setLeads] = useState<{ company_key: string; company_name: string; decision_makers: DecisionMaker[] }[]>([])
  const [saving, setSaving] = useState(false)

  useQuery({
    queryKey: ['leads-for-campaign'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/leads/status')
      const data = await res.json()
      const items = (data.items || []).filter((l: any) => l.status === 'completed' && l.decision_makers?.length > 0)
      setLeads(items.map((l: any) => ({ company_key: l.company_key, company_name: l.company_name, decision_makers: l.decision_makers || [] })))
      return items
    },
  })

  const defaultSequence = [
    { channel: 'email', delay_days: 0, template: 'problem_hook' },
    { channel: 'linkedin', delay_days: 2, template: 'connection_note' },
    { channel: 'email', delay_days: 5, template: 'follow_up' },
    { channel: 'email', delay_days: 8, template: 'breakup' },
  ]

  function toggleLead(companyKey: string, dm: DecisionMaker) {
    setSelectedLeads(prev => {
      const exists = prev.find(l => l.company_key === companyKey && l.decision_maker?.name === dm.name)
      if (exists) return prev.filter(l => !(l.company_key === companyKey && l.decision_maker?.name === dm.name))
      return [...prev, { company_key: companyKey, decision_maker: dm }]
    })
  }

  async function createCampaign() {
    if (!selectedLeads.length) return
    setSaving(true)
    try {
      const res = await fetchApi('/api/v1/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name: name || 'New Campaign', leads: selectedLeads, sequence_config: defaultSequence }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create')
      showToast({ variant: 'success', title: 'Campaign created', description: `${selectedLeads.length} leads added` })
      onSuccess()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed', description: e instanceof Error ? e.message : 'Error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">New Campaign</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Close</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Campaign Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. QMS Outreach — Batch 1" className="mt-1 w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Select Leads & Decision Makers</label>
                <p className="text-[11px] text-slate-500 mt-0.5">Choose which person to contact at each company</p>
                <div className="mt-2 space-y-3 max-h-[40vh] overflow-y-auto">
                  {leads.length === 0 && <p className="text-sm text-slate-500">No researched leads with decision makers yet. Research some leads first.</p>}
                  {leads.map(l => (
                    <div key={l.company_key} className="rounded-lg bg-slate-900/50 p-3">
                      <p className="text-sm font-semibold text-white mb-1">{l.company_name || l.company_key}</p>
                      <div className="space-y-1">
                        {l.decision_makers.map((dm, i) => {
                          const selected = selectedLeads.find(sl => sl.company_key === l.company_key && sl.decision_maker?.name === dm.name)
                          return (
                            <button key={i} onClick={() => toggleLead(l.company_key, dm)} className={cn('w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors', selected ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-300 hover:bg-white/5 border border-transparent')}>
                              <div className={cn('w-3 h-3 rounded-full border shrink-0', selected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500')} />
                              <span className="truncate">{dm.name}</span>
                              <span className="text-slate-500 truncate">{dm.role?.slice(0, 40)}</span>
                              {dm.confidence && <span className={cn('ml-auto text-[9px] px-1 rounded', dm.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')}>{dm.confidence}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-400">{selectedLeads.length} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white">Cancel</button>
            <button onClick={createCampaign} disabled={selectedLeads.length === 0 || saving} className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-sm font-semibold text-white">
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

import type { DecisionMaker } from '@/types/api'
