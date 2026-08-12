import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { CampaignPage, CampaignSummary } from '@/types/api'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, Megaphone, ChevronRight, Search, Loader2, Users } from 'lucide-react'
import { showToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/Modal'
import LeadsPickerModal, { type LeadSeed } from '@/components/campaign/LeadsPickerModal'
import { CampaignStatusBadge } from '@/components/campaign/badges'

const PAGE_SIZE = 30

export default function CampaignsPage() {
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const { data, isFetching } = useQuery({
    queryKey: ['campaigns', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      const res = await fetchApi(`/api/v1/campaigns?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load campaigns')
      return (await res.json()) as CampaignPage
    },
  })

  const pages = Math.max(data?.pages || 1, 1)

  function go(delta: number) {
    const next = Math.min(Math.max(page + delta, 1), pages)
    if (next !== page) {
      setPage(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(q.trim())
  }

  async function handleCreated() {
    setCreating(false)
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    showToast({ variant: 'success', title: 'Campaign created', description: 'Open it to start tracking leads' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-slate-400 text-sm mt-1">
            Team CRM — build manual outreach campaigns from researched leads and track every touch.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition-colors text-sm font-semibold text-white"
        >
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      <form onSubmit={submitSearch} className="max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
      </form>

      {isFetching ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 glass rounded-xl animate-pulse" />)}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Megaphone size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No campaigns{search ? ' matching your search' : ''} yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Create a campaign from your researched leads and start tracking outreach manually.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.items.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-slate-400">
            Page {data.page} / {data.pages} · {data.total.toLocaleString()} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => go(-1)}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg text-sm font-semibold text-white"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => go(1)}
              disabled={page >= data.pages}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg text-sm font-semibold text-white"
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      <CreateCampaignModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
      />
    </motion.div>
  )
}

function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        to={`/campaigns/${campaign.id}`}
        className="glass glass-hover rounded-xl p-4 flex items-center gap-4 group transition-all"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
              {campaign.name}
            </h3>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          {campaign.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{campaign.description}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-1.5">
            <span className="inline-flex items-center gap-1 mr-3">
              <Users size={11} /> {campaign.lead_count} lead{campaign.lead_count !== 1 ? 's' : ''}
            </span>
            by {campaign.created_by_name || 'a teammate'} · updated {campaign.updated_at?.slice(0, 10)}
          </p>
        </div>
        <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
      </Link>
    </motion.div>
  )
}

function CreateCampaignModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { fetchApi } = useApi()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [objective, setObjective] = useState('')
  const [audience, setAudience] = useState('')
  const [offer, setOffer] = useState('')
  const [sender, setSender] = useState('')
  const [stopConditions, setStopConditions] = useState('Stop on reply, bounce, unsubscribe, or do-not-contact request.')
  const [channels, setChannels] = useState<string[]>(['email'])
  const [seeds, setSeeds] = useState<LeadSeed[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setError('')
    if (!name.trim()) {
      setError('Campaign name is required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetchApi('/api/v1/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          objective: objective.trim(),
          target_audience: audience.trim(),
          offer_context: offer.trim(),
          sender_identity: sender.trim(),
          approved_channels: channels,
          stop_conditions: stopConditions.trim(),
          leads: seeds,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Failed to create campaign')
      }
      setSeeds([])
      setName('')
      setDescription('')
      setObjective('')
      setAudience('')
      setOffer('')
      setSender('')
      setChannels(['email'])
      onCreated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg)
      showToast({ variant: 'error', title: 'Failed', description: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Campaign" className="lg:max-w-2xl">
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Campaign name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. QMS Outreach — North India"
            className="mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Sender identity</label>
            <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="e.g. sales@yourcompany.com" className="mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Approved channels</label>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
              {['email', 'linkedin'].map((channel) => <label key={channel} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={channels.includes(channel)} onChange={(e) => setChannels((prev) => e.target.checked ? [...prev, channel] : prev.filter((x) => x !== channel))} className="accent-indigo-500" /> {channel}</label>)}
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Stop conditions</label>
          <input value={stopConditions} onChange={(e) => setStopConditions(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Objective</label>
            <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g. Book QMS discovery calls" className="mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Target audience</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. QA and operations leaders" className="mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Offer and context</label>
          <textarea value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="What are we offering, and why is this company being contacted?" rows={2} className="mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-y" />
        </div>
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this campaign about? Who is it for?"
            rows={2}
            className="mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors resize-y"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Leads</label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
            >
              <Plus size={12} />
              Add leads
            </button>
          </div>
          {seeds.length === 0 ? (
            <p className="text-xs text-slate-500 mt-2">No leads yet — pick from your researched leads.</p>
          ) : (
            <div className="mt-2 rounded-xl glass divide-y divide-white/5">
              {seeds.map((s) => (
                <div key={s.company_key} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{s.company_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{s.contact_name}{s.contact_role ? ` · ${s.contact_role}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeeds((prev) => prev.filter((x) => x.company_key !== s.company_key))}
                    className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">{seeds.length} lead{seeds.length !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || seeds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Create campaign
            </button>
          </div>
        </div>
      </div>

      <LeadsPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={setSeeds} />
    </Modal>
  )
}
