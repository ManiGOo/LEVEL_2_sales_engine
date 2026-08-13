import type { GeneralCompany, Lead } from '@/types/api'

export function toLead(gc: GeneralCompany): Lead {
  return {
    company_key: gc.company_key,
    company_name: gc.name,
    website: gc.website || '',
    linkedin_url: gc.linkedin_url || '',
    company_status: gc.company_status || 'unknown',
    decision_makers: gc.decision_makers || [],
    intent_signals: gc.intent_signals || [],
    trigger_events: gc.trigger_events || [],
    activity_summary: gc.activity_summary || '',
    hiring: gc.hiring || [],
    hiring_news: gc.hiring_news || [],
    hiring_headline: gc.hiring_headline || '',
    status: 'completed',
    error: '',
    workflow_id: '',
    fetched_at: null,
  }
}
