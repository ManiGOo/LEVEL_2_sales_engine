import { Fragment, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowDown, Plus, Trash2, ChevronUp, ChevronDown, History, Check, CheckCircle, Crosshair, X } from 'lucide-react'
import type { AccountStage, AccountStageStatus } from '@/types/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ACCOUNT_STAGE_STATUSES, stageStatusMeta } from '@/lib/account'

interface BoardForm {
  name: string
  status: AccountStageStatus
  objective: string
  rows: { key: string; value: string }[]
}

interface Props {
  stages: AccountStage[]
  onSaveStage: (stageId: string, payload: Record<string, unknown>, expectedVersion?: number) => void
  onDeleteStage: (stage: AccountStage) => void
  onMoveStage: (stage: AccountStage, dir: -1 | 1) => void
  onAddStage: () => void
  onAdvance: (stage: AccountStage, currentVersion: number, nextVersion?: number) => void
  canEdit?: boolean
  saving?: boolean
}

function currentIndex(stages: AccountStage[]): number {
  const active = stages.findIndex((s) => s.status === 'active')
  if (active >= 0) return active
  const firstOpen = stages.findIndex((s) => s.status !== 'completed')
  if (firstOpen >= 0) return firstOpen
  return stages.length - 1
}

export default function WorkflowBoard({
  stages,
  onSaveStage,
  onDeleteStage,
  onMoveStage,
  onAddStage,
  onAdvance,
  canEdit = true,
  saving,
}: Props) {
  const ci = currentIndex(stages)
  const currentId = stages[ci]?.id
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const openId = expandedId ?? currentId
  const [form, setForm] = useState<BoardForm>({ name: '', status: 'planned', objective: '', rows: [] })
  const [historyId, setHistoryId] = useState<string | null>(null)

  useEffect(() => {
    const s = stages.find((x) => x.id === openId)
    if (s) {
      setForm({
        name: s.name,
        status: s.status,
        objective: s.objective || '',
        rows: Object.entries(s.data || {}).map(([k, v]) => ({ key: k, value: String(v ?? '') })),
      })
    }
  }, [openId])

  function buildPayload(): Record<string, unknown> {
    return {
      name: form.name,
      status: form.status,
      objective: form.objective,
      data: Object.fromEntries(form.rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])),
    }
  }

  function hasEmptyFields(): boolean {
    return form.rows.some((r) => !r.key.trim() || !r.value.trim())
  }

  function handleSave(stage: AccountStage) {
    if (!canEdit) return
    if (hasEmptyFields()) {
      const ok = window.confirm('Some stage details are empty. Submit this stage with empty fields anyway?')
      if (!ok) return
    }
    onSaveStage(stage.id, buildPayload(), stage.version)
  }

  function handleAdvance(stage: AccountStage) {
    if (!canEdit) return
    const idx = stages.findIndex((s) => s.id === stage.id)
    const next = stages[idx + 1]
    if (hasEmptyFields()) {
      const ok = window.confirm('Some stage details are empty. Complete this stage anyway?')
      if (!ok) return
    }
    onAdvance(stage, stage.version, next?.version)
  }

  return (
    <div>
      {!canEdit && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-300/90">
          Read-only — you are not the owner of this account, so stages can't be edited.
        </div>
      )}
      {stages.map((stage, index) => {
        const meta = stageStatusMeta(stage.status)
        const isCurrent = stage.id === currentId
        const isOpen = stage.id === openId
        const isLast = index === stages.length - 1
        const locked = stage.status === 'completed'
        return (
          <Fragment key={stage.id}>
            <div
              className={cn(
                'rounded-xl border bg-slate-900/35 transition-colors',
                isCurrent ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-white/5',
                isOpen && 'ring-1 ring-white/10'
              )}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : stage.id)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <span className="shrink-0 h-6 w-6 rounded-full bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-300 flex items-center justify-center">
                  {index + 1}
                </span>
                <span className={cn('h-3 w-3 rounded-full shrink-0', meta.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{stage.name}</span>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                    {stage.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                        <CheckCircle size={11} /> Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold text-indigo-300">
                        <Crosshair size={11} /> Current step
                      </span>
                    )}
                  </div>
                  {!isOpen && stage.objective && (
                    <p className="text-[11px] text-slate-500 mt-1 truncate">{stage.objective}</p>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp size={16} className="text-slate-400" />
                ) : (
                  <ChevronDown size={16} className="text-slate-500" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Stage name
                      </label>
                      <input
                        value={form.name}
                        disabled={locked || !canEdit}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Status
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {ACCOUNT_STAGE_STATUSES.map((s) => {
                          const m = stageStatusMeta(s)
                          const activeBtn = form.status === s
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={locked || !canEdit}
                              onClick={() => setForm({ ...form, status: s })}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors',
                                activeBtn
                                  ? `${m.ring} bg-slate-900/60 text-white border-transparent`
                                  : 'border-white/10 text-slate-400 hover:bg-white/5',
                                locked && 'opacity-60 cursor-not-allowed'
                              )}
                            >
                              <span className={cn('h-2 w-2 rounded-full', m.dot)} />
                              {m.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Objective / reasons
                    </label>
                    <textarea
                      value={form.objective}
                      disabled={locked || !canEdit}
                      onChange={(e) => setForm({ ...form, objective: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Stage details
                      </label>
                        <button
                          type="button"
                          disabled={locked || !canEdit}
                          onClick={() => setForm({ ...form, rows: [...form.rows, { key: '', value: '' }] })}
                          className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={12} /> Add field
                        </button>
                    </div>
                    <div className="space-y-2">
                      {form.rows.length === 0 && (
                        <p className="text-[11px] text-slate-500">No fields yet. Add the details captured at this stage.</p>
                      )}
                      {form.rows.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input
                              value={row.key}
                              disabled={locked || !canEdit}
                              onChange={(e) => {
                                const rows = [...form.rows]
                                rows[i] = { ...row, key: e.target.value }
                                setForm({ ...form, rows })
                              }}
                              placeholder="Field"
                              className="w-1/3 px-2.5 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            <input
                              value={row.value}
                              disabled={locked || !canEdit}
                              onChange={(e) => {
                                const rows = [...form.rows]
                                rows[i] = { ...row, value: e.target.value }
                                setForm({ ...form, rows })
                              }}
                              placeholder="Value"
                              className="flex-1 px-2.5 py-1.5 bg-slate-800/70 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            <button
                              type="button"
                              disabled={locked || !canEdit}
                              onClick={() => setForm({ ...form, rows: form.rows.filter((_, j) => j !== i) })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label="Remove field"
                            >
                              <X size={14} />
                            </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {stage.history.length > 0 && (
                    <div>
                      <button
                        onClick={() => setHistoryId(historyId === stage.id ? null : stage.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                      >
                        <History size={13} />
                        {stage.history.length} previous version{stage.history.length === 1 ? '' : 's'}
                        <ChevronUp size={13} className={cn('transition-transform rotate-180', historyId === stage.id && 'rotate-0')} />
                      </button>
                      <AnimatePresence initial={false}>
                        {historyId === stage.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-2 pl-1">
                              {stage.history.map((snap) => {
                                const sm = stageStatusMeta(snap.status)
                                return (
                                  <div key={snap.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={cn('h-2 w-2 rounded-full', sm.dot)} />
                                      <span className="text-xs font-semibold text-white">{snap.name}</span>
                                      <Badge variant={sm.badge}>{sm.label}</Badge>
                                      <span className="text-[10px] text-slate-500">
                                        {snap.actor_name || 'Teammate'} · {snap.created_at?.slice(0, 16).replace('T', ' ')}
                                      </span>
                                    </div>
                                    {snap.objective && <p className="mt-1.5 text-[12px] text-slate-400">{snap.objective}</p>}
                                    {snap.data && Object.keys(snap.data).length > 0 && (
                                      <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-0.5">
                                        {Object.entries(snap.data).map(([k, v]) => (
                                          <div
                                            key={k}
                                            className="flex items-start justify-between gap-4 py-0.5 border-b border-white/5 last:border-0"
                                          >
                                            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold shrink-0">{k}</span>
                                            <span className="text-[11px] text-slate-300 text-right break-words min-w-0">{String(v ?? '')}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {locked ? (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <CheckCircle size={12} className="text-emerald-400" /> Completed — locked from editing
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" onClick={() => onSaveStage(stage.id, { status: 'active' })} disabled={saving || !canEdit}>
                          Reopen
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDeleteStage(stage)} disabled={saving || !canEdit}>
                          <Trash2 size={14} /> Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" onClick={() => handleSave(stage)} disabled={saving || !form.name.trim() || !canEdit}>
                        <Check size={14} /> Save
                      </Button>
                      {isCurrent && !isLast && (
                        <Button size="sm" variant="secondary" onClick={() => handleAdvance(stage)} disabled={saving || !canEdit}>
                          <ArrowDown size={14} /> Complete &amp; next
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onMoveStage(stage, -1)} disabled={index === 0 || !canEdit}>
                        Move up
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onMoveStage(stage, 1)} disabled={isLast || !canEdit}>
                        Move down
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeleteStage(stage)} disabled={saving || !canEdit}>
                        <Trash2 size={14} /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isLast && (
              <div className="flex justify-center py-1.5" aria-hidden="true">
                <div className="flex flex-col items-center">
                  <span className="h-3 w-px bg-slate-600" />
                  <ArrowDown size={14} className="text-slate-600 -mt-0.5" />
                </div>
              </div>
            )}
          </Fragment>
        )
      })}

      <button
        onClick={onAddStage}
        disabled={!canEdit}
        className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-slate-900/20 hover:bg-slate-900/50 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 transition-colors py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={16} /> Add stage
      </button>
    </div>
  )
}
