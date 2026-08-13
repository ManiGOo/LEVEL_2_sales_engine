import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { GeneralCompany, GeneralCompanyPage } from '@/types/api'
import { motion } from 'motion/react'
import { Plus, Building2, Globe, Search, Trash2, Users, Briefcase, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import AddCompanyModal from './AddCompanyModal'
import { showToast } from '@/components/ui/toast'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 30

export default function GeneralCompaniesView() {
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['general-companies', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      const res = await fetchApi(`/api/v1/general-companies?${params.toString()}`)
      return (await res.json()) as GeneralCompanyPage
    },
  })

  const pages = Math.max(data?.pages || 1, 1)
  const start = (page - 1) * PAGE_SIZE + 1

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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['general-companies'] })
  }

  async function handleDelete(gc: GeneralCompany) {
    if (deleting) return
    if (!window.confirm(`Delete "${gc.name}"? This is visible to all users.`)) return
    setDeleting(gc.company_key)
    try {
      const res = await fetchApi(`/api/v1/general-companies/${gc.company_key}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).detail || 'Delete failed')
      showToast({ variant: 'success', title: 'Deleted', description: `${gc.name} removed` })
      invalidate()
    } catch (e) {
      showToast({ variant: 'error', title: 'Delete failed', description: e instanceof Error ? e.message : 'Error' })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <form onSubmit={submitSearch} className="flex-1">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies by name, industry or location…"
              className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors"
            />
          </div>
        </form>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition-colors text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add company
        </button>
      </div>

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
          <p className="text-slate-400">No general companies{search ? ' matching your search' : ''} yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Add companies your team found — they become visible to all users.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.items.map((gc) => (
            <motion.div
              key={gc.company_key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="glass glass-hover rounded-xl p-3 flex items-center gap-3 group transition-all">
                <Link
                  to={`/companies/general/${gc.company_key}`}
                  className="flex-1 min-w-0 text-left"
                  title="View details"
                >
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {gc.name}
                  </h3>
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
                </Link>
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
                      <Users size={12} /> {gc.decision_makers.length}
                    </span>
                  )}
                  {(gc.hiring?.length ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Briefcase size={12} /> {gc.hiring.length} jobs
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleDelete(gc)}
                  disabled={deleting === gc.company_key}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
              </div>
            </motion.div>
          ))}
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

      <AddCompanyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false)
          setPage(1)
          invalidate()
        }}
      />
    </div>
  )
}