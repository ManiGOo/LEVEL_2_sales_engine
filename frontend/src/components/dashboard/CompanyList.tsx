import type { Company } from '@/types/api'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import { ArrowRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompanyListProps {
  companies: Company[]
  loading: boolean
}

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-900'
  if (rank === 2) return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800'
  if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-700 text-slate-900'
  return 'bg-slate-700 text-slate-300'
}

export default function CompanyList({ companies, loading }: CompanyListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          Top Companies
        </CardTitle>
        <Link
          to="/companies"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
        >
          View all <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading &&
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />
          ))}

        {!loading &&
          companies.slice(0, 6).map((company, i) => (
            <Link
              key={company.company_key}
              to={`/companies/${company.slug}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <span
                className={cn(
                  'w-7 h-7 shrink-0 rounded-full text-xs font-bold flex items-center justify-center',
                  rankBadge(i + 1)
                )}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate group-hover:text-white transition-colors">
                  {company.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {company.event_count} signals
                  {company.paper_count > 0 && ` · ${company.paper_count} paper-QMS`}
                </p>
              </div>
              {company.paper_count > 0 && <Badge variant="paper">QMS</Badge>}
              <ScoreGauge score={company.score} size={32} showMaxLabel={false} />
            </Link>
          ))}

        {!loading && companies.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No companies yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
