import { Activity, Building2, ClipboardCheck, Target } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardsProps {
  totalSignals: number
  paperCount: number
  totalCompanies: number
  topScore: number
}

export default function StatsCards({ totalSignals, paperCount, totalCompanies, topScore }: StatsCardsProps) {
  const stats = [
    {
      label: 'Regulatory Signals',
      value: totalSignals,
      icon: Activity,
      accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      hint: 'Total CDSCO failures tracked',
    },
    {
      label: 'Paper-QMS Leads',
      value: paperCount,
      icon: ClipboardCheck,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      hint: 'Manual-QMS buying signals',
    },
    {
      label: 'Companies',
      value: totalCompanies,
      icon: Building2,
      accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      hint: 'Manufacturers in watchlist',
    },
    {
      label: 'Top Lead Score',
      value: topScore,
      icon: Target,
      accent: 'text-red-400 bg-red-500/10 border-red-500/20',
      hint: 'Highest active signal',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div
            className={cn(
              'w-9 h-9 rounded-xl border flex items-center justify-center mb-3',
              stat.accent
            )}
          >
            <stat.icon size={17} />
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {stat.value.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">{stat.label}</p>
          <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">{stat.hint}</p>
        </Card>
      ))}
    </div>
  )
}
