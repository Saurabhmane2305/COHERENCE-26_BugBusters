'use client'
import { usePathname } from 'next/navigation'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':    { title: 'National Overview',      subtitle: 'Budget health & KPI summary' },
  '/flow':         { title: 'Fund Flow Analysis',     subtitle: 'Sankey graph + leakage detection' },
  '/anomalies':    { title: 'Anomaly Detection',      subtitle: 'Z-score peer comparison engine' },
  '/forecast':     { title: 'Lapse Forecasting',      subtitle: 'Linear trajectory projection' },
  '/reallocation': { title: 'Fund Reallocation',      subtitle: 'Simulate budget transfers' },
}

export default function TopBar() {
  const path = usePathname()
  const meta = PAGE_META[path] ?? { title: 'BudgetFlow', subtitle: '' }

  const now = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <header style={{
      height: 60,
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 20,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>
          {meta.title}
        </h1>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
          marginTop: 1,
        }}>
          {meta.subtitle.toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-secondary)',
        }}>
          {now}
        </div>
        <div style={{
          padding: '4px 10px',
          background: 'var(--green-dim)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 20,
          fontSize: 11,
          color: 'var(--green)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--green)',
            animation: 'pulse-cyan 2s infinite',
          }} />
          LIVE
        </div>
        <div style={{
          padding: '4px 12px',
          background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-glow)',
          borderRadius: 'var(--radius)',
          fontSize: 11,
          color: 'var(--cyan)',
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
        }}>
          FY 2024
        </div>
      </div>
    </header>
  )
}