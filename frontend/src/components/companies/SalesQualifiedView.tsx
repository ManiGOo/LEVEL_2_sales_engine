import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { AccountListPage } from '@/types/api'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronRight, Search, CircleDot, ListTree, ArrowUpDown, Calendar, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { stageStatusMeta } from '@/lib/account'
import Pagination from '@/components/ui/Pagination'
import CreateAccountModal from './CreateAccountModal'

const PAGE_SIZE = 30

const selectCls =
  'bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors px-3 py-2'

export default function SalesQualifiedView({ onTotalChange }: { onTotalChange?: (total: number) => void }) {
  const { fetchApi } = useApi()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [source, setSource] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
    if (search) params.set('q', search)
    if (year) params.set('year', year)
    if (source) params.set('source', source)
    const res = await fetchApi(`/api/v1/accounts?${params.toString()}`)
    return (await res.json()) as AccountListPage
  }

  const { data, isFetching } = useQuery({
    queryKey: ['accounts', page, search, year, source],
    queryFn: load,
  })

  useEffect(() => {
    if (data?.total !== undefined && onTotalChange) {
      onTotalChange(data.total)
    }
  }, [data?.total, onTotalChange])

  const years = data?.available_years ?? []
  const sources = data?.available_sources ?? []

  const pages = Math.max(data?.pages || 1, 1)
  const start = (page - 1) * PAGE_SIZE + 1
  const shown = data?.items.length || 0

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      <form
        onSubmit={submitSearch}
        className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3"
      >
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search accounts by name…"
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
            {years.map((y: string) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 w-full sm:w-auto">
          <Filter size={15} className="shrink-0" />
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1) }}
            className={cn(selectCls, 'flex-1 sm:flex-none')}
          >
            <option value="">All sources</option>
            {sources.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {(year || source || search) && (
          <button
            type="button"
            onClick={() => { setYear(''); setSource(''); setSearch(''); setQ(''); setPage(1) }}
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
        <Button type="button" variant="secondary" size="default" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <CircleDot size={14} />
          Create Account
        </Button>
      </form>

      <CreateAccountModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          qc.invalidateQueries({ queryKey: ['accounts'] })
        }}
      />

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
            <div key={i} className="h-20 glass rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((acc, i) => {
            const meta = acc.current_stage ? stageStatusMeta(acc.current_stage.status) : null
            return (
              <motion.div
                key={acc.company_key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <Link
                    to={`/accounts/sales-qualified/${acc.company_key}`}
                    className="glass glass-hover rounded-xl p-4 flex items-center gap-4 group transition-all flex-1"
                  >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {acc.name}
                      </h3>
                      <span className="text-[11px] text-slate-500 shrink-0 inline-flex items-center gap-1">
                        <ListTree size={12} /> {acc.total_stages} stage{acc.total_stages === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Banner: current stage in the sales process */}
                    {acc.current_stage && meta ? (
                      <div
                        className={cn(
                          'mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 ring-1',
                          meta.ring,
                          'bg-slate-900/40'
                        )}
                      >
                        <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
                        <span className="text-xs font-semibold text-white">{acc.current_stage.name}</span>
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                        {acc.current_stage.objective && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[320px] hidden sm:inline">
                            — {acc.current_stage.objective}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-slate-800/40 ring-1 ring-white/5">
                        <CircleDot size={13} className="text-slate-500" />
                        <span className="text-xs text-slate-500">No workflow stages yet</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 hidden sm:block" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {!isFetching && data && data.items.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <ArrowUpDown size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No accounts found{search ? ' matching your search' : ''}</p>
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
    </motion.div>
  )
}


