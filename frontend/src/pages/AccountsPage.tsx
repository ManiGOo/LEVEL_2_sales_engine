import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { CompanyPage } from '@/types/api'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import SegmentedTabs from '@/components/general/SegmentedTabs'
import { Building2, ChevronRight, AlertTriangle, Download, Loader2, FileSpreadsheet, Search, MapPin, Calendar, SlidersHorizontal, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showToast } from '@/components/ui/toast'
import SalesQualifiedView from '@/components/companies/SalesQualifiedView'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 30

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-900'
  if (rank === 2) return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800'
  if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-700 text-slate-900'
  return 'bg-slate-700 text-slate-300'
}

const selectCls =
  'bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors px-3 py-2'

export default function AccountsPage() {
  const { fetchApi } = useApi()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { tab = 'sales-qualified' } = useParams()
  
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState(false)

  const [year, setYear] = useState<string>('')
  const [state, setState] = useState<string>('')
  const [minScore, setMinScore] = useState<string>('')
  const [maxScore, setMaxScore] = useState<string>('')

  function clearFilters() {
    setYear('')
    setState('')
    setMinScore('')
    setMaxScore('')
    setPage(1)
  }

  const promoteMut = useMutation({
    mutationFn: async (company: any) => {
      const res = await fetchApi('/api/v1/accounts/import', {
        method: 'POST',
        body: JSON.stringify({
          companies: [{ company_key: company.company_key, name: company.name, location: company.location }]
        })
      })
      if (!res.ok) throw new Error('Failed to promote')
      return res.json()
    },
    onSuccess: (data) => {
      if (data.created.length > 0) {
        showToast({ title: `Promoted to Sales Qualified`, variant: 'success' })
        qc.invalidateQueries({ queryKey: ['accounts'] })
        qc.invalidateQueries({ queryKey: ['general-companies'] })
      } else {
        showToast({ title: 'Already Sales Qualified', variant: 'info' })
      }
    }
  })

  async function downloadExcel() {
    if (downloading) return
    setDownloading(true)
    try {
      const res = await fetchApi('/api/v1/reports/companies.xlsx')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Report generation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `sentinel-company-report-${stamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast({ variant: 'success', title: 'Excel downloaded', description: 'General List + NSQ tabs included' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Download failed'
      showToast({ variant: 'error', title: 'Download failed', description: msg })
    } finally {
      setDownloading(false)
    }
  }

  const { data, isFetching } = useQuery({
    queryKey: ['companies', 'ranking', page, search, year, state, minScore, maxScore],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      if (year) params.set('year', year)
      if (state) params.set('state', state)
      if (minScore) params.set('min_score', minScore)
      if (maxScore) params.set('max_score', maxScore)
      const res = await fetchApi(`/api/v1/companies/ranking?${params.toString()}`)
      return (await res.json()) as CompanyPage
    },
  })

  const years = data?.available_years ?? []
  const states = data?.available_states ?? []

  const pages = Math.max(data?.pages || 1, 1)

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(q.trim())
  }

  function go(delta: number) {
    const next = Math.min(Math.max(page + delta, 1), pages)
    if (next !== page) {
      setPage(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const start = (page - 1) * PAGE_SIZE + 1
  const shown = data?.items.length || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-slate-400 text-sm mt-1">
            {data?.total != null ? `${data.total.toLocaleString()} accounts` : 'All accounts'}
          </p>
        </div>
        <button
          onClick={downloadExcel}
          disabled={downloading}
          className="inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-semibold text-white"
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={16} />
          )}
          {downloading ? 'Generating…' : 'Download Excel'}
          {!downloading && <Download size={14} className="text-white/70" />}
        </button>
      </div>

      <SegmentedTabs
        tabs={[
          { key: 'sales-qualified', label: 'Sales Qualified' },
          { key: 'cdsco-s-fda', label: 'CDSCO / S-FDA' },
        ]}
        active={tab}
        onChange={(newTab: string) => navigate(`/accounts/${newTab}`)}
      />

      {tab === 'sales-qualified' ? (
        <SalesQualifiedView />
      ) : tab === 'cdsco-s-fda' ? (
      <>

      <form
        onSubmit={submitSearch}
        className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3"
      >
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search CDSCO / S-FDA companies by name…"
            className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 w-full sm:w-auto">
          <Calendar size={15} className="shrink-0" />
          <select
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1) }}
            className={cn(selectCls, 'flex-1 sm:flex-none')}
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 w-full sm:w-auto">
          <MapPin size={15} className="shrink-0" />
          <select
            value={state}
            onChange={(e) => { setState(e.target.value); setPage(1) }}
            className={cn(selectCls, 'flex-1 sm:flex-none')}
          >
            <option value="">All states / UTs</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            {data?.has_others && (
              <option value="__others__">Others (location unknown)</option>
            )}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 w-full sm:w-auto">
          <SlidersHorizontal size={15} className="shrink-0" />
          <input
            type="number"
            min={0}
            value={minScore}
            onChange={(e) => { setMinScore(e.target.value); setPage(1) }}
            placeholder="Min score"
            className={cn(selectCls, 'flex-1 sm:flex-none sm:w-24 min-w-0')}
          />
          <span className="text-slate-600">–</span>
          <input
            type="number"
            min={0}
            value={maxScore}
            onChange={(e) => { setMaxScore(e.target.value); setPage(1) }}
            placeholder="Max score"
            className={cn(selectCls, 'flex-1 sm:flex-none sm:w-24 min-w-0')}
          />
        </div>

        {(year || state || minScore || maxScore || search) && (
          <button
            type="button"
            onClick={() => { clearFilters(); setSearch(''); setQ('') }}
            className="px-3 py-2 rounded-lg text-sm text-slate-300 bg-slate-700/60 hover:bg-slate-700 transition-colors w-full sm:w-auto"
          >
            Clear
          </button>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors text-sm font-semibold text-white w-full sm:w-auto"
        >
          <Search size={14} />
          Search
        </button>
      </form>

      {!isFetching && data && data.total > 0 && (
        <Pagination
          page={data.page}
          pages={pages}
          start={start}
          shown={shown}
          total={data.total}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
      )}

      {isFetching ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 glass rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.items.map((company, i) => (
            <motion.div
              key={company.company_key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <Link
                to={`/accounts/cdsco-s-fda/${company.slug}`}
                className="glass glass-hover rounded-xl p-3 flex items-center gap-3 group transition-all"
              >
                <span
                  className={cn(
                    'w-8 h-8 shrink-0 rounded-full text-xs font-bold flex items-center justify-center',
                    rankBadge(start + i)
                  )}
                >
                  {start + i}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {company.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {company.event_count} signals · avg {company.avg_score}
                    {company.paper_count > 0 && ` · ${company.paper_count} paper-QMS`}
                    {company.state && ` · ${company.state}`}
                  </p>
                  {company.location && (
                    <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                      <MapPin size={10} className="inline -mt-0.5 mr-0.5" />
                      {company.location}
                    </p>
                  )}
                </div>
                {company.mandate_count > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full shrink-0">
                    <AlertTriangle size={11} />
                    {company.mandate_count} Mandates
                  </span>
                )}
                <div className="shrink-0 scale-90 sm:scale-100 hidden sm:block">
                  <ScoreGauge score={company.avg_score} />
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    promoteMut.mutate(company)
                  }}
                  disabled={promoteMut.isPending}
                  className="px-2 py-1.5 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium transition-colors shrink-0 flex items-center gap-1"
                  title="Promote to Sales Qualified"
                >
                  <ArrowUpRight size={13} />
                  Promote
                </button>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!isFetching && data && data.items.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No companies found{search ? ' matching your search' : ''}</p>
        </div>
      )}

      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pages={pages}
          start={start}
          shown={shown}
          total={data.total}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
      )}
      </>
      ) : null}
    </motion.div>
  )
}

