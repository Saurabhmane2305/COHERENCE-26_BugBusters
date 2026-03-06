'use client'
import { useEffect, useState } from 'react'
import { api, Anomaly, AnomalySummary } from '@/lib/api'
import AnomalyCard from '@/components/cards/AnomalyCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Severity = 'ALL' | 'CRITICAL' | 'WARNING'

export default function AnomaliesPage() {
  const [severity, setSeverity] = useState<Severity>('ALL')
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [summary, setSummary] = useState<AnomalySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.anomalies(2024, severity === 'ALL' ? undefined : severity),
      api.anomalySummary(2024),
    ])
      .then(([a, s]) => { setAnomalies(a); setSummary(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [severity])

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 6 }}>
            Z-SCORE ENGINE · PEER COMPARISON
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>
            Anomaly Detection
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'CRITICAL', 'WARNING'] as Severity[]).map(s => (
            <button key={s} onClick={() => setSeverity(s)} style={{
              padding: '5px 14px',
              background: severity === s ? (s === 'CRITICAL' ? 'var(--red-dim)' : s === 'WARNING' ? 'var(--amber-dim)' : 'var(--cyan-dim)') : 'var(--bg-card)',
              border: `1px solid ${severity === s ? (s === 'CRITICAL' ? 'var(--red)' : s === 'WARNING' ? 'var(--amber)' : 'var(--cyan)') : 'var(--border)'}`,
              borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
              color: severity === s ? (s === 'CRITICAL' ? 'var(--red)' : s === 'WARNING' ? 'var(--amber)' : 'var(--cyan)') : 'var(--text-secondary)',
              fontSize: 11, fontFamily: 'var(--font-mono)',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 18px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>TOTAL ANOMALIES</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--cyan)' }}>
              {summary.total_anomalies}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)' }}>
                ◈ {summary.critical_count} CRITICAL
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)' }}>
                ◎ {summary.warning_count} WARNING
              </span>
            </div>
          </div>

          {/* Top departments chart */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 18px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>
              TOP AFFECTED DEPARTMENTS
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={summary.top_affected_departments.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="department" width={80}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-primary)',
                  }}
                />
                <Bar dataKey="count" radius={2}>
                  {summary.top_affected_departments.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={i === 0 ? 'var(--red)' : i === 1 ? 'var(--amber)' : 'var(--cyan)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top states */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 18px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>
              TOP AFFECTED STATES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.top_affected_states.slice(0, 4).map(({ state, count }, i) => (
                <div key={state} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
                    {i + 1}. {state}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: i === 0 ? 'var(--red)' : i === 1 ? 'var(--amber)' : 'var(--cyan)',
                    padding: '1px 6px',
                    background: i === 0 ? 'var(--red-dim)' : i === 1 ? 'var(--amber-dim)' : 'var(--cyan-dim)',
                    borderRadius: 3,
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Z-score explanation */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>METHOD:</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          z = (dept_utilization − peer_mean) / peer_std
        </div>
        <div style={{ height: 24, width: 1, background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)' }}>|z| &gt; 3.0 → CRITICAL</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)' }}>|z| &gt; 2.0 → WARNING</span>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          Peers grouped by: department + state + month
        </div>
      </div>

      {/* Anomaly cards */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40 }}>
          <div className="spinner" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>Running z-score analysis...</span>
        </div>
      ) : error ? (
        <div style={{ padding: 24, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          ⚠ {error}
        </div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 14 }}>
            SHOWING {anomalies.length} ANOMAL{anomalies.length !== 1 ? 'IES' : 'Y'}{severity !== 'ALL' ? ` · FILTERED: ${severity}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
            {anomalies.map((a, i) => (
              <AnomalyCard key={a.exp_id} anomaly={a} delay={i * 60} />
            ))}
            {anomalies.length === 0 && (
              <div style={{ padding: 24, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                ✓ No anomalies detected for current filter
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}