export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'rep'
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface Signal {
  event_id: string
  regulator: string
  event_type: string
  score: number
  max_possible_score: number
  company_name: string
  slug?: string
  company_key?: string
  llm_analysis: Record<string, unknown>
  raw_details: Record<string, unknown>
  event_date: string
  reporting_source: string
  reported_by: string
  score_breakdown: Record<string, unknown>
  enrichment: Record<string, unknown>
  paper_assessment: Record<string, unknown>
  web_evidence: WebEvidence[]
  event_count: number
  events: Signal[]
}

export interface SignalPage {
  items: Signal[]
  total: number
  page: number
  page_size: number
  pages: number
  paper_count?: number
}

export interface Company {
  company_key: string
  name: string
  slug: string
  score: number
  max_possible_score: number
  event_count: number
  avg_score: number
  latest_date: string
  regulators: string[]
  paper_count: number
  mandate_count: number
}

export interface CompanyPage {
  items: Company[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface CompanyDetail {
  company: Company & {
    years: string[]
    evidence_count: number
    web_evidence_count: number
  }
  card: Signal
}

export interface WebEvidence {
  id: string
  title: string
  url: string
  source: string
  relevance_score: number
  classification: Record<string, unknown>
  snippet: string
  published_date?: string | null
  fetch_status?: string
  fetched_at?: string | null
  is_paper_qms?: boolean
  regulatory_action?: string
  recall_action?: boolean
  corroborates_failure?: boolean
  summary?: string
  severity?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls?: ToolCall[]
  timestamp: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface LeadHiring {
  title: string
  location?: string
  posted?: string
  url?: string
  relevance_score?: number | null
}

export interface LeadHiringNews {
  title: string
  url: string
  source?: string
  snippet?: string
  date?: string
  relevance_score?: number | null
}

export interface DecisionMaker {
  name: string
  role: string
  role_type: string
  linkedin_url?: string
  email?: string
  confidence?: string
}

export interface IntentSignal {
  category: string
  title: string
  url: string
  snippet?: string
  date?: string
  relevance_score?: number | null
}

export interface Lead {
  company_key: string
  company_name: string
  website: string
  linkedin_url: string
  company_status: string
  decision_makers: DecisionMaker[]
  intent_signals: IntentSignal[]
  trigger_events: IntentSignal[]
  activity_summary: string
  hiring: LeadHiring[]
  hiring_news: LeadHiringNews[]
  hiring_headline: string
  status: 'not_started' | 'running' | 'completed' | 'failed'
  error: string
  workflow_id: string
  fetched_at: string | null
}
