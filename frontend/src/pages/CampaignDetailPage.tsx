import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { CampaignDetail, CampaignLead, CampaignActivity } from '@/types/api'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Save,
  Loader2,
  Users,
  Megaphone,
  Globe,
  Mail,
  Calendar,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { showToast } from '@/components/ui/toast'
import LeadsPickerModal, { type LeadSeed } from '@/components/campaign/LeadsPickerModal'
import { CampaignStatusBadge, LeadStatusBadge, ActionBadge, CAMPAIGN_STATUSES, LEAD_STATUSES } from '@/components/campaign/badges'

const inputClass =
  'w-full px-2.5 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors'

const ACTION_OPTIONS = [
  { value: 'emailed', label: 'Emailed' },
  { value: 'called', label: 'Called' },
  { value: 'linkedin', label: 'LinkedIn touch' },
  { value: 'note', label: 'Note' },
]

export default function CampaignDetailPage() {
  const { campaignId = '' } = useParams()
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingContext, setEditingContext] = useState(false)
  const [context, setContext] = useState({ objective: '', target_audience: '', offer_context: '', sender_identity: '', stop_conditions: '', approved_channels: ['email'] as string[] })

  const { data, isFetching } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}`)
      if (!res.ok) throw new Error('Failed to load campaign')
      return (await res.json()) as CampaignDetail
    },
  })

  const campaign = data?.campaign
  const activities = data?.activities || []
  const leads = campaign?.leads || []

  useEffect(() => {
    if (campaign) setContext({
      objective: campaign.objective || '', target_audience: campaign.target_audience || '',
      offer_context: campaign.offer_context || '', sender_identity: campaign.sender_identity || '',
      stop_conditions: campaign.stop_conditions || '', approved_channels: campaign.approved_channels || [],
    })
  }, [campaign?.id, campaign?.updated_at])

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return [l.company_name, l.contact_name, l.contact_role]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    })
  }, [leads, search, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { queued: 0, contacted: 0, replied: 0, not_interested: 0, closed: 0 }
    for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1
    return counts
  }, [leads])

  async function updateCampaignStatus(status: string) {
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Update failed')
      invalidate()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed', description: e instanceof Error ? e.message : 'Error' })
    }
  }

  async function saveContext() {
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}`, { method: 'PATCH', body: JSON.stringify(context) })
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || 'Update failed') }
      setEditingContext(false)
      invalidate()
      showToast({ variant: 'success', title: 'Preflight saved', description: 'Campaign context updated' })
    } catch (e) {
      showToast({ variant: 'error', title: 'Could not save', description: e instanceof Error ? e.message : 'Error' })
    }
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }

  async function deleteCampaign() {
    if (!campaign) return
    if (!window.confirm(`Delete campaign "${campaign.name}"? This removes all its leads.`)) return
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      showToast({ variant: 'success', title: 'Deleted', description: 'Campaign removed' })
      window.location.href = '/campaigns'
    } catch (e) {
      showToast({ variant: 'error', title: 'Delete failed', description: e instanceof Error ? e.message : 'Error' })
    }
  }

  async function handleAddLeads(seeds: LeadSeed[]) {
    try {
      for (const seed of seeds) {
        const res = await fetchApi(`/api/v1/campaigns/${campaignId}/leads`, {
          method: 'POST',
          body: JSON.stringify(seed),
        })
        if (!res.ok) throw new Error('Failed to add a lead')
      }
      showToast({ variant: 'success', title: 'Leads added', description: `${seeds.length} lead(s) added` })
      invalidate()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed', description: e instanceof Error ? e.message : 'Error' })
    }
  }

  const excludeKeys = useMemo(() => new Set(leads.map((l) => l.company_key)), [leads])

  if (isFetching && !campaign) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 glass rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Megaphone size={48} className="mx-auto text-slate-600 mb-4" />
        <p className="text-slate-400">Campaign not found</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={15} /> Campaigns
      </Link>

      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white truncate">{campaign.name}</h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            {campaign.description && <p className="text-sm text-slate-400 mt-1.5">{campaign.description}</p>}
            <p className="text-xs text-slate-500 mt-2">
              Created by {campaign.created_by_name || 'a teammate'} · {leads.length} lead{leads.length !== 1 ? 's' : ''} · shared with the whole team
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={campaign.status}
              onChange={(e) => updateCampaignStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button onClick={deleteCampaign} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete campaign">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-colors',
                statusFilter === s ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/5 bg-slate-900/40 hover:bg-slate-800/60'
              )}
            >
              <p className="text-lg font-bold text-white">{statusCounts[s] || 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-0.5">{s.replace('_', ' ')}</p>
            </button>
          ))}
        </div>
        <div className={cn('rounded-lg border px-3 py-3 text-xs', campaign.preflight_complete ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5')}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-200">Outreach preflight</span>
            <span className={campaign.preflight_complete ? 'text-emerald-400' : 'text-amber-400'}>{campaign.preflight_complete ? 'Complete' : 'Draft only'}</span>
          </div>
          <p className="text-slate-400 mt-1">{campaign.objective || 'Add an objective'} · {campaign.target_audience || 'Add a target audience'} · {campaign.sender_identity || 'Choose a sender'}</p>
          <p className="text-slate-500 mt-1">Channels: {(campaign.approved_channels || []).join(', ') || 'none'} · Stop conditions: {campaign.stop_conditions || 'not configured'}</p>
          <button onClick={() => setEditingContext((v) => !v)} className="mt-2 text-indigo-300 hover:text-indigo-200 font-semibold">{editingContext ? 'Hide editor' : 'Edit preflight'}</button>
          {editingContext && <div className="mt-3 grid sm:grid-cols-2 gap-2">
            {(['objective', 'target_audience', 'sender_identity', 'stop_conditions'] as const).map((field) => <input key={field} value={context[field]} onChange={(e) => setContext((c) => ({ ...c, [field]: e.target.value }))} placeholder={field.replace('_', ' ')} className={cn(inputClass, 'text-xs')} />)}
            <textarea value={context.offer_context} onChange={(e) => setContext((c) => ({ ...c, offer_context: e.target.value }))} placeholder="offer context" rows={2} className={cn(inputClass, 'text-xs resize-y')} />
            <div className="flex items-center gap-3 text-slate-300"><span>Channels</span>{['email', 'linkedin'].map((channel) => <label key={channel} className="inline-flex items-center gap-1"><input type="checkbox" checked={context.approved_channels.includes(channel)} onChange={(e) => setContext((c) => ({ ...c, approved_channels: e.target.checked ? [...c.approved_channels, channel] : c.approved_channels.filter((x) => x !== channel) }))} className="accent-indigo-500" />{channel}</label>)}</div>
            <button onClick={saveContext} className="sm:col-span-2 justify-self-start px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-xs font-semibold text-white">Save preflight</button>
          </div>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact, role…"
              className="w-full pl-8 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition-colors text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add leads
        </button>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Users size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">
            {leads.length === 0 ? 'No leads in this campaign yet' : 'No leads match your filters'}
          </p>
          {leads.length === 0 && (
            <p className="text-sm text-slate-500 mt-1">Add researched leads to start tracking outreach.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <LeadRow key={lead.id} campaignId={campaignId} lead={lead} onChanged={invalidate} />
          ))}
        </div>
      )}

      <ActivityLog activities={activities} leads={leads} />

      <LeadsPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleAddLeads}
        exclude={excludeKeys}
        title="Add leads to campaign"
      />
    </motion.div>
  )
}

