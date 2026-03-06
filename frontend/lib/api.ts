const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OverviewData {
  year: number
  total_allocated: number
  total_released: number
  total_spent: number
  overall_utilization_pct: number
  overall_absorption_pct: number
  leakage_edges_count: number
  critical_anomalies_count: number
  high_lapse_risk_count: number
  health_score: number
  states_covered: number
  departments_covered: number
}

export interface SankeyNode { id: string; level: string }
export interface SankeyLink {
  source: string; target: string
  value: number; absorption_ratio: number; is_leakage: boolean
}
export interface SankeyData { nodes: SankeyNode[]; links: SankeyLink[] }

export interface LeakageEdge {
  from_entity: string; to_entity: string
  from_level: string; to_level: string
  amount_released: number; amount_received: number
  absorption_ratio: number; gap_amount: number
  leakage_score: number; state: string
  scheme: string; month: number; year: number
}

export interface FlowSummary {
  year: number; state?: string
  total_released: number; total_received: number
  avg_absorption_ratio: number; leakage_edge_count: number
  total_gap_amount: number
}

export interface Anomaly {
  exp_id: string; department: string
  district: string; state: string; scheme: string
  month: number; year: number
  utilization_rate: number; peer_mean: number; peer_std: number
  z_score: number; severity: 'WARNING' | 'CRITICAL'
  budget_allocated: number; amount_spent: number
  explanation: string
}

export interface AnomalySummary {
  year: number; total_anomalies: number
  critical_count: number; warning_count: number
  top_affected_departments: { department: string; count: number }[]
  top_affected_states: { state: string; count: number }[]
}

export interface LapseRisk {
  department: string; district: string; state: string; scheme: string
  year: number; as_of_month: number
  monthly_rate: number; projected_final: number
  lapse_risk_pct: number; risk_tier: 'HIGH' | 'MEDIUM' | 'LOW'
  budget_allocated: number; amount_spent_so_far: number
}

export interface Trajectory {
  department: string; district: string; state: string; year: number
  monthly_data: { month: number; cumulative_rate: number; projected: boolean }[]
  projected_final: number; lapse_risk_pct: number; risk_tier: string
}

export interface ReallocationRec {
  from_district: string; from_department: string; from_state: string
  to_district: string; to_department: string; to_state: string
  transfer_amount: number; rationale: string
  from_lapse_risk_pct: number; priority_score: number
}

export interface SimulateBody {
  from_state: string; from_district: string; from_department: string
  to_district: string; to_department: string
  transfer_pct: number; year: number; as_of_month: number
}

export interface SimulateResult {
  from_department: string; from_district: string
  to_department: string; to_district: string
  transfer_amount: number
  from_new_lapse_risk_pct: number; to_new_projected_final: number
  impact_summary: string
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  overview: (year = 2024) => get<OverviewData>('/api/overview', { year }),

  sankey: (year = 2024, state?: string) =>
    get<SankeyData>('/api/flow/sankey', { year, state }),

  leakageEdges: (year = 2024, min_score = 1.0) =>
    get<LeakageEdge[]>('/api/flow/leakage-edges', { year, min_score }),

  flowSummary: (year = 2024) => get<FlowSummary>('/api/flow/summary', { year }),

  anomalies: (year = 2024, severity?: string) =>
    get<Anomaly[]>('/api/anomalies', { year, severity, explain: 'true' }),

  anomalySummary: (year = 2024) => get<AnomalySummary>('/api/anomalies/summary', { year }),

  lapseRisks: (year = 2024, as_of_month = 8, risk_tier?: string) =>
    get<LapseRisk[]>('/api/forecast/lapse-risks', { year, as_of_month, risk_tier }),

  trajectory: (department: string, district: string, state: string, year = 2024) =>
    get<Trajectory>('/api/forecast/trajectory', { department, district, state, year }),

  reallocationRecs: (year = 2024, as_of_month = 8) =>
    get<ReallocationRec[]>('/api/reallocation/recommendations', { year, as_of_month }),

  simulate: (body: SimulateBody) =>
    post<SimulateResult>('/api/reallocation/simulate', body),
}