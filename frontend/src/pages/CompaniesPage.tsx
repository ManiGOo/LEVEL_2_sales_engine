import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { CompanyPage } from '@/types/api'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import { Building2, ChevronRight, AlertTriangle, Download, Loader2, FileSpreadsheet, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showToast } from '@/components/ui/toast'
import SegmentedTabs from '@/components/general/SegmentedTabs'
import GeneralCompaniesView from '@/components/general/GeneralCompaniesView'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 30

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-900'
  if (rank === 2) return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800'
  if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-700 text-slate-900'
  return 'bg-slate-700 text-slate-300'
}

export default function CompaniesPage() {
  const { fetchApi } = useApi()
  const [tab, setTab] = useState('automated')
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState(false)

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
    queryKey: ['companies', 'ranking', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      const res = await fetchApi(`/api/v1/companies/ranking?${params.toString()}`)
      return (await res.json()) as CompanyPage
    },
  })

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
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-slate-400 text-sm mt-1">
            {data?.total != null ? `${data.total.toLocaleString()} companies` : 'All companies'} ranked by lead score
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
          { key: 'automated', label: 'CDSCO / S-FDA' },
          { key: 'general', label: 'General' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'general' ? (
        <GeneralCompaniesView />
      ) : (
      <>

      <form onSubmit={submitSearch}>
        <div className="relative max-w-xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search CDSCO / S-FDA companies by name…"
            className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
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
                to={`/companies/${company.slug}`}
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
                  </p>
                </div>
                {company.mandate_count > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full shrink-0">
                    <AlertTriangle size={11} />
                    {company.mandate_count}
                  </span>
                )}
                <ScoreGauge score={company.score} size={32} showMaxLabel={false} />
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
      )}
    </motion.div>
  )
}