function LeadRow({ campaignId, lead, onChanged }: { campaignId: string; lead: CampaignLead; onChanged: () => void }) {
  const { fetchApi } = useApi()
  const [contactName, setContactName] = useState(lead.contact_name || '')
  const [contactRole, setContactRole] = useState(lead.contact_role || '')
  const [contactEmail, setContactEmail] = useState(lead.contact_email || '')
  const [contactPhone, setContactPhone] = useState(lead.contact_phone || '')
  const [notes, setNotes] = useState(lead.notes || '')
  const [nextFollowUp, setNextFollowUp] = useState(lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [logAction, setLogAction] = useState('emailed')
  const [logDetail, setLogDetail] = useState('')
  const [logging, setLogging] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          contact_name: contactName,
          contact_role: contactRole,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          notes,
          next_follow_up_at: nextFollowUp || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      showToast({ variant: 'success', title: 'Saved', description: 'Lead details updated' })
      onChanged()
    } catch (e) {
      showToast({ variant: 'error', title: 'Save failed', description: e instanceof Error ? e.message : 'Error' })
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(status: string) {
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Update failed')
      onChanged()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed', description: e instanceof Error ? e.message : 'Error' })
    }
  }

  async function logContact() {
    setLogging(true)
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}/leads/${lead.id}/activities`, {
        method: 'POST',
        body: JSON.stringify({ action: 'contacted', detail: '' }),
      })
      if (!res.ok) throw new Error('Log failed')
      showToast({ variant: 'success', title: 'Contact logged', description: 'Last contact updated to now' })
      onChanged()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed', description: e instanceof Error ? e.message : 'Error' })
    } finally {
      setLogging(false)
    }
  }

  async function logCustom() {
    if (!logDetail.trim()) {
      showToast({ variant: 'warning', title: 'Add a detail', description: 'Describe what happened' })
      return
    }
    setLogging(true)
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}/leads/${lead.id}/activities`, {
        method: 'POST',
        body: JSON.stringify({ action: logAction, detail: logDetail.trim() }),
      })
      if (!res.ok) throw new Error('Log failed')
      setLogDetail('')
      showToast({ variant: 'success', title: 'Logged', description: 'Activity added' })
      onChanged()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed', description: e instanceof Error ? e.message : 'Error' })
    } finally {
      setLogging(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${lead.company_name} from this campaign?`)) return
    try {
      const res = await fetchApi(`/api/v1/campaigns/${campaignId}/leads/${lead.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Remove failed')
      onChanged()
    } catch (e) {
      showToast({ variant: 'error', title: 'Failed', description: e instanceof Error ? e.message : 'Error' })
    }
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-3 border-b border-white/5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white truncate">{lead.company_name}</h3>
            <LeadStatusBadge status={lead.status} />
            {lead.last_contact_at && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Calendar size={10} /> last {lead.last_contact_at.slice(0, 10)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1">
                <Globe size={11} /> {lead.website}
              </a>
            )}
            {lead.linkedin_url && (
              <span className="text-[11px] text-sky-400 inline-flex items-center gap-1 truncate max-w-[240px]">
                <Mail size={11} /> {lead.linkedin_url}
              </span>
            )}
            {lead.contact_source && (
              lead.contact_source_url ? (
                <a href={lead.contact_source_url} target="_blank" rel="noreferrer" className="text-[11px] text-slate-400 hover:text-indigo-300 inline-flex items-center gap-1">
                  Verified from {lead.contact_source.replace('_', ' ')}
                </a>
              ) : <span className="text-[11px] text-slate-400">Verified from {lead.contact_source.replace('_', ' ')}</span>
            )}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', lead.verification_status === 'verified' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
              {lead.verification_status.replace('_', ' ')}
            </span>
            <span className="text-[11px] text-slate-500">added by {lead.created_by_name || 'teammate'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={logContact}
              disabled={logging || lead.do_not_contact || lead.outreach_readiness === 'missing_contact_info'}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
            >
            {lead.do_not_contact ? 'Do not contact' : lead.outreach_readiness === 'missing_contact_info' ? 'Needs contact info' : 'Log contact'}
          </button>
          <select
            value={lead.status}
            onChange={(e) => changeStatus(e.target.value)}
            className="px-2 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <button onClick={remove} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Remove lead">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-4 grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Contact name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={cn(inputClass, 'mt-0.5')} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Role</label>
              <input value={contactRole} onChange={(e) => setContactRole(e.target.value)} className={cn(inputClass, 'mt-0.5')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Email</label>
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={cn(inputClass, 'mt-0.5')} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Phone</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={cn(inputClass, 'mt-0.5')} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Next follow-up</label>
              <input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} className={cn(inputClass, 'mt-0.5')} />
            </div>
            <button
              onClick={() => setNextFollowUp('')}
              className="self-end p-1.5 rounded-lg text-slate-500 hover:text-white text-xs"
              title="Clear follow-up date"
            >
              Clear
            </button>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(inputClass, 'mt-0.5 resize-y')} />
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5 flex-1">
          <select
            value={logAction}
            onChange={(e) => setLogAction(e.target.value)}
            className="px-2 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <input
            value={logDetail}
            onChange={(e) => setLogDetail(e.target.value)}
            placeholder="What happened…"
            className="flex-1 px-2.5 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={logCustom}
            disabled={logging}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
          >
            Log
          </button>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save
        </button>
      </div>
    </div>
  )
}

function ActivityLog({ activities, leads }: { activities: CampaignActivity[]; leads: CampaignLead[] }) {
  const leadName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const l of leads) map[l.id] = l.company_name
    return map
  }, [leads])

  if (activities.length === 0) return null

  return (
    <div className="glass rounded-xl p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
        <History size={15} className="text-indigo-400" />
        Team activity · {activities.length}
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg bg-slate-900/40 border border-white/5 px-3 py-2">
            <ActionBadge action={a.action} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-300">
                <span className="font-semibold text-white">{a.actor_name || 'Teammate'}</span>
                {a.lead_id && leadName[a.lead_id] && (
                  <span className="text-slate-500"> — {leadName[a.lead_id]}</span>
                )}
                {a.detail && <span className="text-slate-400"> · {a.detail}</span>}
              </p>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0">{a.created_at?.slice(0, 16).replace('T', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
