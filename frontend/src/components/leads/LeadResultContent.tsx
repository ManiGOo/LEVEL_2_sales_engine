import type { Lead, DecisionMaker, IntentSignal } from '@/types/api'
import {
  Building2,
  Briefcase,
  Globe,
  UserCircle,
  Mail,
  ExternalLink,
  Activity,
  AlertTriangle,
  Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
    </svg>
  )
}

function RelevancePill({ score }: { score?: number | null }) {
  if (score == null) return null
  const color = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  return <span className={cn('shrink-0 font-semibold', color)}>{score}%</span>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400',
    dormant: 'bg-amber-500/15 text-amber-400',
    unknown: 'bg-slate-500/15 text-slate-400',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', map[status] || map.unknown)}>
      {status}
    </span>
  )
}

function RoleIcon({ roleType }: { roleType: string }) {
  if (roleType === 'qa_head' || roleType === 'qa_manager' || roleType === 'quality_personnel') return <Shield size={13} />
  if (roleType === 'managing_director' || roleType === 'founder_ceo') return <UserCircle size={13} />
  return <UserCircle size={13} />
}

function Shield({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SignalList({ items, icon: Icon, title, defaultOpen }: { items: IntentSignal[]; icon: React.ComponentType<{ size?: number }>; title: string; defaultOpen?: boolean }) {
  if (!items.length) return null
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2 cursor-pointer select-none hover:text-slate-300 transition-colors">
        <Icon size={12} />
        {title} · {items.length}
        <span className="ml-auto text-slate-600 group-open:rotate-90 transition-transform">›</span>
      </summary>
      <ul className="space-y-1.5">
        {items.slice(0, 6).map((s, i) => (
          <li key={`${s.url}-${i}`}>
            <a href={s.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-2 text-sm text-slate-300 hover:text-indigo-300 transition-colors">
              <span className="min-w-0">
                <span className="font-medium">{s.title}</span>
                {s.snippet && <span className="text-[11px] text-slate-500 line-clamp-1"> · {s.snippet}</span>}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <RelevancePill score={s.relevance_score} />
                <ExternalLink size={10} className="text-slate-600" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

function ConfidenceBadge({ confidence }: { confidence?: string }) {
  if (!confidence) return null
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: 'Verified', cls: 'bg-emerald-500/15 text-emerald-400' },
    medium: { label: 'Likely', cls: 'bg-amber-500/15 text-amber-400' },
    low: { label: 'Unverified', cls: 'bg-slate-500/15 text-slate-400' },
  }
  const m = map[confidence] || map.low
  return <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide', m.cls)}>{m.label}</span>
}

function SourceLink({ dm }: { dm: DecisionMaker }) {
  if (!dm.source && !dm.source_url) return null
  const label = dm.source === 'corporate_registry' ? 'Corporate registry' :
    dm.source === 'company_website' ? 'Company website' : 'Web search'
  return dm.source_url ? (
    <a href={dm.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-indigo-300 inline-flex items-center gap-1">
      Verified from {label} <ExternalLink size={9} />
    </a>
  ) : <span className="text-[10px] text-slate-500">Verified from {label}</span>
}

function DecisionMakerCard({ dm }: { dm: DecisionMaker }) {
  const isQA = dm.role_type === 'qa_head' || dm.role_type === 'qa_manager' || dm.role_type === 'quality_personnel'
  const isHighConfidence = dm.confidence === 'high'
  const isMediumConfidence = dm.confidence === 'medium'
  return (
    <div className={cn(
      'flex items-start gap-2.5 rounded-lg border p-2.5',
      isHighConfidence ? 'bg-emerald-500/5 border-emerald-500/20' :
      isMediumConfidence ? 'bg-amber-500/5 border-amber-500/20' :
      'bg-slate-900/50 border-white/5',
    )}>
      <div className={cn('mt-0.5', isQA ? 'text-emerald-400' : 'text-indigo-400')}>
        <RoleIcon roleType={dm.role_type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{dm.name}</p>
          <ConfidenceBadge confidence={dm.confidence} />
        </div>
        <p className="text-[11px] text-slate-400 truncate">{dm.role}</p>
        <div className="flex items-center gap-2 mt-1">
          {dm.linkedin_url && (
            <a href={dm.linkedin_url} target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <LinkedInIcon size={11} /> LinkedIn
            </a>
          )}
          {dm.email && (
            <a href={`mailto:${dm.email}`} className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <Mail size={11} /> {dm.email}
            </a>
          )}
        </div>
        <SourceLink dm={dm} />
      </div>
    </div>
  )
}

export function LeadResultContent({ lead }: { lead: Lead }) {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg sm:text-xl font-semibold text-white truncate">{lead.company_name}</h3>
            <StatusBadge status={lead.company_status} />
          </div>
          {lead.activity_summary && (
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{lead.activity_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noreferrer" title={lead.website} className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors">
              <Globe size={15} />
            </a>
          )}
          {lead.linkedin_url && (
            <a href={lead.linkedin_url} target="_blank" rel="noreferrer" title={lead.linkedin_url} className="p-2 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 transition-colors">
              <LinkedInIcon size={15} />
            </a>
          )}
        </div>
      </div>

      {(lead.trigger_events.length > 0 || lead.hiring.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {lead.trigger_events.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
              <AlertTriangle size={11} />
              {lead.trigger_events.length} QMS trigger{lead.trigger_events.length > 1 ? 's' : ''}
            </span>
          )}
          {lead.hiring.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <Briefcase size={11} />
              {lead.hiring.length} active job{lead.hiring.length > 1 ? 's' : ''}
            </span>
          )}
          {lead.decision_makers.filter(d => d.confidence === 'high').length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full">
              <UserCircle size={11} />
              {lead.decision_makers.filter(d => d.confidence === 'high').length} verified contact{lead.decision_makers.filter(d => d.confidence === 'high').length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {lead.website && (
        <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-300/90 hover:text-indigo-200 underline underline-offset-2 break-all">
          <Globe size={14} className="shrink-0" />
          {lead.website}
        </a>
      )}

      {lead.phones_labeled && lead.phones_labeled.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {lead.phones_labeled.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-white/5">
              <Phone size={12} className="text-slate-400" />
              <span className="text-xs text-white">{p.phone}</span>
              {p.label && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-medium uppercase tracking-wider">{p.label}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {lead.decision_makers.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
            <UserCircle size={12} />
            Who to contact · {lead.decision_makers.length}
          </p>
          <div className="space-y-2">
            {lead.decision_makers.map((dm, i) => (
              <DecisionMakerCard key={`${dm.name}-${dm.linkedin_url}-${i}`} dm={dm} />
            ))}
          </div>
        </div>
      )}

      {lead.hiring.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
            <Briefcase size={12} />
            Job openings · {lead.hiring.length}
          </p>
          <ul className="space-y-1.5">
            {lead.hiring.slice(0, 8).map((h, i) => (
              <li key={`${h.title}-${i}`}>
                <a href={h.url || '#'} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-2 text-sm text-slate-300 hover:text-indigo-300 transition-colors">
                  <span className="min-w-0 truncate">{h.title}</span>
                  <span className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500">
                    {h.location && <span className="hidden sm:inline">{h.location}</span>}
                    {h.posted && <span>{h.posted}</span>}
                    <RelevancePill score={h.relevance_score} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SignalList items={lead.trigger_events} icon={AlertTriangle} title="QMS triggers (why now)" defaultOpen />
      <SignalList items={lead.intent_signals} icon={Activity} title="Activity signals" />
    </div>
  )
}

export function LeadPlaceholderCard({ companyName }: { companyName: string }) {
  return (
    <div className="p-6 text-center space-y-3">
      <Building2 size={36} className="mx-auto text-slate-600" />
      <h3 className="text-lg font-semibold text-white truncate">{companyName}</h3>
      <p className="text-sm text-slate-400">
        No research found yet. Select the checkbox and click <strong>Research selected</strong>{' '}
        to discover decision makers, activity signals and QMS triggers.
      </p>
    </div>
  )
}
