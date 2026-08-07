import { Link } from 'react-router-dom'
import type { Signal } from '@/types/api'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Globe, Layers } from 'lucide-react'

function rawStr(v: unknown): string {
  return String(v ?? '')
}

interface SignalCardProps {
  signal: Signal
}

export default function SignalCard({ signal }: SignalCardProps) {
  const analysis = (signal.llm_analysis || {}) as Record<string, unknown>
  const paperClass = (signal.paper_assessment || {}).class as string | undefined
  const isPaper = Boolean(analysis.is_paper_failure) || (paperClass && paperClass !== 'none')
  const related = Math.max((signal.event_count || 1) - 1, 0)
  const webCount = signal.web_evidence?.length || 0
  const rootCause = rawStr(analysis.root_cause_summary)
  const reason = rawStr(signal.raw_details?.reason)
  const drug = rawStr(signal.raw_details?.drug_name)

  const mandateFlags = [
    analysis.violates_rule_96 ? 'Rule 96' : null,
    analysis.violates_sub_rule_7 ? 'Sub-Rule 7' : null,
    analysis.violates_schedule_h2 ? 'Schedule H2' : null,
  ].filter(Boolean) as string[]

  return (
    <Link
      to={signal.slug ? `/companies/${signal.slug}` : '/companies'}
      className="block glass rounded-2xl p-4 hover:border-indigo-500/25 hover:bg-slate-800/80 transition-colors group"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <ScoreGauge
          score={signal.score}
          max={signal.max_possible_score || 100}
          size={52}
          breakdown={signal.score_breakdown}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                {signal.company_name || 'Unknown company'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {drug || 'Unknown drug'} · {signal.event_date || 'n/a'}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 shrink-0">
              {signal.event_type?.replace('_DRUG', '')}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{reason || 'No reason provided'}</p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {isPaper && <Badge variant="paper">Paper-QMS</Badge>}
            {mandateFlags.map((f) => (
              <Badge key={f} variant="mandate">
                {f}
              </Badge>
            ))}
            {webCount > 0 && (
              <Badge variant="info">
                <Globe size={10} />
                {webCount} web
              </Badge>
            )}
            {related > 0 && (
              <Badge variant="neutral">
                <Layers size={10} />
                {related} related
              </Badge>
            )}
          </div>

          {rootCause && (
            <p className="text-xs text-slate-500 mt-3 border-t border-white/5 pt-2 line-clamp-2 italic">
              {rootCause}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end mt-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 group-hover:text-indigo-200 transition-all">
          View company <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  )
}
