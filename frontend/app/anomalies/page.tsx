'use client'
import { useEffect, useState } from 'react'
import { api, OverviewData } from '@/lib/api'
import KPICard from '@/components/cards/KPICard'
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'

function fmtCr(n: number) {
  if (n >= 1e11) return `₹${(n / 1e11).toFixed(2)}L Cr`
  return `₹${(n / 1e7).toFixed(0)}Cr`
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)'
  const label = score >= 70 ? 'HEALTHY' : score >= 50 ? 'AT RISK' : 'CRITICAL'

  return (
    <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius={55} outerRadius={85}
          data={[{ value: score, fill: color }]}
          startAngle={225} endAngle={-45}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: 'var(--bg-secondary)' }}
            dataKey="value"
            cornerRadius={6}
            angleAxisId={0}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800, fontSize: 28,
          color,
        }}>{score}</div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8, color,
          letterSpacing: '0.1em',
        }}>{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.overview(2024)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12 }}>
      <div className="spinner" />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
        Loading overview...
      </span>
    </div>
  )

  if (error) return (
    <div style={{
      padding: 24, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 12, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)',
    }}>
      ⚠ {error}
    </div>
  )

  if (!data) return null

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Section title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9, color: 'var(--text-muted)',
          letterSpacing: '0.15em', marginBottom: 6,
        }}>
          FISCAL YEAR 2024 · NATIONAL SUMMARY
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800, fontSize: 22,
          color: 'var(--text-primary)',
        }}>
          Budget Health Dashboard
        </h2>
      </div>

      {/* Top row: KPIs + Health Score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 220px', gap: 16, marginBottom: 20 }}>
        <KPICard
          label="Total Allocated"
          value={fmtCr(data.total_allocated)}
          sub={`${data.states_covered} states covered`}
          accent="cyan" icon="◎" delay={0}
        />
        <KPICard
          label="Total Released"
          value={fmtCr(data.total_released)}
          sub={`${(data.total_released / data.total_allocated * 100).toFixed(1)}% of allocated`}
          accent="purple" icon="⬡" delay={80}
        />
        <KPICard
          label="Total Spent"
          value={fmtCr(data.total_spent)}
          sub={`${data.overall_utilization_pct.toFixed(1)}% utilization`}
          accent="green" icon="✦" delay={160}
        />
        {/* Health gauge */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          animation: 'fadeUp 0.4s ease 240ms both',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9, color: 'var(--text-muted)',
            letterSpacing: '0.1em', marginBottom: 8,
          }}>
            HEALTH SCORE
          </div>
          <HealthGauge score={data.health_score} />
        </div>
      </div>

      {/* Alert row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Leakage Edges Detected"
          value={data.leakage_edges_count}
          sub="Absorption ratio < 85%"
          accent="red" icon="⚡" delay={320}
          trend="up"
        />
        <KPICard
          label="Critical Anomalies"
          value={data.critical_anomalies_count}
          sub="|z| > 3σ from peer mean"
          accent="red" icon="◈" delay={400}
          trend="up"
        />
        <KPICard
          label="High Lapse Risk Depts"
          value={data.high_lapse_risk_count}
          sub=">60% projected lapse"
          accent="amber" icon="◉" delay={480}
          trend="neutral"
        />
      </div>

      {/* Absorption + utilization stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Absorption ratio bar */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px 22px',
          animation: 'fadeUp 0.4s ease 560ms both',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 16 }}>
            FUND ABSORPTION PIPELINE
          </div>
          {[
            { label: 'Allocated → Released', value: data.total_released / data.total_allocated, color: 'var(--cyan)' },
            { label: 'Released → Absorbed', value: data.overall_absorption_pct / 100, color: 'var(--purple)' },
            { label: 'Allocated → Spent', value: data.total_spent / data.total_allocated, color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color }}>{(value * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(value * 100, 100)}%`,
                  background: color, borderRadius: 3,
                  boxShadow: `0 0 8px ${color}`,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Coverage stats */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px 22px',
          animation: 'fadeUp 0.4s ease 640ms both',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 16 }}>
            COVERAGE & EXPOSURE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'States', value: data.states_covered, color: 'var(--cyan)' },
              { label: 'Departments', value: data.departments_covered, color: 'var(--purple)' },
              { label: 'Absorption %', value: `${data.overall_absorption_pct.toFixed(1)}%`, color: 'var(--green)' },
              { label: 'Utilization %', value: `${data.overall_utilization_pct.toFixed(1)}%`, color: 'var(--amber)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                padding: '12px 14px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text-muted)', letterSpacing: '0.04em',
        borderTop: '1px solid var(--border)', paddingTop: 16,
      }}>
        ◈ Leakage detected where absorption ratio &lt; 0.85 · Anomalies via Z-score peer comparison · Lapse via linear trajectory projection
      </div>
    </div>
  )
}