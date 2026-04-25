import React, { useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronRight, RotateCcw, Copy, Check, TrendingUp, Shield, Zap } from 'lucide-react';
import api from '../api';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

const RISK_PROFILES = [
  { value: 'conservative', label: 'Conservative', icon: '🛡️', desc: 'Capital preservation, low risk' },
  { value: 'moderate',     label: 'Moderate',     icon: '⚖️', desc: 'Balanced growth and safety' },
  { value: 'aggressive',   label: 'Aggressive',   icon: '🚀', desc: 'High growth, high risk' },
];

const HORIZONS = [
  { value: '1 month',    label: '1 Month' },
  { value: '3-6 months', label: '3–6 Months' },
  { value: '1 year',     label: '1 Year' },
  { value: '3-5 years',  label: '3–5 Years' },
  { value: '5-10 years', label: '5–10 Years' },
  { value: '10+ years',  label: '10+ Years' },
];

const TYPE_COLORS = {
  'Mutual Fund': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'ETF':         { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  'Stock':       { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Index Fund':  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

const HOW_TO_START = [
  { step: '1', icon: '📱', title: 'Open a Demat Account', desc: 'Sign up on Zerodha, Groww, or Upstox — free and takes 10 mins with Aadhaar + PAN.' },
  { step: '2', icon: '🔍', title: 'Search the Fund / Stock', desc: 'Use the search bar to find the exact fund name from the suggestions above. Verify ISIN if needed.' },
  { step: '3', icon: '📅', title: 'Start a SIP or Buy', desc: 'For mutual funds, set up a monthly SIP on the date of your choice. For stocks, place a market/limit order.' },
];

const formatCrore = (v) => {
  if (!v) return '—';
  if (v >= 1e7) return `₹${(v/1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v/1e5).toFixed(2)} L`;
  return `₹${Number(v).toLocaleString('en-IN')}`;
};

export default function Allocator() {
  const [amount,  setAmount]  = useState('');
  const [risk,    setRisk]    = useState('moderate');
  const [horizon, setHorizon] = useState('3-5 years');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);
  const resultRef = useRef(null);

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;

  const handleAnalyze = async () => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (!num || num < 1000) { setError('Please enter a valid amount (min ₹1,000)'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get('/ai/allocation', { params: { amount: num, risk, horizon } });
      setResult(res.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setError('Failed to generate allocation. Please check your GROQ API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const lines = [
      `StockSense AI Portfolio Plan`,
      `Amount: ${formatCrore(amountNum)} | Risk: ${risk} | Horizon: ${horizon}`,
      ``,
      `ALLOCATION:`,
      ...(result.allocations?.map(a => `  ${a.name}: ${a.percentage}% (${formatCrore((a.percentage/100)*amountNum)})`)) || [],
      ``,
      `TOP PICKS:`,
      ...(result.top_picks?.map(p => `  [${p.type}] ${p.name} — ${p.reason}`)) || [],
      ``,
      `AI ADVICE: ${result.key_advice || ''}`,
      ``,
      `⚠️ Educational purposes only. Not financial advice.`,
    ].join('\n');
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.05))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>💼</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#f0f6ff' }}>AI Portfolio Allocator</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#8899b4' }}>Get a personalized asset allocation plan based on your budget, risk profile & goals</p>
          </div>
        </div>
      </div>

      {/* Input Panel */}
      <div className="glass-panel">
        <h3 style={{ margin: '0 0 18px 0', fontSize: '0.95rem' }}>🎯 Configure Your Investment Plan</h3>

        {/* Amount */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment Amount (₹)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8899b4', fontWeight: '700', fontSize: '1rem' }}>₹</span>
            <input type="text" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="e.g. 100000"
              style={{ paddingLeft: '30px', fontSize: '1.1rem', fontWeight: '700' }} />
          </div>
          {amountNum > 0 && <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#8b5cf6' }}>= {formatCrore(amountNum)}</div>}
        </div>

        {/* Risk Profile */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Profile</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {RISK_PROFILES.map(r => (
              <button key={r.value} type="button" onClick={() => setRisk(r.value)}
                style={{ padding: '14px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: `2px solid ${risk === r.value ? '#8b5cf6' : 'var(--border-color)'}`, background: risk === r.value ? 'rgba(139,92,246,0.12)' : 'rgba(0,0,0,0.2)', transition: 'all 0.15s' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{r.icon}</div>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: risk === r.value ? '#a78bfa' : '#f0f6ff', marginBottom: '2px' }}>{r.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Horizon */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment Horizon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {HORIZONS.map(h => (
              <button key={h.value} type="button" onClick={() => setHorizon(h.value)}
                style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', border: `1px solid ${horizon === h.value ? '#8b5cf6' : 'var(--border-color)'}`, background: horizon === h.value ? 'rgba(139,92,246,0.15)' : 'transparent', color: horizon === h.value ? '#a78bfa' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '14px' }}>{error}</div>}

        <button onClick={handleAnalyze} disabled={loading}
          style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {loading ? <><div className="spinner" style={{ width: '16px', height: '16px' }} /> Generating Plan...</> : '🎯 Generate My Allocation Plan'}
        </button>
      </div>

      {/* ── RESULTS ── */}
      {result && (
        <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">

          {/* Pie + Bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', alignSelf: 'flex-start' }}>📊 Allocation Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={result.allocations} dataKey="percentage" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} strokeWidth={2} stroke="rgba(0,0,0,0.4)">
                    {result.allocations?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val}%`, name]} contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-panel">
              <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem' }}>💰 Where to Invest</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.allocations?.map((item, i) => {
                  const rupeeAmt = (item.percentage / 100) * amountNum;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>{item.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.88rem', color: COLORS[i % COLORS.length] }}>{item.percentage}%</span>
                          {amountNum > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>{formatCrore(rupeeAmt)}</span>}
                        </div>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${item.percentage}%`, background: COLORS[i % COLORS.length], borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Details */}
          <div className="glass-panel">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>🔍 Category Details & Suggested Instruments</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {result.allocations?.map((item, i) => (
                <div key={i} style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: `1px solid ${COLORS[i % COLORS.length]}22` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: COLORS[i % COLORS.length] }}>{item.name} — {item.percentage}%</span>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.rationale}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(Array.isArray(item.examples)
                      ? item.examples
                      : String(item.examples || '').split(',').map(s => s.trim()).filter(Boolean)
                    ).map((ex, j) => (
                      <span key={j} style={{ fontSize: '0.68rem', padding: '2px 8px', background: `${COLORS[i % COLORS.length]}18`, color: COLORS[i % COLORS.length], borderRadius: '4px', fontWeight: '600', fontFamily: 'monospace' }}>{ex}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── TOP PICKS ── */}
          {result.top_picks?.length > 0 && (
            <div className="glass-panel">
              <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem' }}>⭐ AI Top Picks for You</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {result.top_picks.map((pick, i) => {
                  const typeStyle = TYPE_COLORS[pick.type] || { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' };
                  return (
                    <div key={i} style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: typeStyle.bg, color: typeStyle.color, fontWeight: '700', width: 'fit-content' }}>{pick.type}</span>
                      <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f0f6ff', lineHeight: '1.3' }}>{pick.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8899b4', lineHeight: '1.5' }}>{pick.reason}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#64748b' }}>
                💡 These are AI-suggested starting points — not buy recommendations. Always verify before investing.
              </div>
            </div>
          )}

          {/* AI Rationale */}
          <div className="glass-panel">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>🤖 AI Rationale & Key Advice</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.75', background: 'rgba(139,92,246,0.06)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)' }}>
              {result.summary}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.isArray(result.key_advice)
                ? result.key_advice.map((adv, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.84rem', color: 'var(--text-main)' }}>
                      <ChevronRight size={15} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '1px' }} />
                      {adv}
                    </div>
                  ))
                : result.key_advice && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.84rem', color: 'var(--text-main)' }}>
                      <ChevronRight size={15} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '1px' }} />
                      {result.key_advice}
                    </div>
                  )
              }
            </div>
            <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', fontSize: '0.75rem', color: '#92400e' }}>
              ⚠️ <strong>Disclaimer:</strong> This is AI-generated guidance for educational purposes only. Consult a SEBI-registered advisor before investing.
            </div>
          </div>

          {/* ── HOW TO START ── */}
          <div className="glass-panel">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>🚀 How to Get Started</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {HOW_TO_START.map((s, i) => (
                <div key={i} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', left: '14px', width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800', color: 'white' }}>{s.step}</div>
                  <div style={{ fontSize: '1.4rem', marginBottom: '8px', marginTop: '6px' }}>{s.icon}</div>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f0f6ff', marginBottom: '5px' }}>{s.title}</div>
                  <div style={{ fontSize: '0.76rem', color: '#8899b4', lineHeight: '1.55' }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', fontSize: '0.78rem', color: '#8899b4' }}>
              🏦 <strong style={{ color: '#10b981' }}>Recommended platforms:</strong> Zerodha (stocks + MF), Groww (beginner-friendly MF), Kuvera (free MF), Upstox (low-cost trading)
            </div>
          </div>

          {/* ── COPY + RECALCULATE ── */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={handleCopy}
              style={{ padding: '9px 20px', background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}`, borderRadius: '8px', color: copied ? '#10b981' : 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Plan</>}
            </button>
            <button onClick={() => setResult(null)}
              style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={13} /> Recalculate
            </button>
          </div>

        </div>
      )}
    </div>
  );
}