import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Eye,
  Copy,
  Send,
  CheckCircle2,
  Printer,
  Lock,
  History,
  RotateCcw,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/providers/AuthProvider'
import type { Quotation, QuotationInput, QuotationLineItem, QuotationVersionMeta, QuotationVersionDetail } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/toast'
import {
  computeTotals,
  lineTotal,
  formatMoney,
  emptyLineItem,
  canEditQuotation,
  QUOTATION_STATUS_VARIANT,
} from '@/lib/quotation'
import { CURRENCIES } from '@/lib/currencies'

type EditableItem = Omit<QuotationLineItem, 'line_total'>

export default function QuotationDetailPage() {
  const { id = '' } = useParams()
  const { fetchApi } = useApi()
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [form, setForm] = useState<{
    title: string
    currency: string
    status: Quotation['status']
    valid_until: string
    intro: string
    terms: string
    tax_pct: number | ''
    items: EditableItem[]
  } | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [editing, setEditing] = useState(true)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionPreviewHtml, setVersionPreviewHtml] = useState<string | null>(null)

  function applyEditable() {
    const doc = iframeRef.current?.contentDocument
    if (doc?.body) doc.body.contentEditable = editing ? 'true' : 'false'
  }

  useEffect(() => {
    applyEditable()
  }, [editing, previewHtml])

  async function load() {
    const res = await fetchApi(`/api/v1/quotations/${id}`)
    if (!res.ok) throw new Error('not found')
    return (await res.json()) as Quotation
  }

  const { data, isFetching } = useQuery({
    queryKey: ['quotation', id],
    queryFn: load,
    refetchInterval: 8000,
  })

  useEffect(() => {
    if (!data) return
    setForm({
      title: data.title,
      currency: data.currency,
      status: data.status,
      valid_until: data.valid_until || '',
      intro: data.intro || '',
      terms: data.terms || '',
      tax_pct: data.tax_pct ? data.tax_pct : '',
      items: data.line_items.map((it) => ({
        category: it.category,
        description: it.description,
        qty: it.qty,
        unit: it.unit,
        unit_price: it.unit_price,
        type: it.type,
        discount_pct: it.discount_pct,
      })),
    })
  }, [data?.id, data?.version])

  const editable = canEditQuotation(data ?? null, user?.id, user?.role)

  const totals = form
    ? computeTotals(form.items, form.tax_pct === '' ? 0 : form.tax_pct)
    : { subtotal: 0, discount_total: 0, tax_amount: 0, total: 0 }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: QuotationInput = {
        title: form!.title,
        currency: form!.currency,
        status: form!.status,
        valid_until: form!.valid_until || null,
        intro: form!.intro,
        terms: form!.terms,
        tax_pct: form!.tax_pct === '' ? 0 : form!.tax_pct,
        line_items: form!.items,
      }
      const res = await fetchApi(`/api/v1/quotations/${id}?expected_version=${data?.version ?? 0}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      if (res.status === 409) {
        throw new Error('CONFLICT')
      }
      if (!res.ok) throw new Error('save failed')
      return (await res.json()) as Quotation
    },
    onSuccess: (q) => {
      qc.setQueryData(['quotation', id], q)
      showToast({ variant: 'success', title: 'Quotation saved' })
    },
    onError: (e: Error) => {
      if (e.message === 'CONFLICT') {
        showToast({ variant: 'error', title: 'Saved by someone else — reloaded to latest' })
        qc.invalidateQueries({ queryKey: ['quotation', id] })
      } else {
        showToast({ variant: 'error', title: 'Could not save quotation' })
      }
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi(`/api/v1/quotations/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error()
      return (await res.json()) as Quotation
    },
    onSuccess: (q) => {
      showToast({ variant: 'success', title: 'Duplicated as draft' })
      navigate(`/quotations/${q.id}`)
    },
    onError: () => showToast({ variant: 'error', title: 'Could not duplicate' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi(`/api/v1/quotations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Quotation deleted' })
      navigate('/quotations')
    },
    onError: () => showToast({ variant: 'error', title: 'Could not delete' }),
  })

  async function openPreview() {
    const res = await fetchApi(`/api/v1/quotations/${id}/render`, {
      method: 'POST',
      body: JSON.stringify({
        title: form!.title,
        currency: form!.currency,
        status: form!.status,
        valid_until: form!.valid_until || null,
        intro: form!.intro,
        terms: form!.terms,
        tax_pct: form!.tax_pct === '' ? 0 : form!.tax_pct,
        line_items: form!.items,
      }),
    })
    if (!res.ok) return
    const body = (await res.json()) as { html: string }
    setPreviewHtml(body.html)
    setPreviewOpen(true)
  }

  const saveDocMutation = useMutation({
    mutationFn: async () => {
      const doc = iframeRef.current?.contentDocument
      const html = doc ? doc.documentElement.outerHTML : previewHtml || ''
      const res = await fetchApi(`/api/v1/quotations/${id}/document`, {
        method: 'POST',
        body: JSON.stringify({ html, expected_version: data?.version ?? 0 }),
      })
      if (res.status === 409) throw new Error('CONFLICT')
      if (!res.ok) throw new Error('save failed')
      return (await res.json()) as Quotation
    },
    onSuccess: (q) => {
      qc.setQueryData(['quotation', id], q)
      setPreviewHtml(q.html || '')
      showToast({ variant: 'success', title: 'Document changes saved' })
    },
    onError: (e: Error) => {
      if (e.message === 'CONFLICT') {
        showToast({ variant: 'error', title: 'Saved by someone else — reloaded to latest' })
        qc.invalidateQueries({ queryKey: ['quotation', id] })
      } else {
        showToast({ variant: 'error', title: 'Could not save document' })
      }
    },
  })

  const resetDocMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi(`/api/v1/quotations/${id}/document/reset`, { method: 'POST' })
      if (!res.ok) throw new Error()
      return (await res.json()) as Quotation
    },
    onSuccess: (q) => {
      qc.setQueryData(['quotation', id], q)
      showToast({ variant: 'success', title: 'Reverted to generated document' })
      openPreview()
    },
    onError: () => showToast({ variant: 'error', title: 'Could not reset document' }),
  })

  const versionsQuery = useQuery({
    queryKey: ['quotation-versions', id],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/quotations/${id}/versions`)
      if (!res.ok) throw new Error()
      return (await res.json()) as QuotationVersionMeta[]
    },
    enabled: false,
  })

  const restoreMutation = useMutation({
    mutationFn: async (version: number) => {
      const res = await fetchApi(`/api/v1/quotations/${id}/versions/${version}/restore`, {
        method: 'POST',
      })
      if (res.status === 409) throw new Error('CONFLICT')
      if (!res.ok) throw new Error()
      return (await res.json()) as Quotation
    },
    onSuccess: (q) => {
      qc.setQueryData(['quotation', id], q)
      qc.invalidateQueries({ queryKey: ['quotation-versions', id] })
      setVersionsOpen(false)
      showToast({ variant: 'success', title: 'Restored previous version' })
    },
    onError: (e: Error) => {
      if (e.message === 'CONFLICT') {
        showToast({ variant: 'error', title: 'Saved by someone else — reloaded to latest' })
        qc.invalidateQueries({ queryKey: ['quotation', id] })
      } else {
        showToast({ variant: 'error', title: 'Could not restore version' })
      }
    },
  })

  async function openVersionPreview(version: number) {
    const res = await fetchApi(`/api/v1/quotations/${id}/versions/${version}`)
    if (!res.ok) return
    const body = (await res.json()) as QuotationVersionDetail
    setVersionPreviewHtml(body.html || '')
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    if (!form) return
    setForm({ ...form, items: form.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) })
  }
  function addItem() {
    if (!form) return
    setForm({ ...form, items: [...form.items, emptyLineItem()] })
  }
  function removeItem(index: number) {
    if (!form) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  if (!data) {
    return <div className="text-slate-400 p-8">{isFetching ? 'Loading…' : 'Quotation not found'}</div>
  }
  if (!form) return <div className="text-slate-400 p-8">Loading…</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/quotations" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{form.title}</h1>
              <Badge variant={QUOTATION_STATUS_VARIANT[form.status]}>{form.status}</Badge>
              <span className="font-mono text-xs text-slate-400">{data.quote_number}</span>
            </div>
            <Link to={`/accounts/${data.company_key}`} className="text-sm text-indigo-300 hover:underline">
              {data.company_name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!editable && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-300">
              <Lock className="w-3.5 h-3.5" /> Read-only (owned by {data.owner_email || 'another rep'})
            </span>
          )}
          <Button variant="secondary" onClick={openPreview}>
            <Eye className="w-4 h-4" /> Preview
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              versionsQuery.refetch()
              setVersionsOpen(true)
            }}
          >
            <History className="w-4 h-4" /> History
          </Button>
          <Button variant="secondary" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
            <Copy className="w-4 h-4" /> Duplicate
          </Button>
          {editable && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
          <Button variant="ghost" className="text-red-300" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Proposal details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title">
                <input
                  disabled={!editable}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Currency">
                <select
                  disabled={!editable}
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  disabled={!editable}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Quotation['status'] })}
                  className={inputCls}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </Field>
              <Field label="Valid until">
                <input
                  type="date"
                  disabled={!editable}
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Tax %">
                <input
                  type="number"
                  step="0.01"
                  disabled={!editable}
                  value={form.tax_pct}
                  onChange={(e) =>
                    setForm({ ...form, tax_pct: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Executive overview">
                <textarea
                  rows={3}
                  disabled={!editable}
                  value={form.intro}
                  onChange={(e) => setForm({ ...form, intro: e.target.value })}
                  className={inputCls}
                  placeholder="Summarize the opportunity and proposed solution…"
                />
              </Field>
              <Field label="Payment terms & conditions">
                <textarea
                  rows={3}
                  disabled={!editable}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. 50% on kickoff, 50% on go-live. Net 30."
                />
              </Field>
            </div>
          </Section>

          <Section title="Line items">
            <div className="overflow-x-auto rounded-xl border border-slate-700/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 bg-slate-800/40">
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Description</th>
                    <th className="px-2 py-2 font-medium w-16">Qty</th>
                    <th className="px-2 py-2 font-medium">Unit</th>
                    <th className="px-2 py-2 font-medium w-24">Unit price</th>
                    <th className="px-2 py-2 font-medium w-28">Type</th>
                    <th className="px-2 py-2 font-medium w-16">Disc%</th>
                    <th className="px-2 py-2 font-medium w-24 text-right">Amount</th>
                    {editable && <th className="px-2 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it, i) => (
                    <tr key={i} className="border-t border-slate-700/40 align-top">
                      <td className="px-2 py-1">
                        <input disabled={!editable} value={it.category} onChange={(e) => updateItem(i, { category: e.target.value })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <textarea rows={1} disabled={!editable} value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" disabled={!editable} value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input disabled={!editable} value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" disabled={!editable} value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <select disabled={!editable} value={it.type} onChange={(e) => updateItem(i, { type: e.target.value as 'one_time' | 'recurring' })} className={cellCls}>
                          <option value="one_time">One-time</option>
                          <option value="recurring">Recurring</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" disabled={!editable} value={it.discount_pct} onChange={(e) => updateItem(i, { discount_pct: Number(e.target.value) })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1 text-right text-white font-semibold whitespace-nowrap">
                        {formatMoney(lineTotal(it), form.currency)}
                      </td>
                      {editable && (
                        <td className="px-2 py-1 text-right">
                          <button onClick={() => removeItem(i)} className="text-slate-500 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!form.items.length && (
                    <tr>
                      <td colSpan={editable ? 9 : 8} className="px-3 py-4 text-center text-slate-400">
                        No line items yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {editable && (
              <Button variant="secondary" className="mt-3" onClick={addItem}>
                <Plus className="w-4 h-4" /> Add line item
              </Button>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 sticky top-6">
            <h3 className="text-sm font-semibold text-white mb-3">Totals</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal, form.currency)} />
              <Row label="Discount" value={`- ${formatMoney(totals.discount_total, form.currency)}`} />
              <Row
                label={form.tax_pct === '' || form.tax_pct === 0 ? 'Tax' : `Tax (${form.tax_pct}%)`}
                value={form.tax_pct === '' || form.tax_pct === 0 ? 'As applicable' : formatMoney(totals.tax_amount, form.currency)}
              />
              <div className="pt-2 mt-2 border-t border-slate-700/60 flex items-center justify-between">
                <dt className="text-white font-bold">Total</dt>
                <dd className="text-white font-bold text-lg">{formatMoney(totals.total, form.currency)}</dd>
              </div>
            </dl>
            {editable && (
              <Button className="w-full mt-4" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="w-4 h-4" /> Save quotation
              </Button>
            )}
            {form.status !== 'sent' && form.status !== 'accepted' && editable && (
              <Button
                variant="secondary"
                className="w-full mt-2"
                onClick={() => {
                  setForm({ ...form, status: 'sent' })
                  setTimeout(() => saveMutation.mutate(), 0)
                }}
              >
                <Send className="w-4 h-4" /> Mark as sent
              </Button>
            )}
            {form.status === 'sent' && editable && (
              <Button
                variant="secondary"
                className="w-full mt-2"
                onClick={() => {
                  setForm({ ...form, status: 'accepted' })
                  setTimeout(() => saveMutation.mutate(), 0)
                }}
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as accepted
              </Button>
            )}
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 text-xs text-slate-400">
            Owner: <span className="text-slate-200">{data.owner_email || '—'}</span>
            <br />
            Version: <span className="text-slate-200">{data.version}</span>
          </div>
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Proposal preview" className="lg:max-w-5xl">
        {previewHtml && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Click any text in the proposal to tweak it, then Save document changes.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setEditing((e) => !e)}>
                  {editing ? 'Lock editing' : 'Edit document'}
                </Button>
                <Button variant="ghost" onClick={() => resetDocMutation.mutate()} disabled={resetDocMutation.isPending}>
                  Reset
                </Button>
                <Button variant="secondary" onClick={() => saveDocMutation.mutate()} disabled={saveDocMutation.isPending}>
                  {saveDocMutation.isPending ? 'Saving…' : 'Save document changes'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const w = iframeRef.current?.contentWindow
                    if (w) {
                      w.focus()
                      w.print()
                    }
                  }}
                >
                  <Printer className="w-4 h-4" /> Print / Save as PDF
                </Button>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              title="proposal"
              srcDoc={previewHtml}
              onLoad={() => applyEditable()}
              className="w-full h-[70vh] rounded-xl bg-white"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Version history"
        className="lg:max-w-2xl"
      >
        <div className="space-y-3">
          {versionsQuery.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {versionsQuery.data && versionsQuery.data.length === 0 && (
            <p className="text-sm text-slate-400">No versions recorded yet.</p>
          )}
          {versionsQuery.data?.map((v) => (
            <div
              key={v.version}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">Version {v.version}</div>
                <div className="text-xs text-slate-400 truncate">
                  {new Date(v.created_at).toLocaleString()} · {v.created_by_email || 'system'} ·{' '}
                  {formatMoney(v.total, data.currency)} · {v.status}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" onClick={() => openVersionPreview(v.version)} disabled={!v.has_html}>
                  Preview
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm(`Restore version ${v.version}? This will create a new version.`)) {
                      restoreMutation.mutate(v.version)
                    }
                  }}
                  disabled={restoreMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4" /> Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!versionPreviewHtml}
        onClose={() => setVersionPreviewHtml(null)}
        title="Version snapshot"
        className="lg:max-w-5xl"
      >
        {versionPreviewHtml && (
          <iframe
            title="snapshot"
            srcDoc={versionPreviewHtml}
            className="w-full h-[70vh] rounded-xl bg-white"
          />
        )}
      </Modal>
    </motion.div>
  )
}

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60'
const cellCls =
  'w-full bg-transparent text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1 py-1 disabled:opacity-60'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
      <h2 className="text-sm font-semibold text-white mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400 mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  )
}
