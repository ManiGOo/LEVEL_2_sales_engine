import { useCallback, useEffect, useState, useRef } from 'react'
import { useApi } from '@/hooks/useApi'
import type { WebEvidence } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TextContentSkeleton } from '@/components/ui/ResourceLoader'
import { Loader2, Globe, RefreshCw, ExternalLink, FileWarning } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showToast, dismissToast } from '@/components/ui/toast'

interface WebEvidencePanelProps {
  eventId: string
}

function clsOf(e: WebEvidence): Record<string, unknown> {
  return e.classification || {}
}

function relevanceBadge(score: number | null | undefined) {
  if (score == null) return <Badge variant="neutral">Unscored</Badge>
  if (score >= 70) return <Badge variant="success">Relevant · {score}%</Badge>
  if (score >= 50) return <Badge variant="warning">Partial · {score}%</Badge>
  return <Badge variant="neutral">Not relevant · {score}%</Badge>
}

const REG_ACTION: Record<string, { label: string; variant: 'danger' | 'warning' | 'neutral' }> = {
  closure: { label: 'Closure', variant: 'danger' },
  licence_suspension: { label: 'Licence suspended', variant: 'danger' },
  recall: { label: 'Recall', variant: 'warning' },
  warning_letter: { label: 'Warning letter', variant: 'warning' },
  prosecution: { label: 'Prosecution', variant: 'neutral' },
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function WebEvidencePanel({ eventId }: WebEvidencePanelProps) {
  const { fetchApi } = useApi()
  const [evidence, setEvidence] = useState<WebEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const searchToastRef = useRef<string | null>(null)

  const loadEvidence = useCallback(async () => {
    try {
      const res = await fetchApi(`/api/v1/web-evidence/${eventId}`)
      const data = await res.json()
      const fetched: WebEvidence[] = data.evidence || []
      setEvidence(fetched)
      setError('')
      return fetched.length
    } catch {
      setError('Failed to load web evidence')
      return 0
    } finally {
      setLoading(false)
    }
  }, [eventId, fetchApi])

  useEffect(() => {
    setLoading(true)
    loadEvidence()
  }, [loadEvidence])

  const runSearch = async () => {
    setSearching(true)
    setError('')
    if (searchToastRef.current) dismissToast(searchToastRef.current)
    searchToastRef.current = showToast({
      variant: 'progress',
      title: 'Agentic web search started',
      description: 'Scanning the web for news, recalls & signals…',
      duration: 0,
    })
    try {
      const res = await fetchApi(`/api/v1/web-evidence/search/${eventId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to start search')
      const workflowId = data.workflow_id

      const deadline = Date.now() + 5 * 60 * 1000
      while (Date.now() < deadline) {
        await sleep(5000)
        try {
          const sRes = await fetchApi(`/api/v1/web-evidence/status/${workflowId}`)
          const s = await sRes.json()
          if (s.state === 'COMPLETED') break
          if (['FAILED', 'TERMINATED', 'CANCELED'].includes(s.state)) {
            setError(s.error ? `Search failed: ${s.error}` : 'Search did not complete')
            setSearching(false)
            if (searchToastRef.current) {
              dismissToast(searchToastRef.current)
              searchToastRef.current = null
            }
            showToast({ variant: 'error', title: 'Search failed', description: s.error || 'Search did not complete' })
            return
          }
        } catch {
          // transient — keep polling
        }
      }
      await loadEvidence().then((count) => {
        if (searchToastRef.current) {
          dismissToast(searchToastRef.current)
          searchToastRef.current = null
        }
        showToast({
          variant: 'success',
          title: 'Web evidence updated',
          description: `${count} ${count === 1 ? 'item' : 'items'} found`,
        })
      })
    } catch (e) {
      setError((e as Error).message)
      if (searchToastRef.current) {
        dismissToast(searchToastRef.current)
        searchToastRef.current = null
      }
      showToast({ variant: 'error', title: 'Search failed', description: (e as Error).message })
    } finally {
      setSearching(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3">
        <CardTitle className="flex items-center gap-2">
          <Globe size={16} className="text-cyan-400" />
          Web Evidence
          <Badge variant="info">{evidence.length}</Badge>
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={runSearch}
          disabled={searching}
          className="w-full sm:w-auto"
        >
          {searching ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          {searching ? 'Searching…' : 'Run agentic search'}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-xs text-red-400 mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
            {error}
          </p>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <TextContentSkeleton key={i} lines={3} />)}
          </div>
        )}

        {!loading && evidence.length === 0 && (
          <div className="text-center py-8">
            <FileWarning size={28} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No web evidence yet for this record</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
              Run an agentic web search to fetch news, recalls, and regulatory coverage
              of this company.
            </p>
          </div>
        )}

        <div className="space-y-2.5">
          {evidence.map((e) => {
            const c = clsOf(e)
            const paper = Boolean(e.is_paper_qms || c.is_paper_qms)
            const reg = e.regulatory_action || c.regulatory_action || ''
            const summary = String(e.summary || c.summary || '').trim()
            const snippet = e.snippet || ''
            const regDef = REG_ACTION[reg as string]
            return (
              <a
                key={e.id}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-white/5 bg-slate-900/40 p-3.5 hover:border-cyan-500/30 hover:bg-slate-800/60 transition-all group/link"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-cyan-300 group-hover/link:text-cyan-200 underline decoration-cyan-500/30 underline-offset-2 break-words leading-snug">
                    {e.title || e.url}
                  </span>
                  <ExternalLink size={13} className="text-slate-500 shrink-0 mt-1 group-hover/link:text-cyan-300" />
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {paper && <Badge variant="paper">Paper-QMS</Badge>}
                  {regDef && <Badge variant={regDef.variant}>{regDef.label}</Badge>}
                  {relevanceBadge(e.relevance_score)}
                  {e.source && <Badge variant="neutral">{e.source}</Badge>}
                  {e.published_date && <Badge variant="neutral">{e.published_date}</Badge>}
                </div>

                {typeof e.relevance_score === 'number' && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(4, e.relevance_score))}%`,
                          background:
                            e.relevance_score >= 70
                              ? '#2dd4bf'
                              : e.relevance_score >= 50
                                ? '#fbbf24'
                                : '#64748b',
                        }}
                      />
                    </div>
                  </div>
                )}

                {(summary || snippet) && (
                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed line-clamp-3">
                    {summary || snippet}
                  </p>
                )}

                <p
                  className={cn(
                    'text-[10px] mt-2 truncate text-slate-600'
                  )}
                >
                  {e.url}
                </p>
              </a>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
