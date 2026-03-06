'use client'
import { useEffect, useState } from 'react'
import { api, ReallocationRec, SimulateResult, SimulateBody } from '@/lib/api'

function fmtCr(n: number) { return `₹${(n / 1e7).toFixed(2)}Cr` }

function Input({ label, value, onChange, type = 'text' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--cyan)' }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)' }}
      />
    </div>
  )
}

export default function ReallocationPage() {
  const [recs, setRecs] = useState<ReallocationRec[]>([])
  const [loading, setLoading] = useState(true)
  const [simLoading, setSimLoading] = useState(false)
  const [result, setResult] = useState<SimulateResult | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState<SimulateBody>({
    from_state: 'Uttar Pradesh',
    from_district: 'Varanasi',
    from_department: 'Health',
    to_district: 'Pune',
    to_department: 'Water Supply',
    transfer_pct: 20,
    year: 2024,
    as_of_month: 8,
  })

  useEffect(() => {
    api.reallocationRecs(2024, 8)
      .then(setRecs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const applyRec = (rec: ReallocationRec) => {
    setForm(f => ({
      ...f,
      from_state: rec.from_state,
      from_district: rec.from_district,
      from_department: rec.from_department,
      to_district: rec.to_district,
      to_department: rec.to_department,
      transfer_pct: Math.round((rec.transfer_amount / 1e7) * 10) / 10,
    }))
    setResult(null)
  }

  const simulate = async () => {
    setSimLoading(true)
    setResult(null)
    try {
      const res = await api.simulate(form)
      setResult(res)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 6 }}>
          REALLOCATION ENGINE · WHAT-IF SIMULATION
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>
          Fund Reallocation Simulator
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Recommendations panel */}
        <div>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20,
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
              letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between',
            }}>
              <span>AI RECOMMENDATIONS · PRIORITY RANKED</span>
              <span style={{ color: 'var(--cyan)' }}>{recs.length} suggestions</span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24 }}>
                <div className="spinner" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Computing recommendations...</span>
              </div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {recs.map((rec, i) => (
                  <div
                    key={i}
                    onClick={() => applyRec(rec)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      animation: `fadeUp 0.3s ease ${i * 50}ms both`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* From → To */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--red)', padding: '3px 8px',
                        background: 'var(--red-dim)', borderRadius: 4,
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}>
                        {rec.from_department} · {rec.from_district}
                      </div>
                      <span style={{ color: 'var(--cyan)', fontSize: 14 }}>⇄</span>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--green)', padding: '3px 8px',
                        background: 'var(--green-dim)', borderRadius: 4,
                        border: '1px solid rgba(16,185,129,0.2)',
                      }}>
                        {rec.to_department} · {rec.to_district}
                      </div>
                      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: 'var(--cyan)', padding: '2px 7px',
                          background: 'var(--cyan-dim)', borderRadius: 3,
                        }}>
                          {fmtCr(rec.transfer_amount)}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--text-secondary)',
                      lineHeight: 1.4, marginBottom: 6,
                    }}>
                      {rec.rationale}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                        Lapse risk: <span style={{ color: 'var(--red)' }}>{rec.from_lapse_risk_pct.toFixed(1)}%</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                        Priority score: <span style={{ color: 'var(--amber)' }}>{rec.priority_score.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Simulation result */}
          {result && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(16,185,129,0.35)',
              borderRadius: 'var(--radius-lg)', padding: '18px 20px',
              animation: 'fadeUp 0.4s ease both',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', letterSpacing: '0.1em', marginBottom: 12 }}>
                ✓ SIMULATION RESULT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>TRANSFER AMOUNT</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--cyan)' }}>
                    {fmtCr(result.transfer_amount)}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>FROM NEW LAPSE RISK</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>
                    {result.from_new_lapse_risk_pct.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {result.impact_summary}
              </div>
            </div>
          )}
        </div>

        {/* Simulator form */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px 22px',
          position: 'sticky', top: 0,
          alignSelf: 'start',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 18 }}>
            SIMULATION PARAMETERS
          </div>

          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--red)',
            marginBottom: 14, padding: '6px 10px',
            background: 'var(--red-dim)', borderRadius: 'var(--radius)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            FROM (High Lapse Risk)
          </div>

          <Input label="FROM STATE" value={form.from_state} onChange={v => setForm(f => ({ ...f, from_state: v }))} />
          <Input label="FROM DISTRICT" value={form.from_district} onChange={v => setForm(f => ({ ...f, from_district: v }))} />
          <Input label="FROM DEPARTMENT" value={form.from_department} onChange={v => setForm(f => ({ ...f, from_department: v }))} />

          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)',
            margin: '16px 0 14px', padding: '6px 10px',
            background: 'var(--green-dim)', borderRadius: 'var(--radius)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            TO (Receiving Department)
          </div>

          <Input label="TO DISTRICT" value={form.to_district} onChange={v => setForm(f => ({ ...f, to_district: v }))} />
          <Input label="TO DEPARTMENT" value={form.to_department} onChange={v => setForm(f => ({ ...f, to_department: v }))} />

          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cyan)',
            margin: '16px 0 14px', padding: '6px 10px',
            background: 'var(--cyan-dim)', borderRadius: 'var(--radius)',
            border: '1px solid rgba(0,212,255,0.2)',
          }}>
            TRANSFER SETTINGS
          </div>

          <Input label="TRANSFER % OF SURPLUS" value={form.transfer_pct} type="number" onChange={v => setForm(f => ({ ...f, transfer_pct: +v }))} />

          {/* Slider */}
          <div style={{ marginBottom: 18 }}>
            <input
              type="range" min={5} max={50} step={5}
              value={form.transfer_pct}
              onChange={e => setForm(f => ({ ...f, transfer_pct: +e.target.value }))}
              style={{ width: '100%', accentColor: 'var(--cyan)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              <span>5%</span><span>50%</span>
            </div>
          </div>

          <button
            onClick={simulate}
            disabled={simLoading}
            style={{
              width: '100%', padding: '12px',
              background: simLoading ? 'var(--bg-secondary)' : 'var(--cyan-dim)',
              border: `1px solid ${simLoading ? 'var(--border)' : 'var(--cyan)'}`,
              borderRadius: 'var(--radius)',
              color: simLoading ? 'var(--text-muted)' : 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              cursor: simLoading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.08em',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {simLoading ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                SIMULATING...
              </>
            ) : '⇄ RUN SIMULATION'}
          </button>

          {error && (
            <div style={{ marginTop: 10, fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}