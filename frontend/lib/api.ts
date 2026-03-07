const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path)
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) url.searchParams.set(k, String(v)) })
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const fetcher = (url: string) =>
  fetch(BASE + url).then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json() })

// Auth fetcher for client components — use with useAuth() hook from @clerk/nextjs
// Usage: const { getToken } = useAuth()
//        useSWR(['/api/flow/summary', getToken], authFetcher)
export async function authFetcher([path, getToken]: [string, () => Promise<string | null>]) {
  const token = await getToken()
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OverviewData {
  year: number; total_allocated: number; total_released: number; total_spent: number
  overall_utilization_pct: number; overall_absorption_pct: number
  leakage_edges_count: number; critical_anomalies_count: number
  high_lapse_risk_count: number; health_score: number
  states_covered: number; departments_covered: number
}
export interface SankeyNode { id: string; level: string }
export interface SankeyLink { source: string; target: string; value: number; absorption_ratio: number; is_leakage: boolean }
export interface SankeyData { nodes: SankeyNode[]; links: SankeyLink[] }
export interface LeakageEdge {
  from_entity: string; to_entity: string; from_level: string; to_level: string
  amount_released: number; amount_received: number; absorption_ratio: number
  gap_amount: number; leakage_score: number; state: string; scheme: string; month: number; year: number
}
export interface FlowSummary { year: number; total_released: number; total_received: number; avg_absorption_ratio: number; leakage_edge_count: number; total_gap_amount: number }
export interface Anomaly {
  exp_id: string; department: string; district: string; state: string; scheme: string
  month: number; year: number; utilization_rate: number; peer_mean: number; peer_std: number
  z_score: number; severity: 'WARNING' | 'CRITICAL'; budget_allocated: number; amount_spent: number; explanation: string
}
export interface AnomalySummary {
  year: number; total_anomalies: number; critical_count: number; warning_count: number
  top_affected_departments: { department: string; count: number }[]
  top_affected_states: { state: string; count: number }[]
}
export interface LapseRisk {
  department: string; district: string; state: string; scheme: string
  year: number; as_of_month: number; monthly_rate: number; projected_final: number
  lapse_risk_pct: number; risk_tier: 'HIGH' | 'MEDIUM' | 'LOW'
  budget_allocated: number; amount_spent_so_far: number
  pattern?: 'flatline' | 'march_rush' | 'normal'
  confidence_interval?: [number, number]
  confidence_level?: string; urgency?: string
  pattern_description?: string; months_of_data?: number
}
export interface Trajectory {
  department: string; district: string; state: string; year: number
  monthly_data: { month: number; cumulative_rate: number; projected: boolean }[]
  projected_final: number; lapse_risk_pct: number; risk_tier: string
}
export interface ReallocationRec {
  from_state: string; from_district: string; from_department: string
  to_district: string; to_department: string; to_state: string
  transfer_amount: number; rationale: string; from_lapse_risk_pct: number; priority_score: number
}
export interface SimulateBody {
  from_state: string; from_district: string; from_department: string
  to_district: string; to_department: string; transfer_pct: number; year: number; as_of_month: number
}
export interface SimulateResult {
  from_department: string; from_district: string; to_department: string; to_district: string
  transfer_amount: number; from_new_lapse_risk_pct: number; to_new_projected_final: number; impact_summary: string
}
export interface ActionDetection {
  state: string; district: string; department: string
  utilization_pct: number; lapse_risk_pct: number
  pattern: 'flatline' | 'march_rush' | 'normal'
  confidence_interval: [number, number]; z_score: number; peer_mean: number
}
export interface ActionRecommendation {
  from_district: string; from_department: string
  to_district: string; to_department: string
  transfer_amount: number; transfer_lakh: number; transfer_pct: number; gfr_note: string
}
export interface ActionImpact {
  from_util_before: number; from_util_after: number
  from_lapse_before: number; from_lapse_after: number
  to_util_before: number; to_util_after: number; net_gain: number
}
export interface ActionWindow {
  window_closes_month: number; days_remaining: number
  urgency: string; action_required: boolean; rationale: string
}
export interface ScoringFactor { factor: string; points: string; detail: string }
export interface ActionConfidence {
  confidence_score: number; confidence_label: string
  scoring_trace: ScoringFactor[]; transfer_pct: number
}
export interface Action {
  action_id: string; status: 'DRAFT' | 'APPROVED' | 'DISMISSED'
  priority: 'IMMEDIATE' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  created_at: string
  detection: ActionDetection
  recommendation: ActionRecommendation
  projected_impact: ActionImpact
  intervention_window: ActionWindow
  confidence: ActionConfidence
}
export interface DigestItem {
  type: 'NEW' | 'WORSENING' | 'RESOLVED' | 'LAPSE_WINDOW'
  department: string; district: string; state: string
  message: string; severity: string
}
export interface AuditRisk {
  state: string; district: string; department: string; scheme: string; budget_lakh: number
  audit_risk_score: number; risk_score: number; risk_tier: string
  intervention_urgency: string; months_to_ponr: number; catchup_feasible: boolean
  current_util_pct: number; projected_util_pct: number; velocity_trend: string
  recent_velocity_pct: number; required_velocity_pct: number; ponr_month: number
  scheme_expected_util_pct: number; scheme_deviation_pct: number
  historical_rush_pct: number; march_rush_probability: number; rush_risk: string
  util_2023_pct: number; util_2024_pct: number; persistence_delta: number; is_deteriorating: boolean
  avg_release_month: number; avg_spend_month: number; lag_months: number
  primary_objection: string; predicted_objection: string; secondary_objections: string[]; objection_text: string
  score_breakdown: { velocity: number; scheme_deviation: number; march_rush: number; persistence: number; parking: number }
}
export interface AuditRiskResponse { risks: AuditRisk[]; total: number }
export interface AuditSummary {
  total_departments: number; critical_count: number; high_risk_count: number
  medium_risk_count: number; low_risk_count: number; avg_audit_score: number
  ponr_count: number; total_at_risk_lakh: number; pct_march_rush_high: number
  pct_deteriorating: number; avg_lag_months: number
  worst_state: string; worst_department: string; most_common_objection: string
  objection_breakdown: Record<string, number>
  urgency_breakdown: Record<string, number>
  velocity_breakdown: Record<string, number>
}
export interface AuditSummaryResponse { summary: AuditSummary }
export interface DigestResponse {
  headline: string; body: string; action_today: string
  tone: 'URGENT' | 'WATCHFUL' | 'STABLE'; source: 'groq' | 'rule'
}
export interface CopilotAnswer {
  answer: string; intent: string; tools_used: string[]; source: 'groq' | 'rule'
}

// ── API calls ──────────────────────────────────────────────────────────────────
export const api = {
  overview:         (year = 2024) => get<OverviewData>('/api/overview', { year }),
  sankey:           (year = 2024, state?: string) => get<SankeyData>('/api/flow/sankey', { year, state }),
  leakageEdges:     (year = 2024, min_score = 1.0) => get<LeakageEdge[]>('/api/flow/leakage-edges', { year, min_score }),
  flowSummary:      (year = 2024) => get<FlowSummary>('/api/flow/summary', { year }),
  anomalies:        (year = 2024, severity?: string) => get<Anomaly[]>('/api/anomalies', { year, severity, explain: 'true' }),
  anomalySummary:   (year = 2024) => get<AnomalySummary>('/api/anomalies/summary', { year }),
  lapseRisks:       (year = 2024, as_of_month = 8, risk_tier?: string) => get<LapseRisk[]>('/api/forecast/lapse-risks', { year, as_of_month, risk_tier }),
  trajectory:       (department: string, district: string, state: string, year = 2024) => get<Trajectory>('/api/forecast/trajectory', { department, district, state, year }),
  reallocationRecs: (year = 2024, as_of_month = 8) => get<ReallocationRec[]>('/api/reallocation/recommendations', { year, as_of_month }),
  simulate:         (body: SimulateBody) => post<SimulateResult>('/api/reallocation/simulate', body),
  actions:          (year = 2024, as_of_month = 8, status?: string, priority?: string) =>
    get<Action[]>('/api/actions', { year, as_of_month, status, priority }),
  actionById:       (id: string) => get<Action>(`/api/actions/${id}`),
  actionDigest:     (year = 2024, as_of_month = 8) => get<DigestItem[]>('/api/actions/digest', { year, as_of_month }),
  approveAction:    (id: string, officer_note = '') => post<Action>(`/api/actions/${id}/approve`, { officer_note }),
  dismissAction:    (id: string, officer_note = '') => post<Action>(`/api/actions/${id}/dismiss`, { officer_note }),
  actionMemo:       (id: string) => get<{ memo: string }>(`/api/actions/${id}/memo`),
  auditRisk:        (year = 2024, as_of_month = 8) => get<AuditRiskResponse>('/api/audit/risk', { year, as_of_month }),
  auditSummary:     (year = 2024, as_of_month = 8) => get<AuditSummaryResponse>('/api/audit/summary', { year, as_of_month }),
  digestCached:     () => get<DigestResponse>('/api/copilot/digest/cached'),
  digest:           (year = 2024, as_of_month = 8) => get<DigestResponse>('/api/copilot/digest', { year, as_of_month }),
  copilotAsk:       (question: string, year = 2024, as_of_month = 8, chat_history: {role:string;content:string}[] = []) =>
    post<CopilotAnswer>('/api/copilot/ask', { question, year, as_of_month, chat_history }),
}