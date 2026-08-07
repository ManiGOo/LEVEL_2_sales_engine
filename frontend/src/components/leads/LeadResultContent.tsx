import type { Lead } from '@/types/api'
import {
  Building2,
  Briefcase,
  Globe,
  Newspaper,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
    </svg>
  )
}

export function LeadResultContent({ lead }: { lead: Lead }) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-white truncate">{lead.company_name}</h3>
          {lead.hiring_headline && (
            <p className="text-sm text-indigo-300/80 mt-0.5">{lead.hiring_headline}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer"
              title={lead.website}
              className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
            >
              <Globe size={15} />
            </a>
          )}
          {lead.linkedin_url && (
            <a
              href={lead.linkedin_url}
              target="_blank"
              rel="noreferrer"
              title={lead.linkedin_url}
              className="p-2 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 transition-colors"
            >
              <LinkedInIcon size={15} />
            </a>
          )}
        </div>
      </div>

      {lead.website && (
        <a
          href={lead.website}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-indigo-300/90 hover:text-indigo-200 underline underline-offset-2 break-all"
        >
          <Globe size={14} className="shrink-0" />
          {lead.website}
        </a>
      )}

      <div>
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
          <Briefcase size={12} />
          Job openings · {lead.hiring.length}
        </p>
        {lead.hiring.length === 0 ? (
          <p className="text-sm text-slate-600">No current job postings found.</p>
        ) : (
          <ul className="space-y-1.5">
            {lead.hiring.slice(0, 8).map((h, i) => (
              <li key={`${h.title}-${i}`}>
                <a
                  href={h.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'flex items-start justify-between gap-2 text-sm',
                    h.url
                      ? 'text-slate-300 hover:text-indigo-300 transition-colors'
                      : 'text-slate-300'
                  )}
                >
                  <span className="min-w-0 truncate">{h.title}</span>
                  <span className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500">
                    {h.location && <span className="hidden sm:inline">{h.location}</span>}
                    {h.posted && <span>{h.posted}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lead.hiring_news.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
            <Newspaper size={12} />
            Hiring news
          </p>
          <ul className="space-y-1.5">
            {lead.hiring_news.slice(0, 6).map((n, i) => (
              <li key={`${n.url}-${i}`}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-slate-300 hover:text-indigo-300 transition-colors"
                >
                  <span className="font-medium">{n.title}</span>
                  <span className="text-[11px] text-slate-500">
                    {' '}
                    · {n.source || 'web'}
                    {n.date && ` · ${n.date}`}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
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
        to discover hiring signals, website and LinkedIn data.
      </p>
    </div>
  )
}
