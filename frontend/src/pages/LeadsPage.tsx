import { useEffect, useMemo, useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Company, CompanyPage, Lead } from '@/types/api'
import { motion } from 'motion/react'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import {
  Building2,
  ChevronRight,
  Globe,
  Briefcase,
  Newspaper,
  Search,
  Loader2,
  AlertCircle,
  Users,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { LeadResultContent, LeadPlaceholderCard } from '@/components/leads/LeadResultContent'
import { showToast, dismissToast } from '@/components/ui/toast'
import SegmentedTabs from '@/components/general/SegmentedTabs'
import GeneralCompaniesView from '@/components/general/GeneralCompaniesView'

const PAGE_SIZE = 30
const MAX_SELECT = 10

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-900'
  if (rank === 2) return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800'
  if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-700 text-slate-900'
  return 'bg-slate-700 text-slate-300'
}

function StatusPill({ lead }: { lead: Lead | undefined }) {
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

function LeadResultCard({ lead }: { lead: Lead }) {
  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{lead.company_name}</h3>
          {lead.hiring_headline && (
            <p className="text-xs text-indigo-300/80 mt-0.5">{lead.hiring_headline}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead.hiring.length > 0 && (
            <a
              href={lead.hiring[0].url || '#'}
              target="_blank"
              rel="noreferrer"
              title={lead.hiring[0].title}
              className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
            >
              <Briefcase size={14} />
            </a>
          )}
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer"
              title={lead.website}
              className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
            >
              <Globe size={14} />
            </a>
          )}
        </div>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
          <Briefcase size={12} />
          Job openings · {lead.hiring.length}
        </p>
        {lead.hiring.length === 0 ? (
          <p className="text-xs text-slate-600">No current job postings found.</p>
        ) : (
          <ul className="space-y-1.5">
            {lead.hiring.slice(0, 3).map((h, i) => (
              <li key={`${h.title}-${i}`}>
                <a
                  href={h.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'flex items-start justify-between gap-2 text-xs',
                    h.url ? 'text-slate-300 hover:text-indigo-300 transition-colors' : 'text-slate-300'
                  )}
                >
                  <span className="min-w-0 truncate">{h.title}</span>
                  <span className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500">
                    {h.location && <span className="hidden sm:inline">{h.location}</span>}
                    {h.posted && <span>{h.posted}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lead.hiring_news.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
            <Newspaper size={12} />
            Hiring news
          </p>
          <ul className="space-y-1.5">
            {lead.hiring_news.slice(0, 2).map((n, i) => (
              <li key={`${n.url}-${i}`}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-slate-300 hover:text-indigo-300 transition-colors"
                >
                  <span className="font-medium">{n.title}</span>
                  <span className="text-[11px] text-slate-500">
                    {' '}
                    · {n.source || 'web'}
                    {n.date && ` · ${n.date}`}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CompanyCard({
  company,
  lead,
  rank,
  isSelected,
  disabled,
  onToggle,
  onOpen,
}: {
  company: Company
  lead: Lead | undefined
  rank: number
  isSelected: boolean
  disabled: boolean
  onToggle: (key: string) => void
  onOpen: (company: Company, lead: Lead | undefined) => void
}) {
  const key = company.company_key

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min((rank - 1) * 0.02, 0.3) }}
      layout
    >
      <div
        className={cn(
          'glass rounded-xl p-3 flex items-center gap-3 transition-all',
          isSelected ? 'ring-1 ring-indigo-500/40 bg-indigo-500/5' : 'glass-hover cursor-pointer'
        )}
      >
        <motion.div
          while-tap={{ scale: 0.92 }}
          className={cn(
            'shrink-0 flex items-center justify-center w-6 h-6 rounded-md',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) onToggle(key)
          }}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {
              if (!disabled) onToggle(key)
            }}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            className="accent-indigo-500 w-5 h-5 shrink-0 disabled:opacity-30"
            aria-hidden
          />
        </motion.div>

        <span
          className={cn(
            'w-7 h-7 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center',
            rankBadge(rank)
          )}
        >
          {rank}
        </span>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(company, lead)
          }}
        >
          <h3 className="text-sm font-semibold text-white truncate">{company.name}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {company.event_count} signals · avg {company.avg_score}
            {lead?.website && ' · website found'}
            {lead?.hiring && lead.hiring.length > 0 && ` · ${lead.hiring.length} jobs`}
          </p>
        </div>

        <StatusPill lead={lead} />
        <ScoreGauge score={company.score} size={32} showMaxLabel={false} className="hidden sm:flex" />
        <ChevronRight size={16} className="text-slate-600 shrink-0" />
      </div>
    </motion.div>
  )
}

export default function LeadsPage() {
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('discover')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [triggered, setTriggered] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<{ company: Company; lead: Lead | undefined } | null>(null)
  const progressToastRef = useRef<string | null>(null)
  const startedRunningRef = useRef(false)
  const completedToastRef = useRef(false)

  const { data } = useQuery({
    queryKey: ['companies', 'ranking', page],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/companies/ranking?page=${page}&page_size=${PAGE_SIZE}`)
      return (await res.json()) as CompanyPage
    },
  })

  const selectedKeys = useMemo(() => [...selected], [selected])

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
       title: 'Researching companies…',
       description: `${selectedKeys.length} company${selectedKeys.length > 1 ? 'ies' : ''} queued`,
       duration: 0,
     })
     try {
       const res = await fetchApi('/api/v1/leads/research', {
         method: 'POST',
         body: JSON.stringify({ company_keys: selectedKeys }),
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
       showToast({ variant: 'error', title: 'Research failed', description: msg })
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
        title: 'Research complete',
        description: `${completed} researched, ${failed} failed of ${results.length} total`,
      })
    } else {
      showToast({
        variant: 'success',
        title: 'Research complete',
        description: `${completed} of ${results.length} companies researched`,
      })
    }
  }, [triggered, anyRunning, selectedKeys, statusMap])

  function openModal(company: Company, lead: Lead | undefined) {
    setDetail({ company, lead })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setDetail(null)
  }

  const pages = Math.max(data?.pages || 1, 1)

  function go(delta: number) {
    const next = Math.min(Math.max(page + delta, 1), pages)
    if (next !== page) {
      setPage(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const start = (page - 1) * PAGE_SIZE + 1
  const shown = data?.items.length || 0
  const researchedResults = selectedKeys
    .map((k) => statusMap[k])
    .filter((l): l is Lead => !!l && l.status !== 'not_started')

  const hasSelection = selected.size > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="text-slate-400 text-sm">
          {data?.total != null ? `${data.total.toLocaleString()} companies` : 'All companies'} — pick
          up to {MAX_SELECT} and research them
        </p>
      </div>

      <SegmentedTabs
        tabs={[
          { key: 'discover', label: 'Discover' },
          { key: 'general', label: 'General leads' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'general' ? (
        <GeneralCompaniesView />
      ) : (
      <>

      {hasSelection && (
        <>
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 p-3 bg-slate-900/95 backdrop-blur border-t border-white/10">
            <div className="flex items-center gap-3">
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-slate-300"
              >
                <Users size={16} className="inline mr-1.5 text-indigo-400" />
                <span className="font-semibold text-white">{selected.size}</span>
                <span className="text-slate-500"> / {MAX_SELECT}</span>
              </motion.span>
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
                {triggered ? 'Re-research selected' : `Research (${selected.size})`}
              </button>
            </div>
          </div>

          <div className="hidden lg:block glass rounded-xl p-3 flex-wrap items-center justify-between gap-3 sticky top-3 z-30">
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
                {triggered ? 'Re-research selected' : `Research selected (${selected.size})`}
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

      <div className="space-y-2 pb-20 lg:pb-0">
        {!data && (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 glass rounded-xl animate-pulse" />
            ))}
          </div>
        )}
        {data?.items.map((company, i) => {
          const key = company.company_key
          const isSelected = selected.has(key)
          const lead = statusMap[key]
          const disabled = !isSelected && selected.size >= MAX_SELECT
          return (
            <CompanyCard
              key={key}
              company={company}
              lead={lead}
              rank={start + i}
              isSelected={isSelected}
              disabled={disabled}
              onToggle={toggle}
              onOpen={openModal}
            />
          )
        })}
      </div>

      {data && data.items.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No companies found</p>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-slate-400">
            {`Page ${data.page} / ${data.pages} · showing ${start}–${start + shown - 1} of ${data.total.toLocaleString()}`}
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

      {researchedResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 pt-2"
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search size={18} className="text-indigo-400" />
            Research results
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {researchedResults.map((lead) =>
              lead.status === 'running' ? (
                <div
                  key={lead.company_key}
                  className="glass rounded-xl p-4 flex items-center gap-3"
                >
                  <Loader2 size={18} className="animate-spin text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{lead.company_name}</p>
                    <p className="text-xs text-slate-500">Researching website, LinkedIn & hiring…</p>
                  </div>
                </div>
              ) : lead.status === 'failed' ? (
                <div
                  key={lead.company_key}
                  className="glass rounded-xl p-4 flex items-center gap-3 border border-red-500/20 bg-red-500/10"
                >
                  <AlertCircle size={18} className="text-red-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{lead.company_name}</p>
                    <p className="text-xs text-red-400 truncate">{lead.error || 'Research failed'}</p>
                  </div>
                </div>
              ) : (
                <button
                  key={lead.company_key}
                  onClick={() => {
                    const company = data?.items.find((c) => c.company_key === lead.company_key)
                    openModal(company || ({} as Company), lead)
                  }}
                  className="text-left"
                >
                  <LeadResultCard lead={lead} />
                </button>
              )
            )}
          </div>
        </motion.div>
      )}

      <Modal
        open={modalOpen}
        title={detail?.company?.name || ''}
        onClose={closeModal}
      >
        {detail &&
          (() => {
            const { company, lead } = detail
            if (!lead) return <LeadPlaceholderCard companyName={company?.name || 'Company'} />
            if (lead.status === 'running')
              return (
                <div className="p-6 text-center space-y-3">
                  <Loader2 size={28} className="mx-auto animate-spin text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">{lead.company_name}</h3>
                  <p className="text-sm text-slate-400">Researching website, LinkedIn & hiring…</p>
                </div>
              )
            if (lead.status === 'failed')
              return (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle size={28} className="mx-auto text-red-400" />
                  <h3 className="text-lg font-semibold text-white">{lead.company_name}</h3>
                  <p className="text-sm text-red-400">{lead.error || 'Research failed'}</p>
                </div>
              )
            return <LeadResultContent lead={lead} />
          })()}
      </Modal>
      </>
      )}
    </motion.div>
  )
}
