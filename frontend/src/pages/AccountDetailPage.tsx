import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/providers/AuthProvider'
import type {
  AccountDetail,
  AccountStage,
  AccountStageStatus,
  AccountTemplate,
  AccountHistoryItem,
  QuotationListItem,
} from '@/types/api'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Plus,
  Building2,
  Save,
  X,
  Trash2,
  ExternalLink,
  LayoutTemplate,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/toast'
import { ACCOUNT_STAGE_STATUSES, stageStatusMeta } from '@/lib/account'
import { ReminderModal } from '@/components/reminders/ReminderModal'
import { formatMoney, QUOTATION_STATUS_VARIANT } from '@/lib/quotation'
import WorkflowBoard from '@/components/accounts/WorkflowBoard'
import AccountHistoryTimeline from '@/components/accounts/AccountHistoryTimeline'

interface StageForm {
  name: string
  status: AccountStageStatus
  objective: string
  rows: { key: string; value: string }[]
}

const emptyForm: StageForm = { name: '', status: 'planned', objective: '', rows: [] }

export default function AccountDetailPage() {
  const { companyKey = '' } = useParams()
  const { fetchApi } = useApi()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AccountStage | null>(null)
  const [form, setForm] = useState<StageForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<AccountStage | null>(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderSubject, setReminderSubject] = useState('')

  const { data, isFetching } = useQuery({
    queryKey: ['account', companyKey],
    queryFn: async (): Promise<AccountDetail> => {
      const res = await fetchApi(`/api/v1/accounts/${companyKey}`)
      if (!res.ok) throw new Error('Failed to load account')
      return (await res.json()) as AccountDetail
    },
    refetchInterval: 8000,
  })

  const { data: history } = useQuery({
    queryKey: ['account-history', companyKey],
    queryFn: async (): Promise<AccountHistoryItem[]> => {
      const res = await fetchApi(`/api/v1/accounts/${companyKey}/history`)
      if (!res.ok) throw new Error('Failed to load history')
      return (await res.json()) as AccountHistoryItem[]
    },
    refetchInterval: 8000,
  })

  const canEdit =
    !!data &&
    (!data.owner_id || data.owner_id === user?.id || user?.role === 'admin')

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi(`/api/v1/accounts/${companyKey}/owner`, {
        method: 'PATCH',
        body: JSON.stringify({ owner_id: user?.id, owner_email: user?.email }),
      })
      if (!res.ok) throw new Error('Could not claim account')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', companyKey] })
      showToast({ variant: 'success', title: 'You now own this account' })
    },
    onError: () => showToast({ variant: 'error', title: 'Could not claim account' }),
  })

  const templatesQuery = useQuery({
    queryKey: ['account-templates'],
    queryFn: async (): Promise<AccountTemplate[]> => {
      const res = await fetchApi('/api/v1/accounts/templates/list')
      return (await res.json()) as AccountTemplate[]
    },
  })

  const { data: quotes, refetch: refetchQuotes } = useQuery({
    queryKey: ['account-quotes', companyKey],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/quotations?company_key=${encodeURIComponent(companyKey)}&page_size=10`)
      if (!res.ok) throw new Error('Failed to load quotations')
      return (await res.json()) as { items: QuotationListItem[] }
    },
    enabled: !!data,
  })

  const newQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi('/api/v1/quotations', {
        method: 'POST',
        body: JSON.stringify({
          company_key: companyKey,
          company_name: data?.company_name || companyKey,
          title: 'Commercial Proposal',
          status: 'draft',
        }),
      })
      if (!res.ok) throw new Error('Failed to create quotation')
      return (await res.json()) as { id: string }
    },
    onSuccess: (q) => {
      refetchQuotes()
      window.location.href = `/quotations/${q.id}`
    },
    onError: () => showToast({ variant: 'error', title: 'Could not create quotation' }),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setEditorOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        status: form.status,
        objective: form.objective,
        data: Object.fromEntries(
          form.rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])
        ),
      }
      if (editing) {
        const res = await fetchApi(`/api/v1/accounts/${companyKey}/stages/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).detail || 'Update failed')
      } else {
        const res = await fetchApi(`/api/v1/accounts/${companyKey}/stages`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).detail || 'Create failed')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', companyKey] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setEditorOpen(false)
      showToast({ variant: 'success', title: editing ? 'Stage updated' : 'Stage created' })
    },
    onError: (e: unknown) => {
      showToast({ variant: 'error', title: 'Could not save stage', description: (e as Error).message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi(`/api/v1/accounts/${companyKey}/stages/${deleteTarget!.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', companyKey] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setDeleteTarget(null)
      showToast({ variant: 'success', title: 'Stage deleted' })
    },
    onError: () => showToast({ variant: 'error', title: 'Could not delete stage' }),
  })

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetchApi(`/api/v1/accounts/${companyKey}/stages/reorder`, {
        method: 'POST',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      })
      if (!res.ok) throw new Error('Reorder failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', companyKey] }),
    onError: () => showToast({ variant: 'error', title: 'Could not reorder stages' }),
  })

  function move(stage: AccountStage, dir: -1 | 1) {
    if (!data) return
    const ordered = [...data.stages].sort((a, b) => a.order_index - b.order_index)
    const idx = ordered.findIndex((s) => s.id === stage.id)
    const swap = idx + dir
    if (swap < 0 || swap >= ordered.length) return
    ;[ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]]
    reorderMutation.mutate(ordered.map((s) => s.id))
  }

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateKey: string) => {
      const res = await fetchApi(`/api/v1/accounts/${companyKey}/stages/template`, {
        method: 'POST',
        body: JSON.stringify({ template_key: templateKey }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Apply failed')
      return (await res.json()) as { imported_count: number }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['account', companyKey] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setTemplateOpen(false)
      showToast({
        variant: 'success',
        title: result.imported_count > 0 ? `Added ${result.imported_count} stages` : 'Template applied',
        description: result.imported_count > 0 ? 'Workflow scaffold created' : 'All template stages already exist',
      })
    },
    onError: (e: unknown) => showToast({ variant: 'error', title: 'Could not apply template', description: (e as Error).message }),
  })

  const boardSaveMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
      expectedVersion,
    }: {
      id: string
      payload: Record<string, unknown>
      expectedVersion?: number
    }) => {
      const qs = expectedVersion != null ? `?expected_version=${expectedVersion}` : ''
      const res = await fetchApi(`/api/v1/accounts/${companyKey}/stages/${id}${qs}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      if (res.status === 409) {
        throw new Error('This stage was just edited by someone else. Reloading latest version…')
      }
      if (!res.ok) throw new Error((await res.json()).detail || 'Update failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', companyKey] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      showToast({ variant: 'success', title: 'Stage saved' })
    },
    onError: (e: unknown) => {
      qc.invalidateQueries({ queryKey: ['account', companyKey] })
      showToast({ variant: 'error', title: 'Could not save stage', description: (e as Error).message })
    },
  })

  function advance(stage: AccountStage, currentVersion: number, nextVersion?: number) {
    const idx = stages.findIndex((s) => s.id === stage.id)
    const next = stages[idx + 1]
    boardSaveMutation.mutate({ id: stage.id, payload: { status: 'completed' }, expectedVersion: currentVersion })
    if (next) {
      let nextStatus: string = 'active'
      if (/completed/i.test(next.name)) nextStatus = 'completed'
      else if (/reject|lost/i.test(next.name)) nextStatus = 'blocked'
      if (next.status !== nextStatus) {
        boardSaveMutation.mutate({ id: next.id, payload: { status: nextStatus }, expectedVersion: nextVersion })
      }
    }
  }

  const stages = data ? [...data.stages].sort((a, b) => a.order_index - b.order_index) : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Link
        to="/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={15} /> Back to accounts
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 size={22} className="text-indigo-400" />
            {data?.company_name || companyKey}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {stages.length} workflow stage{stages.length === 1 ? '' : 's'} in the sales process
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[12px]">
            {data?.owner_id ? (
              <span className="text-slate-500">
                Owner: <span className="text-slate-300">{data.owner_email || 'assigned'}</span>
                {data.owner_id === user?.id && <span className="ml-1 text-indigo-300">(you)</span>}
              </span>
            ) : (
              <span className="text-slate-500">Owner: unassigned</span>
            )}
            {data && !data.owner_id && (
              <Button size="sm" variant="ghost" onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}>
                Claim this account
              </Button>
            )}
            {data && data.owner_id && data.owner_id !== user?.id && user?.role !== 'admin' && (
              <span className="text-amber-300/80">· read-only</span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto mt-2 sm:mt-0">
          <Link to={data?.source === 'cdsco' ? `/accounts/cdsco-s-fda/${companyKey}` : `/accounts/general/${companyKey}`} className="flex">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink size={14} /> Company profile
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setTemplateOpen(true)} disabled={isFetching || !canEdit} className="w-full sm:w-auto">
            <LayoutTemplate size={14} /> Apply template
          </Button>
          <Button size="sm" onClick={openCreate} disabled={isFetching || !canEdit} className="w-full sm:w-auto">
            <Plus size={14} /> Add stage
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {
            setReminderSubject('')
            setReminderOpen(true)
          }} disabled={isFetching || !canEdit} className="w-full sm:w-auto text-amber-300 hover:text-amber-200">
            <Bell size={14} /> Reminder
          </Button>
        </div>
      </div>

      {isFetching && !data ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 glass rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No workflow stages yet.</p>
          <p className="text-slate-500 text-sm mt-1">
            Start from a template or add the first stage of the sales process for this account.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Button variant="secondary" size="sm" onClick={() => setTemplateOpen(true)}>
              <LayoutTemplate size={14} /> Apply template
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} /> Add stage
            </Button>
          </div>
        </div>
      ) : (
        <>
          <QuotationsCard
            items={quotes?.items || []}
            onNew={() => newQuoteMutation.mutate()}
            creating={newQuoteMutation.isPending}
          />
          <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <WorkflowBoard
              stages={stages}
              onSaveStage={(id, payload, expectedVersion) => boardSaveMutation.mutate({ id, payload, expectedVersion })}
              onDeleteStage={(s) => setDeleteTarget(s)}
              onMoveStage={move}
              onAddStage={openCreate}
              onAdvance={advance}
              onReminder={(stage) => {
                setReminderSubject(`Follow up on stage: ${stage.name}`)
                setReminderOpen(true)
              }}
              canEdit={canEdit}
              saving={boardSaveMutation.isPending}
            />
          </div>
          <aside className="w-full lg:w-80 shrink-0">
            <AccountHistoryTimeline items={history} />
          </aside>
        </div>
        </>
      )}

      {/* Stage editor modal */}
      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={editing ? 'Edit stage' : 'Add stage'}>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Stage name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Prospecting, Qualification, Proposal…"
              className="w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Status</label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_STAGE_STATUSES.map((s) => {
                const m = stageStatusMeta(s)
                const active = form.status === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                      active ? `${m.ring} bg-slate-900/60 text-white border-transparent` : 'border-white/10 text-slate-400 hover:bg-white/5'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', m.dot)} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Objective / reasons
            </label>
            <textarea
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              rows={3}
              placeholder="Why this stage exists, what needs to happen before moving on…"
              className="w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stage data (snapshot)
              </label>
              <button
                type="button"
                onClick={() => setForm({ ...form, rows: [...form.rows, { key: '', value: '' }] })}
                className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add field
              </button>
            </div>
            <div className="space-y-2">
              {form.rows.length === 0 && (
                <p className="text-[11px] text-slate-500">No fields yet. Add key/value notes captured at this stage.</p>
              )}
              {form.rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={row.key}
                    onChange={(e) => {
                      const rows = [...form.rows]
                      rows[i] = { ...row, key: e.target.value }
                      setForm({ ...form, rows })
                    }}
                    placeholder="Field"
                    className="w-1/3 px-2.5 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => {
                      const rows = [...form.rows]
                      rows[i] = { ...row, value: e.target.value }
                      setForm({ ...form, rows })
                    }}
                    placeholder="Value"
                    className="flex-1 px-2.5 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, rows: form.rows.filter((_, j) => j !== i) })}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Remove field"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save stage'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template picker modal */}
      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title="Apply a workflow template" className="max-w-2xl">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-400">
            Start a workflow from a researched sales-playbook. Stages are added in order; any stage the account already has is
            skipped. You can edit or delete stages afterwards.
          </p>
          <div className="space-y-3 max-h-[55vh] overflow-y-auto scrollbar-thin">
            {templatesQuery.isFetching ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-28 glass rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              (templatesQuery.data ?? []).map((tpl) => (
                <div key={tpl.key} className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{tpl.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => applyTemplateMutation.mutate(tpl.key)}
                      disabled={applyTemplateMutation.isPending}
                    >
                      <LayoutTemplate size={14} /> Use
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tpl.stages.map((s) => (
                      <span
                        key={s.name}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-300 border border-white/5"
                      >
                        {s.name}
                        {s.fields.length > 0 && (
                          <span className="text-slate-500">· {s.fields.length} fields</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setTemplateOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete stage" className="max-w-md">
        <div className="p-5">
          <p className="text-sm leading-6 text-slate-300">
            Delete <span className="font-semibold text-white">{deleteTarget?.name}</span>? Its previous versions will also be
            removed. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      </Modal>

      <ReminderModal 
        isOpen={reminderOpen} 
        onClose={() => setReminderOpen(false)} 
        accountKey={companyKey || ''} 
        defaultSubject={reminderSubject}
      />
    </motion.div>
  )
}

function QuotationsCard({
  items,
  onNew,
  creating,
}: {
  items: QuotationListItem[]
  onNew: () => void
  creating: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Quotations</h2>
        <Button variant="secondary" onClick={onNew} disabled={creating}>
          <Plus className="w-4 h-4" /> {creating ? 'Creating…' : 'New quotation'}
        </Button>
      </div>
      {!items.length ? (
        <p className="text-sm text-slate-400">No quotations yet for this account.</p>
      ) : (
        <div className="space-y-2">
          {items.map((q) => (
            <Link
              key={q.id}
              to={`/quotations/${q.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2 hover:bg-slate-800"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{q.quote_number}</span>
                  <Badge variant={QUOTATION_STATUS_VARIANT[q.status]}>{q.status}</Badge>
                </div>
                <div className="text-sm text-slate-200 truncate">{q.title}</div>
              </div>
              <span className="text-sm font-semibold text-white whitespace-nowrap">
                {formatMoney(q.total, q.currency)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
