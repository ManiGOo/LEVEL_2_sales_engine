import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Search, FileText, Plus, ArrowRight, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import type { QuotationListPage, AccountListPage, QuotationInput } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/toast'
import { formatMoney, QUOTATION_STATUS_VARIANT } from '@/lib/quotation'
import { CURRENCIES } from '@/lib/currencies'
import { QUOTATION_TEMPLATES, getTemplate } from '@/lib/quotationTemplates'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 30
type StatusFilter = '' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export default function QuotationsPage() {
  const { fetchApi } = useApi()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (search) params.set('q', search)
    if (status) params.set('status', status)
    const res = await fetchApi(`/api/v1/quotations?${params.toString()}`)
    return (await res.json()) as QuotationListPage
  }

  const { data } = useQuery({
    queryKey: ['quotations', page, pageSize, search, status],
    queryFn: load,
  })

  const createMutation = useMutation({
    mutationFn: async (input: QuotationInput) => {
      const res = await fetchApi('/api/v1/quotations', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Failed to create quotation')
      return (await res.json()) as { id: string }
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      setCreateOpen(false)
      navigate(`/quotations/${created.id}`)
    },
    onError: () => showToast({ variant: 'error', title: 'Could not create quotation' }),
  })

  const pages = Math.max(data?.pages || 1, 1)
  const start = (page - 1) * pageSize + 1
  const shown = data?.items.length || 0

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(q.trim())
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotations</h1>
          <p className="text-slate-400 text-sm mt-1">Generate branded proposals for each account or company lead.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New quotation
        </Button>
      </div>

      <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company or title..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter)
            setPage(1)
          }}
          className="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-x-auto">
        {!data?.items.length ? (
          <div className="p-10 text-center text-slate-400">
            <FileText className="w-9 h-9 mx-auto mb-2 opacity-50" />
            No quotations yet. Create one to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700/60">
                <th className="px-4 py-3 font-medium">Quote #</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-700/40 hover:bg-slate-800/60">
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{item.quote_number}</td>
                  <td className="px-4 py-3 text-white">{item.company_name}</td>
                  <td className="px-4 py-3 text-slate-300">{item.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant={QUOTATION_STATUS_VARIANT[item.status]}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{formatMoney(item.total, item.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/quotations/${item.id}`} className="text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pages > 1 && (
        <Pagination
          page={page}
          pages={pages}
          start={start}
          shown={shown}
          total={data.total}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pages, p + 1))}
          onPage={(p) => setPage(p)}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      <CreateQuotationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => createMutation.mutate(input)}
        loading={createMutation.isPending}
      />
    </motion.div>
  )
}

function CreateQuotationModal({
  open,
  onClose,
  onCreate,
  loading,
}: {
  open: boolean
  onClose: () => void
  onCreate: (input: QuotationInput) => void
  loading: boolean
}) {
  const { fetchApi } = useApi()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<AccountListPage | null>(null)
  const [selected, setSelected] = useState<{ company_key: string; company_name: string } | null>(null)
  const [templateId, setTemplateId] = useState('custom')
  const [currency, setCurrency] = useState('USD')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setQ('')
      setResults(null)
      setSelected(null)
      setDropdownOpen(false)
    }
  }, [open])

  useEffect(() => {
    const tpl = getTemplate(templateId)
    if (tpl?.defaults) setCurrency(tpl.defaults.currency)
  }, [templateId])

  // Debounced search-as-you-type against the accounts endpoint.
  useEffect(() => {
    if (!dropdownOpen) return
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: q.trim(), page_size: '20' })
        const res = await fetchApi(`/api/v1/accounts?${params.toString()}`)
        setResults((await res.json()) as AccountListPage)
      } catch {
        setResults(null)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, dropdownOpen])

  function confirm() {
    if (!selected) return
    const tpl = getTemplate(templateId)
    if (!tpl?.defaults) {
      onCreate({
        company_key: selected.company_key,
        company_name: selected.company_name,
        title: 'Commercial Proposal',
        currency,
        status: 'draft',
      })
      return
    }
    const d = tpl.defaults
    onCreate({
      company_key: selected.company_key,
      company_name: selected.company_name,
      title: d.title,
      currency: d.currency,
      tax_pct: d.tax_pct,
      intro: d.intro,
      terms: d.terms,
      scope: d.scope,
      notes: d.notes,
      line_items: d.line_items.map(it => ({ ...it, tax_pct: it.tax_pct || 0 })),
      status: 'draft',
    })
  }

  const showDropdown = dropdownOpen && (results?.items.length ? true : q.trim().length > 0)

  return (
    <Modal open={open} onClose={onClose} title="New quotation">
      <div className="p-6">
        <div className="mb-4">
        <label className="block text-xs font-medium text-slate-300 mb-1">Template</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {QUOTATION_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">
          {QUOTATION_TEMPLATES.find((t) => t.id === templateId)?.description}
        </p>
      </div>

      {templateId === 'custom' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-300 mb-1">Account / Company</label>
        {selected ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 text-indigo-200 px-3 py-1 text-sm">
            {selected.company_name}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="hover:text-white"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              placeholder="Search account / company..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {showDropdown && (
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                {results?.items.length ? (
                  results.items.map((a) => (
                    <button
                      key={a.company_key}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelected({ company_key: a.company_key, company_name: a.name })
                        setQ('')
                        setDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 border-b border-slate-800 last:border-0"
                    >
                      {a.name}
                    </button>
                  ))
                ) : results ? (
                  <p className="text-sm text-slate-400 px-3 py-3">No accounts found.</p>
                ) : (
                  <p className="text-sm text-slate-400 px-3 py-3">Searching…</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={confirm} disabled={!selected || loading}>
          {loading ? 'Creating...' : 'Create draft'}
        </Button>
      </div>
      </div>
    </Modal>
  )
}
