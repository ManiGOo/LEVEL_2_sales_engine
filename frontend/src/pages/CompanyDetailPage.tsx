import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { CompanyDetail, Signal } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import { TextContentSkeleton } from '@/components/ui/ResourceLoader'
import WebEvidencePanel from '@/components/companies/WebEvidencePanel'
import SignalDetailCard from '@/components/company/SignalDetailCard'
import { motion } from 'motion/react'
import { ArrowLeft, Building2, ClipboardCheck, Globe, Layers, AlertTriangle, CalendarDays, Activity } from 'lucide-react'

function rawStr(v: unknown): string {
  return String(v ?? '')
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</p>
      <p className="text-sm font-bold text-white truncate" title={value}>
        {value}
      </p>
    </div>
  )
}

export default function CompanyDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { fetchApi } = useApi()
  const [selectedIdx, setSelectedIdx] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/companies/${slug}/signals`)
      return (await res.json()) as CompanyDetail
    },
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <TextContentSkeleton lines={2} className="h-28" />
        <TextContentSkeleton lines={4} className="h-44" />
        <TextContentSkeleton lines={5} className="h-64" />
      </div>
    )
  }

  if (!data) return null

  const { company, card } = data
  const related = card.events || []
  const displaySignal: Signal = selectedIdx === 0 ? card : related[Math.max(0, selectedIdx - 1)] || card

  const years = (company.years || []).join(', ') || 'n/a'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 lg:space-y-6">
      <Link
        to="/companies"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Companies
      </Link>

      {/* Hero */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                Company Profile
              </p>
              <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight break-words">
                {company.name}
              </h1>
              <p className="text-xs lg:text-sm text-slate-400 mt-1">
                {company.event_count} regulatory incidents across {years}
              </p>
            </div>
          </div>

          <ScoreGauge
            score={company.score}
            max={company.max_possible_score || 100}
            size={84}
            breakdown={card.score_breakdown}
            label="Peak Lead Score"
            className="sm:items-end"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          <Badge variant="paper">
            <ClipboardCheck size={10} /> {company.paper_count} paper-QMS
          </Badge>
          <Badge variant="mandate">
            <AlertTriangle size={10} /> {company.mandate_count} mandate
          </Badge>
          <Badge variant="info">
            <Globe size={10} /> {company.web_evidence_count} web evidence
          </Badge>
          <Badge variant="neutral">
            <Layers size={10} /> {company.evidence_count} external findings
          </Badge>
          {(company.regulators || []).map((r) => (
            <Badge key={r} variant="neutral">
              {r}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/5">
          <StatBox label="Incidents" value={String(company.event_count)} />
          <StatBox label="Average Score" value={String(company.avg_score)} />
          <StatBox label="Latest Report" value={company.latest_date || 'n/a'} />
          <StatBox label="Regulators" value={(company.regulators || []).join(', ') || 'n/a'} />
        </div>
      </Card>

      {/* Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            {related.length + 1} Incidents
          </CardTitle>
          {related.length > 0 && (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="max-w-[70%] truncate px-3 py-1.5 bg-slate-800/80 border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value={0}>
                Top signal · {rawStr(card.raw_details?.drug_name) || 'Unknown'} · {card.event_date || 'n/a'} · {card.score}
              </option>
              {related.map((s, i) => (
                <option key={s.event_id} value={i + 1}>
                  {rawStr(s.raw_details?.drug_name) || 'Unknown'} · {s.event_date || 'n/a'} · {s.score}
                </option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent>
          <SignalDetailCard key={displaySignal.event_id} signal={displaySignal} />
        </CardContent>
      </Card>

      {/* Web evidence */}
      <WebEvidencePanel eventId={card.event_id} />

      {/* AI analysis */}
      {rawStr(card.llm_analysis?.root_cause_summary) && (
        <Card className="p-4 sm:p-5">
          <CardContent className="p-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
              <CalendarDays size={12} />
              AI Analysis
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {rawStr(card.llm_analysis?.root_cause_summary)}
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
