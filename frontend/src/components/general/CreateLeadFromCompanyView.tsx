import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { GeneralCompany, GeneralCompanyPage, Lead } from '@/types/api'
import { motion } from 'motion/react'
import {
  Building2,
  Briefcase,
  Globe,
  Search,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { LeadResultContent } from '@/components/leads/LeadResultContent'
import { showToast, dismissToast } from '@/components/ui/toast'

const PAGE_SIZE = 30
const MAX_SELECT = 10

function LeadStatusPill({ lead }: { lead: Lead | undefined }) {
  if (!lead) return <span className="text-[11px] text-slate-600 shrink-0">—</span>
  if (lead.status === 'running')
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full shrink-0">
        <Loader2 size={11} className="animate-spin" />
        Researching…
      </span>
    )
  if (lead.status === 'failed')
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full shrink-0">
        <AlertCircle size={11} />
        Failed
      </span>
    )
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0">
      <CheckCircle2 size={11} />
      Researched
    </span>
  )
}

export default function CreateLeadFromCompanyView() {
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [triggered, setTriggered] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState('')
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const progressToastRef = useRef<string | null>(null)
  const startedRunningRef = useRef(false)
  const completedToastRef = useRef(false)

  const { data, isFetching } = useQuery({
    queryKey: ['general-companies', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      const res = await fetchApi(`/api/v1/general-companies?${params.toString()}`)
      return (await res.json()) as GeneralCompanyPage
    },
  })

  const companyByKey = useMemo(() => {
    const map: Record<string, GeneralCompany> = {}
    for (const gc of data?.items || []) map[gc.company_key] = gc
    return map
  }, [data])

  const selectedKeys = useMemo(() => [...selected], [selected])
  const selectedCompanies = useMemo(
    () => selectedKeys.map((k) => companyByKey[k]).filter((c): c is GeneralCompany => !!c),
    [selectedKeys, companyByKey]
  )

  const { data: statusData } = useQuery({
    queryKey: ['leads', 'status'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/leads/status')
      return (await res.json()) as { items: Lead[] }
    },
    refetchInterval: polling ? 4000 : false,
  })

  const statusMap = useMemo(() => {
    const map: Record<string, Lead> = {}
    for (const l of statusData?.items || []) map[l.company_key] = l
    return map
  }, [statusData])

  const anyRunning = useMemo(
    () => triggered && selectedKeys.some((k) => statusMap[k]?.status === 'running'),
    [triggered, selectedKeys, statusMap]
  )

  useEffect(() => {
    if (anyRunning) setPolling(true)
    else if (polling) setPolling(false)
  }, [anyRunning, polling])

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

  function toggle(key: string) {
    setError('')
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else if (next.size < MAX_SELECT) next.add(key)
      return next
    })
  }

  async function research() {
    if (selectedKeys.length === 0) return
    setError('')
    if (progressToastRef.current) {
      dismissToast(progressToastRef.current)
      progressToastRef.current = null
    }
    startedRunningRef.current = false
    completedToastRef.current = false
    progressToastRef.current = showToast({
      variant: 'progress',
      title: 'Creating leads…',
      description: `${selectedKeys.length} compan${selectedKeys.length > 1 ? 'ies' : 'y'} queued for research`,
      duration: 0,
    })
    try {
      const res = await fetchApi('/api/v1/leads/research', {
        method: 'POST',
        body: JSON.stringify({
          company_keys: selectedKeys,
          companies: selectedCompanies.map((c) => ({ company_key: c.company_key, company_name: c.name })),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Research request failed')
      }
      setTriggered(true)
      queryClient.invalidateQueries({ queryKey: ['leads', 'status'] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg)
      if (progressToastRef.current) {
        dismissToast(progressToastRef.current)
        progressToastRef.current = null
      }
      showToast({ variant: 'error', title: 'Lead creation failed', description: msg })
    }
  }

  useEffect(() => {
    if (!triggered || selectedKeys.length === 0) return
    if (anyRunning) {
      startedRunningRef.current = true
      return
    }
    if (!startedRunningRef.current || completedToastRef.current) return
    completedToastRef.current = true
    if (progressToastRef.current) {
      dismissToast(progressToastRef.current)
      progressToastRef.current = null
    }
    const results = selectedKeys.map((k) => statusMap[k]).filter((l): l is Lead => !!l)
    const completed = results.filter((l) => l.status === 'completed').length
    const failed = results.filter((l) => l.status === 'failed').length
    if (failed > 0) {
      showToast({
        variant: 'warning',
        title: 'Lead research complete',
        description: `${completed} researched, ${failed} failed of ${results.length} total`,
      })
    } else {
      showToast({
        variant: 'success',
        title: 'Lead research complete',
        description: `${completed} of ${results.length} companies researched`,
      })
    }
  }, [triggered, anyRunning, selectedKeys, statusMap])

  const hasSelection = selected.size > 0
  const start = (page - 1) * PAGE_SIZE + 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <form onSubmit={submitSearch} className="flex-1">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your team's companies by name, industry or location…"
              className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors"
            />
          </div>
        </form>
        <p className="text-xs text-slate-500 sm:text-right">
          Pick up to {MAX_SELECT} companies your team added and turn them into researched leads.
        </p>
      </div>

      {hasSelection && (
        <>
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 p-3 bg-slate-900/95 backdrop-blur border-t border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                <Users size={16} className="inline mr-1.5 text-indigo-400" />
                <span className="font-semibold text-white">{selected.size}</span>
                <span className="text-slate-500"> / {MAX_SELECT}</span>
              </span>
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={research}
                disabled={selected.size === 0}
                className="ml-auto px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-semibold text-white"
              >
                {triggered ? 'Re-research' : 'Create leads'}
              </button>
            </div>
          </div>

          <div className="hidden lg:flex glass rounded-xl p-3 items-center justify-between gap-3 sticky top-3 z-30">
            <span className="text-sm text-slate-300">
              <Users size={15} className="inline mr-1.5 text-indigo-400" />
              <span className="font-semibold text-white">{selected.size}</span>
              <span className="text-slate-500"> / {MAX_SELECT} selected</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={research}
                disabled={selected.size === 0}
                className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-semibold text-white"
              >
                {triggered ? 'Re-research selected' : `Create leads (${selected.size})`}
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="glass rounded-xl p-3 border border-red-500/20 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {!isFetching && data && data.total > 0 && (
        <Pagination
          page={data.page}
          pages={pages}
          start={start}
          shown={data.items.length}
          total={data.total}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
      )}

      {isFetching ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 glass rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">
            No team companies{search ? ' matching your search' : ''} yet
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Create companies on the <span className="text-indigo-300">Companies</span> page first —
            they will show up here so you can research them as leads.
          </p>
        </div>
      ) : (
        <div className="space-y-2 pb-20 lg:pb-0">
          {data?.items.map((gc, i) => {
            const key = gc.company_key
            const isSelected = selected.has(key)
            const disabled = !isSelected && selected.size >= MAX_SELECT
            const lead = statusMap[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <div
                  className={cn(
                    'glass rounded-xl p-3 flex items-center gap-3 transition-all',
                    isSelected ? 'ring-1 ring-indigo-500/40 bg-indigo-500/5' : 'glass-hover'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(key)}
                    disabled={disabled}
                    className="accent-indigo-500 w-5 h-5 shrink-0 disabled:opacity-30"
                  />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (lead?.status === 'completed') setDetailLead(lead)
                    }}
                    title={lead?.status === 'completed' ? 'View lead details' : undefined}
                  >
                    <h3 className="text-sm font-semibold text-white truncate">{gc.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {[
                        gc.industry,
                        gc.location,
                        gc.decision_makers?.length
                          ? `${gc.decision_makers.length} contact${gc.decision_makers.length > 1 ? 's' : ''}`
                          : null,
                        gc.hiring?.length
                          ? `${gc.hiring.length} job${gc.hiring.length > 1 ? 's' : ''}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No extra details'}
                    </p>
                  </div>
                  {gc.website && (
                    <a
                      href={gc.website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors shrink-0"
                      title={gc.website}
                    >
                      <Globe size={14} />
                    </a>
                  )}
                  <span className="hidden sm:inline-flex items-center gap-3 text-slate-500 text-xs shrink-0">
                    {(gc.decision_makers?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <UserCircle size={12} /> {gc.decision_makers.length}
                      </span>
                    )}
                    {(gc.hiring?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Briefcase size={12} /> {gc.hiring.length} jobs
                      </span>
                    )}
                  </span>
                  <LeadStatusPill lead={lead} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pages={pages}
          start={start}
          shown={data.items.length}
          total={data.total}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
      )}

      {triggered && selectedKeys.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 pt-2"
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search size={18} className="text-indigo-400" />
            Research status
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedKeys.map((key) => {
              const gc = companyByKey[key]
              const lead = statusMap[key]
              const name = gc?.name || lead?.company_name || key
              if (!lead || lead.status === 'not_started')
                return (
                  <div key={key} className="glass rounded-xl p-4 flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{name}</p>
                      <p className="text-xs text-slate-500">Queued…</p>
                    </div>
                  </div>
                )
              if (lead.status === 'running')
                return (
                  <div key={key} className="glass rounded-xl p-4 flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{name}</p>
                      <p className="text-xs text-slate-500">Researching website, LinkedIn & hiring…</p>
                    </div>
                  </div>
                )
              if (lead.status === 'failed')
                return (
                  <div
                    key={key}
                    className="glass rounded-xl p-4 flex items-center gap-3 border border-red-500/20 bg-red-500/10"
                  >
                    <AlertCircle size={18} className="text-red-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{name}</p>
                      <p className="text-xs text-red-400 truncate">{lead.error || 'Research failed'}</p>
                    </div>
                  </div>
                )
              return (
                <button key={key} onClick={() => setDetailLead(lead)} className="text-left">
                  <div className="glass glass-hover rounded-xl p-4 flex items-center gap-3 transition-all">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{name}</p>
                      <p className="text-xs text-slate-500">Researched — click to view lead</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      <Modal open={!!detailLead} title={detailLead?.company_name || ''} onClose={() => setDetailLead(null)}>
        {detailLead && <LeadResultContent lead={detailLead} />}
      </Modal>
    </div>
  )
}
