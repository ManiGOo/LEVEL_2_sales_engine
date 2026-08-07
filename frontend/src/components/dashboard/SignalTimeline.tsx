import type { Signal } from '@/types/api'
import SignalCard from './SignalCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle } from 'lucide-react'

interface SignalFeedProps {
  signals: Signal[]
  loading: boolean
}

export default function SignalTimeline({ signals, loading }: SignalFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          Priority Signals
        </CardTitle>
        <Link
          to="/companies"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
        >
          View all <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[480px] xl:max-h-[560px] overflow-y-auto scrollbar-thin p-5 space-y-3">
          {loading &&
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}

          {!loading &&
            signals.map((signal) => <SignalCard key={signal.event_id} signal={signal} />)}

          {!loading && signals.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No signals to show yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
