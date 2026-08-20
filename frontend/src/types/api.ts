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
  state: string
  location: string
}

export interface CompanyPage {
  items: Company[]
  total: number
  page: number
  page_size: number
  pages: number
  available_years: number[]
  available_states: string[]
  has_others: boolean
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
  source?: string
  source_url?: string
}

export interface IntentSignal {
  category: string
  title: string
  url: string
  snippet?: string
  date?: string
  relevance_score?: number | null
}

export interface CampaignLead {
  id: string
  company_key: string
  company_name: string
  website: string
  linkedin_url: string
  contact_name: string
  contact_role: string
  contact_email: string
  contact_phone: string
  contact_phone_label?: string | null
  contact_source?: string
  contact_source_url?: string
  contact_evidence?: string
  contact_confidence?: string
  verification_status: string
  outreach_readiness: string
  verified_at?: string | null
  do_not_contact: boolean
  status: string
  last_contact_at: string | null
  next_follow_up_at: string | null
  notes: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  name: string
  description: string
  status: string
  objective?: string
  target_audience?: string
  offer_context?: string
  sender_identity?: string
  approved_channels?: string[]
  daily_send_limit?: number
  stop_conditions?: string
  preflight_complete?: boolean
  created_by_name: string
  created_at: string
  updated_at: string
  lead_count: number
  leads: CampaignLead[]
}

export interface CampaignSummary {
  id: string
  name: string
  description: string
  status: string
  created_by_name: string
  created_at: string
  updated_at: string
  lead_count: number
  preflight_complete?: boolean
}

export interface CampaignPage {
  items: CampaignSummary[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface CampaignActivity {
  id: string
  lead_id: string | null
  actor_name: string
  action: string
  detail: string
  entity_type?: 'campaign' | 'lead' | 'team_activity' | null
  from_state?: string | null
  to_state?: string | null
  snapshot?: Record<string, unknown> | null
  created_at: string
}

export interface CampaignDetail {
  campaign: Campaign
  activities: CampaignActivity[]
  messages: OutreachMessage[]
}

export interface OutreachMessage {
  id: string
  campaign_id: string
  lead_id: string
  channel: string
  status: string
  subject?: string | null
  body: string
  generated_by: string
  approved_by?: string | null
  approved_at?: string | null
  created_at: string
  updated_at: string
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
  phones_labeled?: { phone: string, label: string, page_url?: string }[]
}

export interface GeneralCompany {
  id: string
  company_key: string
  name: string
  website: string
  linkedin_url: string
  company_status: string
  industry: string
  description: string
  location: string
  employees: string
  revenue: string
  email: string
  phone: string
  phones_labeled?: { phone: string, label: string, page_url?: string }[]
  hiring_headline: string
  activity_summary: string
  notes: string
  decision_makers: DecisionMaker[]
  hiring: LeadHiring[]
  hiring_news: LeadHiringNews[]
  intent_signals: IntentSignal[]
  trigger_events: IntentSignal[]
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface GeneralCompanyPage {
  items: GeneralCompany[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type AccountStageStatus = 'planned' | 'active' | 'completed' | 'blocked'

export interface AccountStageSnapshot {
  id: string
  stage_id: string
  company_key: string
  name: string
  status: AccountStageStatus
  objective: string | null
  data: Record<string, unknown> | null
  actor_name: string | null
  created_at: string
}

export interface AccountStage {
  id: string
  company_key: string
  company_name: string
  name: string
  status: AccountStageStatus
  objective: string | null
  data: Record<string, unknown> | null
  order_index: number
  version: number
  history: AccountStageSnapshot[]
  created_at: string
  updated_at: string
}

export interface AccountListItem {
  company_key: string
  name: string
  current_stage: AccountStage | null
  total_stages: number
}

export interface AccountListPage {
  items: AccountListItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface AccountDetail {
  company_key: string
  company_name: string | null
  owner_id: string | null
  owner_email: string | null
  stages: AccountStage[]
}

export interface AccountHistoryItem {
  id: string
  stage_id: string
  stage_name: string
  actor_name: string | null
  status: AccountStageStatus
  created_at: string
}

export interface AccountTemplateStage {
  name: string
  objective: string
  status: AccountStageStatus
  fields: string[]
}

export interface AccountTemplate {
  key: string
  name: string
  description: string
  stages: AccountTemplateStage[]
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export interface QuotationLineItem {
  category: string
  description: string
  qty: number
  unit: string
  unit_price: number
  type: 'one_time' | 'recurring'
  discount_pct: number
  line_total: number
}

export interface Quotation {
  id: string
  company_key: string
  company_name: string
  quote_number: string
  status: QuotationStatus
  currency: string
  title: string
  valid_until: string | null
  intro: string | null
  terms: string | null
  notes: string | null
  line_items: QuotationLineItem[]
  subtotal: number
  discount_total: number
  tax_pct: number
  tax_amount: number
  total: number
  owner_id: string | null
  owner_email: string | null
  version: number
  html: string | null
  created_at: string
  updated_at: string
}

export interface QuotationListItem {
  id: string
  company_key: string
  company_name: string
  quote_number: string
  status: QuotationStatus
  currency: string
  title: string
  total: number
  valid_until: string | null
  version: number
  updated_at: string
}

export interface QuotationListPage {
  items: QuotationListItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface QuotationInput {
  company_key?: string
  company_name?: string
  title?: string
  currency?: string
  status?: QuotationStatus
  valid_until?: string | null
  intro?: string | null
  terms?: string | null
  notes?: string | null
  tax_pct?: number
  line_items?: Array<{
    category: string
    description: string
    qty: number
    unit: string
    unit_price: number
    type: 'one_time' | 'recurring'
    discount_pct: number
  }>
}

export interface QuotationVersionMeta {
  version: number
  created_at: string
  created_by_email: string | null
  status: string
  total: number
  has_html: boolean
}

export interface QuotationVersionDetail {
  version: number
  created_at: string
  created_by_email: string | null
  status: string
  total: number
  data: Record<string, unknown>
  html: string | null
}
