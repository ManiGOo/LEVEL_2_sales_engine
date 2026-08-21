import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { AccountListPage, CompanyPage } from '@/types/api'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronRight, Search, CircleDot, ListTree, ArrowUpDown, Download, Check, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/toast'
import { stageStatusMeta } from '@/lib/account'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 30

export default function SalesQualifiedView() {
  const { fetchApi } = useApi()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
    if (search) params.set('q', search)
    const res = await fetchApi(`/api/v1/accounts?${params.toString()}`)
    return (await res.json()) as AccountListPage
  }

  const { data, isFetching } = useQuery({
    queryKey: ['accounts', page, search],
    queryFn: load,
  })

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
        className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="relative w-full sm:flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search accounts by name…"
            className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors text-sm font-semibold text-white w-full sm:w-auto"
        >
          <Search size={14} />
          Search
        </button>
        <Button variant="secondary" size="default" onClick={() => setImportOpen(true)} className="w-full sm:w-auto">
          <Download size={14} />
          Import companies
        </Button>
      </form>

      <ImportCompaniesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false)
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
                    to={`/accounts/${acc.company_key}`}
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
                  <Link
                    to={`/accounts/${acc.company_key}`}
                    title="Edit workflow"
                    className="flex flex-col sm:flex-row items-stretch shrink-0"
                  >
                    <Button variant="outline" size="sm" className="w-full sm:w-auto h-full sm:self-center">
                      <Pencil size={14} /> Edit workflow
                    </Button>
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

function ImportCompaniesModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean
  onClose: () => void
  onImported: () => void
}) {
  const { fetchApi } = useApi()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isFetching } = useQuery({
    queryKey: ['import-companies', search],
    enabled: open,
    queryFn: async (): Promise<{ items: CompanyPage['items']; existing: Set<string> }> => {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      if (search) params.set('q', search)
      const res = await fetchApi(`/api/v1/companies/ranking?${params.toString()}`)
      const page = (await res.json()) as CompanyPage
      if (!page.items.length) return { items: [], existing: new Set() }
      const ex = await fetchApi('/api/v1/accounts/exists', {
        method: 'POST',
        body: JSON.stringify({ names: page.items.map((c) => c.name) }),
      })
      const exJson = (await ex.json()) as { existing: string[] }
      const existing = new Set(exJson.existing.map((n) => n.toLowerCase()))
      return { items: page.items, existing }
    },
  })

  const visible = (data?.items ?? []).filter((c) => !data?.existing.has(c.name.toLowerCase()))

  const importMutation = useMutation({
    mutationFn: async () => {
      const companies = (data?.items ?? [])
        .filter((c) => selected.has(c.company_key))
        .map((c) => ({ company_key: c.company_key, name: c.name, location: c.state || c.location }))
      if (!companies.length) return
      const res = await fetchApi('/api/v1/accounts/import', {
        method: 'POST',
        body: JSON.stringify({ companies }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Import failed')
      return (await res.json()) as { imported_count: number; skipped: string[] }
    },
    onSuccess: (result) => {
      if (result) {
        const skippedNote = result.skipped.length ? ` (${result.skipped.length} already present)` : ''
        showToast({
          variant: 'success',
          title: `Imported ${result.imported_count} compan${result.imported_count === 1 ? 'y' : 'ies'}`,
          description: `Added to Accounts${skippedNote}`,
        })
      }
      setSelected(new Set())
      onImported()
    },
    onError: (e: unknown) => showToast({ variant: 'error', title: 'Import failed', description: (e as Error).message }),
  })

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(q.trim())
  }

  return (
    <Modal open={open} onClose={onClose} title="Import companies into Accounts" className="max-w-2xl">
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-400">
          Pick CDSCO / S-FDA companies to add as Accounts. Imported companies can then be given a
          sales-process workflow. Companies already in Accounts are hidden from this list.
        </p>

        <form onSubmit={submitSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search CDSCO / S-FDA companies…"
              className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <Button type="submit" variant="secondary" size="default">
            Search
          </Button>
        </form>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin space-y-2">
          {isFetching ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 glass rounded-lg animate-pulse" />
              ))}
            </div>
          ) : visible.length > 0 ? (
            visible.map((c) => {
              const checked = selected.has(c.company_key)
              return (
                <label
                  key={c.company_key}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    checked ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-white/5 bg-slate-900/40 hover:bg-white/5'
                  )}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(c.company_key)} className="accent-indigo-500 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {[c.state || c.location, c.event_count ? `${c.event_count} signals` : null, `score ${c.score}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {checked && <Check size={16} className="text-indigo-400 shrink-0" />}
                </label>
              )
            })
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              {search ? 'No new companies found.' : 'All matching companies are already in Accounts.'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => importMutation.mutate()} disabled={selected.size === 0 || importMutation.isPending}>
              <Download size={14} /> {importMutation.isPending ? 'Importing…' : 'Import selected'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
