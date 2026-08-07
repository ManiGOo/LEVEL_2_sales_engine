import type { Signal } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import { FlaskConical, PackageCheck, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

function rawStr(v: unknown): string {
  return String(v ?? '')
}

function clean(s: unknown): string {
  return rawStr(s).replace(/\s+/g, ' ').trim()
}

const SMG_LABELS: Record<string, string> = {
  process_control: 'Schedule M gap · Process Control',
  contamination_control: 'Schedule M gap · Contamination Control',
  stability: 'Schedule M gap · Stability',
  labeling_packaging: 'Schedule M gap · Labeling/Packaging',
  data_integrity: 'Schedule M gap · Data Integrity',
}

const PROXY_LABELS: Record<string, string> = {
  manual_failure_mode: 'manual failure mode (dissolution/assay)',
  failure_mode_neutral: 'unclassified failure mode',
  failure_mode_unknown: 'failure mode unknown',
  formulation_failure_mode: 'formulation-type failure',
  llm_formulation: 'formulation-type failure',
  llm_unclear: 'generic failure text',
  sme_revenue_tier: 'SME revenue tier',
  release_gap: 'release gap (caught by state lab)',
  release_gap_unknown: 'release gap (not confirmed)',
  explicit_regulator_quote: 'regulator quote on paper records',
  not_sme_confirmed: 'not SME-tier',
}

function splitManufacturer(m: unknown) {
  const s = clean(m)
  if (!s) return { name: 'Unknown Manufacturer', address: '' }
  if (/^(under investigation|not known|unknown|not available|nil|n\/a|na|not disclosed)$/i.test(s)) {
    return { name: 'Manufacturer under investigation', address: 'Identity withheld by regulator' }
  }
  const i = s.indexOf(',')
  if (i > 0) return { name: s.slice(0, i).trim(), address: s.slice(i + 1).trim() }
  return { name: s, address: '' }
}

function classificationTags(a: Record<string, unknown>) {
  const tags: { label: string; variant: 'paper' | 'mandate' | 'warning' | 'danger' }[] = []
  if (a.is_paper_failure) tags.push({ label: 'Paper QMS', variant: 'paper' })
  if (a.violates_rule_96) tags.push({ label: 'Rule 96', variant: 'danger' })
  if (a.violates_sub_rule_7) tags.push({ label: 'Sub-Rule 7', variant: 'mandate' })
  if (a.violates_schedule_h2) tags.push({ label: 'Schedule H2', variant: 'warning' })
  const smg = SMG_LABELS[rawStr(a.schedule_m_gap)]
  if (smg) tags.push({ label: smg, variant: 'warning' })
  return tags
}

interface SignalDetailCardProps {
  signal: Signal
}

export default function SignalDetailCard({ signal }: SignalDetailCardProps) {
  const analysis = (signal.llm_analysis || {}) as Record<string, unknown>
  const pa = (signal.paper_assessment || {}) as Record<string, unknown>
  const sb = (signal.score_breakdown || {}) as Record<string, unknown>
  const en = (signal.enrichment || {}) as Record<string, unknown>
  const checks = (en.checks || {}) as Record<string, Record<string, unknown>>
  const evidence = (en.evidence || []) as Array<Record<string, unknown>>

  const raw = signal.raw_details || {}
  const drug = clean(raw.drug_name)
  const reason = clean(raw.reason) || 'No reason provided'
  const rootCause = clean(analysis.root_cause_summary) || 'Analysis pending'
  const { name: mfrName, address } = splitManufacturer(raw.manufacturer)
  const company = rawStr(signal.company_name) || mfrName

  const tags = classificationTags(analysis)

  const paperClass = pa.class as string | undefined
  const paperBadge =
    paperClass === 'explicit'
      ? { label: 'Category 1 · Explicit Evidence', cls: 'bg-green-500/15 text-green-300 border-green-500/25' }
      : paperClass === 'deductive'
        ? { label: `Category 2 · Deductive (${rawStr(pa.confidence) || 0}% conf)`, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/25' }
        : null
  const proxies = ((pa.proxies as string[]) || []).map((p) => PROXY_LABELS[p] || p)
  const salesMessage = clean(pa.sales_message)

  const mandateTxt = (sb.mandate_flags as string[] | undefined) || []

  const checkEntries = Object.entries(checks)
  const hasEnrichment = evidence.length > 0 || checkEntries.length > 0

  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/40 p-4 sm:p-5 flex flex-col">
      {/* header: type pill + score */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="px-3 py-1 bg-blue-500/15 text-blue-300 text-[11px] font-semibold rounded-full border border-blue-500/25 break-words max-w-[60%]">
          {rawStr(signal.event_type) || 'Signal'}
        </span>
        <div className="shrink-0">
          <ScoreGauge
            score={signal.score}
            max={signal.max_possible_score || 100}
            size={56}
            breakdown={signal.score_breakdown}
            label="Lead Score"
          />
        </div>
      </div>

      <h3 className="text-base font-bold text-white leading-snug break-words">{company}</h3>
      {address && <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">{address}</p>}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-slate-400">
        {drug && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <FlaskConical size={12} className="text-indigo-400 shrink-0" />
            <span className="truncate max-w-[220px]">{drug}</span>
          </span>
        )}
        {signal.event_date && (
          <span className="text-slate-600">·</span>
        )}
        {signal.event_date && <span>{signal.event_date}</span>}
        {rawStr(raw.batch_no) && (
          <>
            <span className="text-slate-600">·</span>
            <span className="truncate max-w-[160px]">Batch {rawStr(raw.batch_no)}</span>
          </>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map((t) => (
            <Badge key={t.label} variant={t.variant}>
              {t.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Issue */}
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Issue</p>
        <p className="text-sm text-slate-300 leading-relaxed break-words line-clamp-3">{reason}</p>
      </div>

      {/* AI Root Cause */}
      <div className="mt-3 rounded-xl bg-slate-800/50 border border-white/5 p-3">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1">
          AI Root Cause Summary
        </p>
        <p className="text-sm text-slate-300 leading-relaxed break-words line-clamp-3">{rootCause}</p>
      </div>

      {/* Paper assessment */}
      {paperBadge && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            Evidence Class
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border', paperBadge.cls)}>
              <PackageCheck size={11} />
              {paperBadge.label}
            </span>
          </div>
          {rawStr(pa.basis) && (
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{clean(pa.basis)}</p>
          )}
          {proxies.length > 0 && (
            <p className="text-[10px] text-slate-500 mt-1">{proxies.join(' · ')}</p>
          )}
          {salesMessage && (
            <p className="text-[11px] mt-2 p-2 bg-slate-800/60 rounded-lg border border-white/5 text-slate-300 italic leading-relaxed">
              {salesMessage}
            </p>
          )}
        </div>
      )}

      {/* Enrichment */}
      {hasEnrichment && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            External Enrichment
          </p>
          <div className="flex flex-wrap gap-1.5">
            {evidence.map((e, i) => {
              const qms = Number(e.paper_qms_score || 0) > 0
              return (
                <a
                  key={i}
                  href={rawStr(e.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border border-green-500/25 bg-green-500/10 text-green-300"
                >
                  {qms ? 'Paper-QMS' : rawStr(e.source) || 'finding'} · {rawStr(e.finding_date)}
                </a>
              )
            })}
            {checkEntries.map(([source, c]) => {
              const date = rawStr(c.checked_at).slice(0, 10)
              const f = Number(c.findings_count || 0)
              if (c.status === 'error')
                return (
                  <Badge key={source} variant="danger">
                    {source} · error{date ? ` (${date})` : ''}
                  </Badge>
                )
              if (c.status === 'skipped')
                return (
                  <Badge key={source} variant="neutral">
                    {source} — not searchable
                  </Badge>
                )
              return (
                <Badge key={source} variant={f > 0 ? 'success' : 'neutral'}>
                  {source} {f > 0 ? `${f} finding${f > 1 ? 's' : ''}` : '· no findings'}
                  {date ? ` (${date})` : ''}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {mandateTxt.length > 0 && (
        <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1">
          <Search size={10} />
          Mandate flags: {mandateTxt.join(', ')}
        </p>
      )}
    </div>
  )
}
