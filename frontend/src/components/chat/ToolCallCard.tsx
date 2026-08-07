import { motion } from 'motion/react'
import type { ToolCall } from '@/types/api'
import { Wrench, CheckCircle2, Loader2, XCircle } from 'lucide-react'

interface ToolCallCardProps {
  toolCall: ToolCall
}

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const statusIcon = {
    pending: <Wrench size={14} className="text-slate-500" />,
    running: <Loader2 size={14} className="text-indigo-400 animate-spin" />,
    completed: <CheckCircle2 size={14} className="text-green-400" />,
    error: <XCircle size={14} className="text-red-400" />,
  }[toolCall.status]

  const toolLabels: Record<string, string> = {
    query_signals: 'Queried signals',
    get_company_signals: 'Fetched company data',
    get_company_ranking: 'Loaded company ranking',
    get_web_evidence: 'Retrieved web evidence',
    analyze_cdsco_failure: 'Analyzed CDSCO failure',
    classify_regulatory_finding: 'Classified finding',
    classify_web_article: 'Classified article',
    trigger_scraper: 'Started scraper',
    trigger_enrichment: 'Started enrichment',
    trigger_web_evidence: 'Started web search',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-xs"
    >
      {statusIcon}
      <span className="text-slate-400">
        {toolLabels[toolCall.name] || toolCall.name}
      </span>
      {toolCall.status === 'completed' && toolCall.result !== undefined && toolCall.result !== null && (
        <span className="text-slate-600 truncate max-w-[200px]">
          {typeof toolCall.result === 'string'
            ? toolCall.result.slice(0, 60)
            : JSON.stringify(toolCall.result).slice(0, 60)}
        </span>
      )}
    </motion.div>
  )
}
