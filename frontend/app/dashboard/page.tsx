'use client'
import { useEffect, useState } from 'react'
import { api, SankeyData, LeakageEdge, FlowSummary } from '@/lib/api'
import SankeyFlow from '@/components/charts/SankeyFlow'
import LeakageEdgeCard from '@/components/cards/LeakageEdgeCard'

const STATES = ['All', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Karnataka', 'Bihar']

function fmtCr(n: number) { return `₹${(n / 1e7).toFixed(2)}Cr` }

export default function FlowPage() {
  const [selectedState, setSelectedState] = useState('All')
  const [sankey, setSankey] = useState<SankeyData | null>(null)
  const [edges, setEdges] = useState<LeakageEdge[]>([])
  const [summary, setSummary] = useState<FlowSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const state = selectedState === 'All' ? undefined : selectedState
    Promise.all([
      api.sankey(2024, state),
      api.leakageEdges(2024),
      api.flowSummary(2024),
    ])
      .then(([s, e, sum]) => { setSankey(s); setEdges(e); setSummary(sum) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedState])

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 6 }}>
            GRAPH ENGINE · NETWORKX
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>
            Fund Flow Map
          </h2>
        </div>

        {/* State filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {STATES.map(s => (
            <button key={s} onClick={() => setSelectedState(s)} style={{
              padding: '5px 12px',
              background: selectedState === s ? 'var(--cyan-dim)' : 'var(--bg-card)',
              border: `1px solid ${selectedState === s ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: 20,
              color: selectedState === s ? 'var(--cyan)' : 'var(--text-secondary)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      {summary && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginBottom: 20,
        }}>
          {[
            { label: 'Total Released', value: fmtCr(summary.total_released), color: 'var(--cyan)' },
            { label: 'Total Received', value: fmtCr(summary.total_received), color: 'var(--purple)' },
            { label: 'Avg Absorption', value: `${(summary.avg_absorption_ratio * 100).toFixed(1)}%`, color: 'var(--green)' },
            { label: 'Total Gap', value: fmtCr(summary.total_gap_amount), color: 'var(--red)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '14px 16px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sankey */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 22px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            CENTRE → STATE → DISTRICT → DEPARTMENT FUND FLOW
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { color: 'var(--cyan)', label: 'Normal flow' },
              { color: 'var(--red)', label: 'Leakage detected' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 16, height: 4, background: color, borderRadius: 2 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div className="spinner" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Building graph...</span>
          </div>
        ) : error ? (
          <div style={{ height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>⚠ {error}</span>
          </div>
        ) : sankey && sankey.nodes.length > 0 ? (
          <SankeyFlow data={sankey} />
        ) : (
          <div style={{ height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No flow data for selected state</span>
          </div>
        )}
      </div>

      {/* Leakage edges */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>
              DETECTED LEAKAGE EDGES
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {edges.length} edge{edges.length !== 1 ? 's' : ''} with absorption &lt; 85%
            </div>
          </div>
          <div style={{
            padding: '5px 12px',
            background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 6, fontSize: 12, color: 'var(--red)',
            fontFamily: 'var(--font-mono)',
          }}>
            ⚡ ALERT
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {edges.map((edge, i) => (
            <LeakageEdgeCard key={`${edge.from_entity}-${edge.to_entity}-${i}`} edge={edge} delay={i * 80} />
          ))}
          {edges.length === 0 && !loading && (
            <div style={{
              padding: 24, color: 'var(--green)',
              fontFamily: 'var(--font-mono)', fontSize: 12,
            }}>
              ✓ No leakage edges detected
            </div>
          )}
        </div>
      </div>
    </div>
  )
}