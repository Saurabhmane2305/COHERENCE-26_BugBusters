'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',    icon: '⬡', label: 'Overview' },
  { href: '/flow',         icon: '⟿', label: 'Fund Flow' },
  { href: '/anomalies',    icon: '◈', label: 'Anomalies' },
  { href: '/forecast',     icon: '◉', label: 'Forecast' },
  { href: '/reallocation', icon: '⇄', label: 'Reallocate' },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 24px',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 13,
          color: 'var(--cyan)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          BudgetFlow
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          marginTop: 2,
        }}>
          INTELLIGENCE PLATFORM
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px 12px' }}>
        {NAV.map(({ href, icon, label }) => {
          const active = path === href
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius)',
                background: active ? 'var(--cyan-dim)' : 'transparent',
                border: `1px solid ${active ? 'var(--cyan-glow)' : 'transparent'}`,
                color: active ? 'var(--cyan)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <span style={{ fontSize: 16, minWidth: 20, textAlign: 'center' }}>{icon}</span>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: active ? 500 : 400,
                  fontSize: 13,
                  letterSpacing: '0.02em',
                }}>
                  {label}
                </span>
                {active && (
                  <div style={{
                    marginLeft: 'auto',
                    width: 4, height: 4,
                    borderRadius: '50%',
                    background: 'var(--cyan)',
                  }} />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0 20px' }}>
        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>
            DATA SOURCE
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>FY 2024–25</div>
          <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            API Live
          </div>
        </div>
      </div>
    </aside>
  )
}