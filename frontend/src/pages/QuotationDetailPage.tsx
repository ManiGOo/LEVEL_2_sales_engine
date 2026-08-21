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
  LayoutTemplate,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/providers/AuthProvider'
import type { Quotation, QuotationInput, QuotationLineItem, QuotationVersionMeta, QuotationVersionDetail, QuotationModule } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { ModuleEditor } from '@/components/ui/ModuleEditor'
import { showToast } from '@/components/ui/toast'
import {
  computeTotals,
  lineTotal,
  formatMoney,
  emptyLineItem,
  emptySubscriptionItem,
  canEditQuotation,
  QUOTATION_STATUS_VARIANT,
} from '@/lib/quotation'
import { CURRENCIES } from '@/lib/currencies'
import { QUOTATION_TEMPLATES, getTemplate } from '@/lib/quotationTemplates'

type EditableItem = Omit<QuotationLineItem, 'line_total'>

const UNIT_OPTIONS = [
  'year',
  'month',
  'quarter',
  'half-year',
  'license',
  'seat',
  'user',
  'project',
  'one-time',
  'hour',
]

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
    quotation_date: string
    valid_until: string
    intro: string
    terms: string
    scope: string
    modules: QuotationModule[]
    tax_pct: number | ''
    items: EditableItem[]
    buyer_signatory_name: string
    buyer_signatory_title: string
    buyer_signatory_date: string
    seller_signatory_name: string
    seller_signatory_title: string
    seller_signatory_date: string
  } | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [editing, setEditing] = useState(true)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionPreviewHtml, setVersionPreviewHtml] = useState<string | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  function applyEditable() {
    const doc = iframeRef.current?.contentDocument
    if (doc?.body) doc.body.contentEditable = editing ? 'true' : 'false'
  }

  function handleIframeLoad() {
    applyEditable()
    const doc = iframeRef.current?.contentDocument
    if (doc && editing) {
      doc.addEventListener('input', () => {
        const introEl = doc.querySelector('[data-field="intro"]') as HTMLElement | null
        const termsEl = doc.querySelector('[data-field="terms"]') as HTMLElement | null
        const scopeEl = doc.querySelector('[data-field="scope"]') as HTMLElement | null
        setForm((prev) =>
          prev
            ? {
                ...prev,
                intro: introEl ? introEl.innerHTML : prev.intro,
                terms: termsEl ? termsEl.innerHTML : prev.terms,
                scope: scopeEl ? scopeEl.innerHTML : prev.scope,
              }
            : prev,
        )
      })
    }
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
      quotation_date: data.quotation_date || '',
      valid_until: data.valid_until || '',
      intro: data.intro || '',
      terms: data.terms || '',
      scope: data.scope || '',
      modules: data.modules || [],
      tax_pct: data.tax_pct ? data.tax_pct : '',
      items: data.line_items.map((it) => ({
        category: it.category,
        description: it.description,
        qty: it.qty,
        unit: it.unit,
        unit_price: it.unit_price,
        type: it.type,
        discount_pct: it.discount_pct,
        tax_pct: it.tax_pct || 0,
      })),
      buyer_signatory_name: data.buyer_signatory_name || '',
      buyer_signatory_title: data.buyer_signatory_title || '',
      buyer_signatory_date: data.buyer_signatory_date || '',
      seller_signatory_name: data.seller_signatory_name || '',
      seller_signatory_title: data.seller_signatory_title || '',
      seller_signatory_date: data.seller_signatory_date || '',
    })
  }, [data?.id, data?.version])

  const editable = canEditQuotation(data ?? null, user?.id, user?.role)

  const totals = form
    ? computeTotals(form.items)
    : { subtotal: 0, discount_total: 0, tax_amount: 0, total: 0 }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: QuotationInput = {
        title: form!.title,
        currency: form!.currency,
        status: form!.status,
        quotation_date: form!.quotation_date || null,
        valid_until: form!.valid_until || null,
        intro: form!.intro,
        terms: form!.terms,
        scope: form!.scope,
        modules: form!.modules,
        tax_pct: form!.tax_pct === '' ? 0 : form!.tax_pct,
        line_items: form!.items,
        buyer_signatory_name: form!.buyer_signatory_name || null,
        buyer_signatory_title: form!.buyer_signatory_title || null,
        buyer_signatory_date: form!.buyer_signatory_date || null,
        seller_signatory_name: form!.seller_signatory_name || null,
        seller_signatory_title: form!.seller_signatory_title || null,
        seller_signatory_date: form!.seller_signatory_date || null,
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
        quotation_date: form!.quotation_date || null,
        valid_until: form!.valid_until || null,
        intro: form!.intro,
        terms: form!.terms,
        scope: form!.scope,
        modules: form!.modules,
        tax_pct: form!.tax_pct === '' ? 0 : form!.tax_pct,
        line_items: form!.items,
        buyer_signatory_name: form!.buyer_signatory_name || null,
        buyer_signatory_title: form!.buyer_signatory_title || null,
        buyer_signatory_date: form!.buyer_signatory_date || null,
        seller_signatory_name: form!.seller_signatory_name || null,
        seller_signatory_title: form!.seller_signatory_title || null,
        seller_signatory_date: form!.seller_signatory_date || null,
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

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi(`/api/v1/quotations/${id}/pdf`, {
        method: 'POST',
        body: JSON.stringify({
          title: form!.title,
          currency: form!.currency,
          status: 'draft',
          quotation_date: form!.quotation_date || null,
          valid_until: form!.valid_until || null,
        intro: form!.intro,
        terms: form!.terms,
        scope: form!.scope,
        modules: form!.modules,
        tax_pct: form!.tax_pct === '' ? 0 : form!.tax_pct,
        line_items: form!.items,
        buyer_signatory_name: form!.buyer_signatory_name || null,
        buyer_signatory_title: form!.buyer_signatory_title || null,
        buyer_signatory_date: form!.buyer_signatory_date || null,
        seller_signatory_name: form!.seller_signatory_name || null,
        seller_signatory_title: form!.seller_signatory_title || null,
        seller_signatory_date: form!.seller_signatory_date || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate PDF')
      return await res.blob()
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Quotation-${data?.quote_number || id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showToast({ variant: 'success', title: 'PDF Downloaded' })
    },
    onError: () => showToast({ variant: 'error', title: 'Could not generate PDF' }),
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
  function addItem(item?: EditableItem) {
    if (!form) return
    setForm({ ...form, items: [...form.items, item ?? emptyLineItem()] })
  }
  function removeItem(index: number) {
    if (!form) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  function applyTemplate(templateId: string) {
    const tpl = getTemplate(templateId)
    if (!tpl?.defaults || !form) return
    const d = tpl.defaults
    if (
      !window.confirm(
        `Apply the "${tpl.name}" template? This replaces the title, currency, pricing, modules, and line items with the template defaults.`,
      )
    ) {
      return
    }
    setForm((prev) =>
      prev
        ? {
            ...prev,
            title: d.title,
            currency: d.currency,
            tax_pct: d.tax_pct,
            intro: d.intro,
            terms: d.terms,
            scope: d.scope,
            modules: d.modules.map((m) => ({
              title: m.title,
              icon: m.icon,
              category: m.category || '',
              items: m.items.map((it) => ({ title: it.title, description: it.description || '' })),
            })),
            items: d.line_items.map((li) => ({
              category: li.category,
              description: li.description,
              qty: li.qty,
              unit: li.unit,
              unit_price: li.unit_price,
              type: li.type,
              discount_pct: li.discount_pct,
              tax_pct: li.tax_pct || 0,
            })),
          }
        : prev,
    )
    setTemplateModalOpen(false)
    showToast({ variant: 'info', title: 'Template applied — review and Save' })
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
          {editable && (
            <Button variant="secondary" onClick={() => setTemplateModalOpen(true)}>
              <LayoutTemplate className="w-4 h-4" /> Change template
            </Button>
          )}
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
                    <option key={c.code} value={c.code} className={optionCls}>
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
                  <option value="draft" className={optionCls}>Draft</option>
                  <option value="sent" className={optionCls}>Sent</option>
                  <option value="accepted" className={optionCls}>Accepted</option>
                  <option value="rejected" className={optionCls}>Rejected</option>
                  <option value="expired" className={optionCls}>Expired</option>
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  disabled={!editable}
                  value={form.quotation_date}
                  onChange={(e) => setForm({ ...form, quotation_date: e.target.value })}
                  className={inputCls}
                />
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

            </div>
            <div className="mt-4 space-y-3">
              <Field label="Executive overview">
                <RichTextEditor
                  value={form.intro}
                  disabled={!editable}
                  onChange={(html) => setForm({ ...form, intro: html })}
                />
              </Field>
              <Field label="Functional Scope & Architecture">
                <RichTextEditor
                  value={form.scope}
                  disabled={!editable}
                  onChange={(html) => setForm({ ...form, scope: html })}
                />
              </Field>
              <Field label="Scope Modules (Grid Cards)">
                <ModuleEditor
                  modules={form.modules}
                  onChange={(mods) => setForm({ ...form, modules: mods })}
                  disabled={!editable}
                />
              </Field>
              <Field label="Payment terms & conditions">
                <RichTextEditor
                  value={form.terms}
                  disabled={!editable}
                  onChange={(html) => setForm({ ...form, terms: html })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Acceptance & Authorization">
            <p className="text-xs text-slate-400 mb-3">
              Signature block shown in section 5 of the proposal. The Seller Representative is your side.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300">Buyer — Accepted &amp; Approved By</h4>
                <Field label="Name">
                  <input
                    disabled={!editable}
                    value={form.buyer_signatory_name}
                    onChange={(e) => setForm({ ...form, buyer_signatory_name: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Title">
                  <input
                    disabled={!editable}
                    value={form.buyer_signatory_title}
                    onChange={(e) => setForm({ ...form, buyer_signatory_title: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    disabled={!editable}
                    value={form.buyer_signatory_date}
                    onChange={(e) => setForm({ ...form, buyer_signatory_date: e.target.value })}
                    className={inputCls}
                    style={{ colorScheme: 'dark' }}
                  />
                </Field>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300">Seller — Seller Representative</h4>
                <Field label="Name">
                  <input
                    disabled={!editable}
                    value={form.seller_signatory_name}
                    onChange={(e) => setForm({ ...form, seller_signatory_name: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Title">
                  <input
                    disabled={!editable}
                    value={form.seller_signatory_title}
                    onChange={(e) => setForm({ ...form, seller_signatory_title: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    disabled={!editable}
                    value={form.seller_signatory_date}
                    onChange={(e) => setForm({ ...form, seller_signatory_date: e.target.value })}
                    className={inputCls}
                    style={{ colorScheme: 'dark' }}
                  />
                </Field>
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 sticky top-6">
            <h3 className="text-sm font-semibold text-white mb-3">Totals</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal, form.currency)} />
              <Row label="Discount" value={`- ${formatMoney(totals.discount_total, form.currency)}`} />
              <Row label="Tax" value={formatMoney(totals.tax_amount, form.currency)} />
              <div className="pt-2 mt-2 border-t border-slate-700/60 flex items-center justify-between">
                <dt className="text-white font-bold">Grand Total</dt>
                <dd className="text-white font-bold text-lg">
                  {formatMoney(totals.total, form.currency)}
                </dd>
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

      <div className="mt-6">
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
                    <th className="px-2 py-2 font-medium w-16">Tax%</th>
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
                      <td className="px-2 py-1 min-w-[250px]">
                        <RichTextEditor disabled={!editable} value={it.description} onChange={(html) => updateItem(i, { description: html })} minHeight={60} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" disabled={!editable} value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <select disabled={!editable} value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} className={cellCls}>
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u} className={optionCls}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" disabled={!editable} value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <select disabled={!editable} value={it.type} onChange={(e) => updateItem(i, { type: e.target.value as 'one_time' | 'recurring' })} className={cellCls}>
                          <option value="one_time" className={optionCls}>One-time</option>
                          <option value="recurring" className={optionCls}>Recurring</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" disabled={!editable} value={it.discount_pct} onChange={(e) => updateItem(i, { discount_pct: Number(e.target.value) })} className={cellCls} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" disabled={!editable} value={it.tax_pct} onChange={(e) => updateItem(i, { tax_pct: Number(e.target.value) })} className={cellCls} />
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
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => addItem()}>
                  <Plus className="w-4 h-4" /> Add one-time item
                </Button>
                <Button variant="secondary" onClick={() => addItem(emptySubscriptionItem())}>
                  <Plus className="w-4 h-4" /> Add annual subscription
                </Button>
              </div>
            )}
          </Section>
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
                  size="sm"
                  className="gap-2"
                  disabled={downloadPdfMutation.isPending}
                  onClick={() => downloadPdfMutation.mutate()}
                >
                  <Printer className="w-4 h-4" /> 
                  {downloadPdfMutation.isPending ? 'Generating PDF...' : 'Download PDF'}
                </Button>
              </div>
            </div>
              <iframe
                ref={iframeRef}
                title="proposal"
                srcDoc={previewHtml}
                onLoad={handleIframeLoad}
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
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title="Apply template"
        className="lg:max-w-2xl"
      >
        <p className="text-xs text-slate-400 mb-3">
          Select a template to load its title, currency, pricing, modules, and line items into this
          quotation. Review the result and Save.
        </p>
        <div className="space-y-3">
          {QUOTATION_TEMPLATES.filter((t) => t.defaults && t.id !== 'custom').map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-slate-400">{t.description}</div>
              </div>
              <Button variant="secondary" onClick={() => applyTemplate(t.id)}>
                Apply
              </Button>
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
const optionCls = 'bg-slate-800 text-white'

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
