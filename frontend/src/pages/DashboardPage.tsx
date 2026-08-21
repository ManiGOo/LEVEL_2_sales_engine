import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/providers/AuthProvider'
import type { SignalPage, CompanyPage } from '@/types/api'
import StatsCards from '@/components/dashboard/StatsCards'
import CompanyList from '@/components/dashboard/CompanyList'
import SignalTimeline from '@/components/dashboard/SignalTimeline'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { motion } from 'motion/react'
import { Sparkles, Radar, Activity, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatMoney, QUOTATION_STATUS_VARIANT } from '@/lib/quotation'
import { stageStatusMeta } from '@/lib/account'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { fetchApi } = useApi()
  const { tokens, user } = useAuth()
  const firstName = (user?.name || 'Sales Rep').split(' ')[0]

  const { data: signals, isLoading: signalsLoading } = useQuery({
    queryKey: ['signals', 'high-priority'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/signals/high-priority?page_size=12&group_by=company')
      return (await res.json()) as SignalPage
    },
    enabled: !!tokens?.access_token,
    retry: false,
  })

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies', 'ranking'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/companies/ranking?page_size=100')
      return (await res.json()) as CompanyPage
    },
    enabled: !!tokens?.access_token,
    retry: false,
  })

  const { data: latestHistory } = useQuery({
    queryKey: ['account-history', 'latest'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/accounts/history/latest?limit=1')
      return (await res.json()) as any[]
    },
    enabled: !!tokens?.access_token,
  })

  const { data: latestQuotations } = useQuery({
    queryKey: ['quotations', 'latest'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/quotations?page_size=1')
      return (await res.json()) as { items: any[] }
    },
    enabled: !!tokens?.access_token,
  })

  const topSignal = signals?.items?.[0]
  const recentHistory = latestHistory?.[0]
  const recentQuotation = latestQuotations?.items?.[0]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 lg:space-y-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {greeting()}, {firstName}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Regulatory intelligence for your sales pipeline
          </p>
        </div>
        <ButtonLink size="sm" href="/chat" className="shrink-0">
          <Sparkles size={14} />
          Ask AI
        </ButtonLink>
      </div>

      {topSignal && (
        <Card className="gradient-border overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Radar size={20} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-indigo-400/80 font-semibold">
                  Highest-priority lead
                </p>
                <p className="text-base sm:text-lg font-semibold text-white truncate mt-0.5">
                  {topSignal.company_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {String(topSignal.raw_details?.drug_name || 'Unknown drug')} · Score{' '}
                  <span className="text-amber-400 font-bold">{topSignal.score}</span>
                </p>
              </div>
              <ButtonLink size="sm" variant="secondary" className="shrink-0" href={topSignal.slug ? `/companies/${topSignal.slug}` : '/companies'}>
                View
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      )}

      <StatsCards
        totalSignals={signals?.total || 0}
        paperCount={signals?.paper_count || 0}
        totalCompanies={companies?.total || 0}
        topScore={topSignal?.score || 0}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
        {recentHistory && (
          <Card className="overflow-hidden border border-slate-700/60 bg-slate-800/40">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-700/50 border border-white/5 flex items-center justify-center shrink-0">
                  <Activity size={18} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">
                    Latest Workflow Alert
                  </p>
                  <p className="text-sm font-semibold text-white truncate">
                    {recentHistory.stage_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={stageStatusMeta(recentHistory.status).badge}>{stageStatusMeta(recentHistory.status).label}</Badge>
                    <span className="text-xs text-slate-500 truncate">
                      by {recentHistory.actor_name || 'Teammate'}
                    </span>
                  </div>
                </div>
              </div>
              <ButtonLink size="sm" variant="secondary" className="shrink-0" href={`/accounts/${recentHistory.company_key || ''}`}>
                View
              </ButtonLink>
            </CardContent>
          </Card>
        )}

        {recentQuotation && (
          <Card className="overflow-hidden border border-slate-700/60 bg-slate-800/40">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-700/50 border border-white/5 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">
                    Latest Quotation
                  </p>
                  <p className="text-sm font-semibold text-white truncate">
                    {recentQuotation.company_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={QUOTATION_STATUS_VARIANT[recentQuotation.status as keyof typeof QUOTATION_STATUS_VARIANT] || 'default'}>{recentQuotation.status}</Badge>
                    <span className="text-xs font-semibold text-slate-300">
                      {formatMoney(recentQuotation.total, recentQuotation.currency)}
                    </span>
                  </div>
                </div>
              </div>
              <ButtonLink size="sm" variant="secondary" className="shrink-0" href={`/quotations/${recentQuotation.id}`}>
                View
              </ButtonLink>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6 items-start">
        <div className="lg:col-span-3">
          <SignalTimeline signals={signals?.items || []} loading={signalsLoading} />
        </div>
        <div className="lg:col-span-2 space-y-5 lg:space-y-6">
          <CompanyList companies={companies?.items || []} loading={companiesLoading} />
          <Card className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardContent className="p-0">
              <p className="text-sm font-semibold text-white">Deep-dive a company</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Let the AI investigate a manufacturer, surface related incidents,
                and run agentic web searches for regulatory evidence.
              </p>
              <ButtonLink size="sm" variant="outline" className="mt-3" href="/chat">
                Open AI assistant
              </ButtonLink>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
