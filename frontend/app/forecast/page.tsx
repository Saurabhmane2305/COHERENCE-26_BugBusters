'use client'
import { useEffect, useState } from 'react'
import { api, LapseRisk, Trajectory } from '@/lib/api'
import LapseTimeline from '@/components/charts/LapseTimeline'

type Tier = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

const TIER_COLOR: Record<string, string> = {
  HIGH: 'var(--red)',
  MEDIUM: 'var(--amber)',
  LOW: 'var(--green)',
}
const TIER_BG: Record<string, string> = {
  HIGH: 'var(--red-dim)',
  MEDIUM: 'var(--amber-dim)',
  LOW: 'var(--green-dim)',
}

function fmtCr(n: number) { return `₹${(n / 1e7).toFixed(1)}Cr` }

export default function ForecastPage() {
  const [tier, setTier] = useState<Tier>('ALL')
  const [risks, setRisks] = useState<LapseRisk[]>([])
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null)
  const [selected, setSelected] = useState<LapseRisk | null>(null)
  const [loading, setLoading] = useState(true)
  const [trajLoading, setTrajLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.lapseRisks(2024, 8, tier === 'ALL' ? undefined : tier)
      .then(setRisks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [tier])

  const loadTrajectory = (risk: LapseRisk) => {
    setSelected(risk)
    setTrajLoading(true)
    api.trajectory(risk.department, risk.district, risk.state, 2024)
      .then(setTrajectory)
      .catch(() => setTrajectory(null))
      .finally(() => setTrajLoading(false))
  }

  const tierCounts = {
    HIGH: risks.filter(r => r.risk_tier === 'HIGH').length,
    MEDIUM: risks.filter(r => r.risk_tier === 'MEDIUM').length,
    LOW: risks.filter(r => r.risk_tier === 'LOW').length,
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 6 }}>
          LINEAR TRAJECTORY PROJECTION · AS OF MONTH 8
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>
          Fund Lapse Forecasting
        </h2>
      </div>

      {/* Risk tier summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {(['HIGH', 'MEDIUM', 'LOW'] as const).map(t => (
          <button key={t} onClick={() => setTier(t === tier ? 'ALL' : t)} style={{
            background: tier === t ? TIER_BG[t] : 'var(--bg-card)',
            border: `1px solid ${tier === t ? TIER_COLOR[t] : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: TIER_COLOR[t], letterSpacing: '0.1em', marginBottom: 6 }}>
              {t} RISK
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: TIER_COLOR[t] }}>
              {tierCounts[t]}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {t === 'HIGH' ? '>60% projected lapse' : t === 'MEDIUM' ? '30–60% projected lapse' : '<30% projected lapse'}
            </div>
          </button>
        ))}
      </div>

      {/* Method explanation */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '12px 18px', marginBottom: 20,
        display: 'flex', gap: 20, alignItems: 'center',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>METHOD:</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          monthly_rate = cumulative_absorption / months_elapsed
        </div>
        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          projected_final = monthly_rate × 12
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          Click a row to view trajectory
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Risk table */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9, color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}>
            LAPSE RISK REGISTRY · {risks.length} ENTRIES
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24 }}>
              <div className="spinner" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Projecting trajectories...</span>
            </div>
          ) : error ? (
            <div style={{ padding: 20, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>⚠ {error}</div>
          ) : (
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {risks.map((risk, i) => {
                const color = TIER_COLOR[risk.risk_tier]
                const isSelected = selected?.department === risk.department && selected?.district === risk.district
                return (
                  <div
                    key={`${risk.department}-${risk.district}-${i}`}
                    onClick={() => loadTrajectory(risk)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      transition: 'background 0.15s',
                      animation: `fadeUp 0.3s ease ${i * 40}ms both`,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                          {risk.department}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                          {risk.district}, {risk.state}
                        </div>
                      </div>
                      <div style={{
                        padding: '2px 7px', borderRadius: 3,
                        background: TIER_BG[risk.risk_tier],
                        border: `1px solid ${color}`,
                        fontSize: 9, fontFamily: 'var(--font-mono)', color,
                      }}>
                        {risk.risk_tier}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>LAPSE RISK</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color }}>{risk.lapse_risk_pct.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>PROJECTED</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {(risk.projected_final * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginBottom: 2 }}>ALLOCATED</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {fmtCr(risk.budget_allocated)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {risks.length === 0 && (
                <div style={{ padding: 24, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  ✓ No lapse risks for current filter
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trajectory panel */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '18px 20px',
        }}>
          {!selected && (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11,
            }}>
              <span style={{ fontSize: 32, opacity: 0.3 }}>◉</span>
              <span>Select a department to view trajectory</span>
            </div>
          )}
          {selected && trajLoading && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div className="spinner" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Loading trajectory...</span>
            </div>
          )}
          {selected && !trajLoading && trajectory && (
            <LapseTimeline trajectory={trajectory} />
          )}
          {selected && !trajLoading && !trajectory && (
            <div style={{ padding: 20, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              ⚠ Could not load trajectory data
            </div>
          )}
        </div>
      </div>
    </div>
  )
}