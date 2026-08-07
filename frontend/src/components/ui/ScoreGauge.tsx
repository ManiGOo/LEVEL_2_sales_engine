import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number
  max?: number
  size?: number
  breakdown?: Record<string, unknown> | null
  label?: string
  showMaxLabel?: boolean
  className?: string
}

function scoreColor(score: number) {
  if (score >= 85) return '#f87171'
  if (score >= 65) return '#fbbf24'
  if (score >= 45) return '#34d399'
  return '#2dd4bf'
}

interface BreakdownRow {
  label: string
  value: string
}

interface ExcludedRow {
  label: string
  reason: string
  max?: number
}

function breakdownRows(b: Record<string, unknown>) {
  const rows: BreakdownRow[] = []
  const push = (label: string, value: unknown, max?: unknown) => {
    if (value == null) return
    rows.push({ label, value: `${value}${max != null ? ` / ${max}` : ''}` })
  }
  push('Base', b.base, b.max_base)
  push('Paper-QMS', b.paper_bonus, b.max_paper_bonus)
  push('2026 Mandate', b.mandate_bonus, b.max_mandate_bonus)
  push('Repeat offender', b.repeat_offender_bonus, b.max_repeat_bonus)
  push('Web evidence', b.web_evidence_bonus, b.max_web_bonus)
  if (b.recency_weight != null) {
    push('Recency', `${Math.round(Number(b.recency_weight) * 100)}%`)
  }
  return rows
}

function excludedRows(b: Record<string, unknown>) {
  const ex = Array.isArray(b.excluded) ? b.excluded : []
  return ex
    .map((e): ExcludedRow | null => {
      if (e == null || typeof e !== 'object') return null
      const o = e as Record<string, unknown>
      return {
        label: String(o.row ?? 'Excluded'),
        reason: String(o.reason ?? ''),
        max: typeof o.max === 'number' ? o.max : undefined,
      }
    })
    .filter((e): e is ExcludedRow => e !== null)
}

interface TipPos {
  top: number
  left: number
}

export function ScoreGauge({
  score,
  max = 100,
  size = 56,
  breakdown,
  label,
  showMaxLabel = true,
  className,
}: ScoreGaugeProps) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (score / max) * 100 : 0))
  const color = scoreColor(score)
  const stroke = Math.max(size * 0.08, 2.5)
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius

  const rows = breakdown ? breakdownRows(breakdown) : []
  const excluded = breakdown ? excludedRows(breakdown) : []
  const showMax = showMaxLabel && max > 0
  const hasTip = rows.length > 0

  const wrapRef = useRef<HTMLDivElement>(null)
  const [tipPos, setTipPos] = useState<TipPos | null>(null)

  const showTip = () => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const tooltipWidth = 240
    const tooltipHeight = 280
    const below = r.bottom + 8 + tooltipHeight <= window.innerHeight || r.top - 8 <= tooltipHeight
    const top = below ? r.bottom + 8 : Math.max(8, r.top - 8 - tooltipHeight)
    const left = Math.min(
      Math.max(r.left + r.width / 2, tooltipWidth / 2 + 8),
      window.innerWidth - tooltipWidth / 2 - 8
    )
    setTipPos({ top, left })
  }

  const hideTip = () => setTipPos(null)

  useEffect(() => {
    if (!tipPos) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) hideTip()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideTip()
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [tipPos])

  return (
    <div
      ref={wrapRef}
      role={hasTip ? 'button' : undefined}
      tabIndex={hasTip ? 0 : undefined}
      aria-label={hasTip ? 'Toggle score breakdown' : undefined}
      className={cn('relative inline-flex flex-col items-center shrink-0', className)}
      onMouseEnter={hasTip ? showTip : undefined}
      onMouseLeave={hasTip ? hideTip : undefined}
      onClick={
        hasTip
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              tipPos ? hideTip() : showTip()
            }
          : undefined
      }
      onKeyDown={
        hasTip
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                tipPos ? hideTip() : showTip()
              }
            }
          : undefined
      }
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(51,65,85,0.6)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(pct * circumference) / 100} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-bold text-white" style={{ fontSize: size * 0.28 }}>
            {score}
          </span>
          {showMax && (
            <span className="text-slate-500" style={{ fontSize: size * 0.12 }}>
              {max}
            </span>
          )}
        </div>
      </div>

      {label && (
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-1.5 text-center whitespace-nowrap">
          {label}
        </p>
      )}

      {hasTip &&
        tipPos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{ top: tipPos.top, left: tipPos.left }}
          >
            <div className="-translate-x-1/2 w-60 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-2xl px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Score breakdown
              </p>
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="font-semibold text-white tabular-nums">{r.value}</span>
                  </div>
                ))}
              </div>
              {excluded.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                  {excluded.map((e) => (
                    <div key={e.label} className="text-[11px] leading-snug">
                      <span className="text-slate-500 font-medium">
                        {e.label}
                        {e.max != null ? ` · up to ${e.max}` : ''}
                      </span>
                      <p className="text-slate-600">{e.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
