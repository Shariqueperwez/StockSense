import React, { useState, useEffect, useCallback, useRef } from 'react';
import NSE_STOCKS from '../data/nseStocks';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, TrendingUp, TrendingDown, RefreshCw, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Clock, Wallet } from 'lucide-react';
import api from '../api';

const COLORS = ['#10b981','#3b82f6','#f59e0b','#f43f5e','#a78bfa','#06b6d4','#f97316','#22c55e'];
const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

// ── Fix 1: Properly extract error message from API response ──────────────────
// Old code: err.response?.data?.detail could be an object → showed "[object Object]"
// New code: handles string, Pydantic array, and plain object shapes correctly
function extractErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail[0]?.msg || 'Validation error.';
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
  return String(detail);
}

function StatCard({ icon, label, value, sub, color, glow }) {
  return (
    <div className="glass-panel" style={{ padding: '18px 20px', borderTop: `3px solid ${color || '#10b981'}`, boxShadow: glow ? `0 0 30px ${color}22` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ color: color || '#10b981' }}>{icon}</div>
        <span style={{ fontSize: '0.75rem', color: '#8899b4', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.5px', color: color || '#f0f6ff' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.74rem', color: '#8899b4', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function calcRecovery(lossPct, annualReturn = 0.12) {
  if (lossPct <= 0) return 0;
  const drop = Math.min(Math.abs(lossPct), 99.9);
  const monthly = annualReturn / 12;
  try {
    const months = Math.ceil(Math.log(1 / (1 - drop / 100)) / Math.log(1 + monthly));
    return Math.min(months, 999);
  } catch { return 999; }
}

function recLabel(months) {
  if (months === 0) return null;
  if (months >= 999) return '> 50 yrs';
  if (months >= 24) return `~${Math.ceil(months / 12)} yrs`;
  return `~${months} mo`;
}

const GRADE_CONFIG = {
  A: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', label: 'Excellent' },
  B: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)',  label: 'Good' },
  C: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  label: 'Average' },
  D: { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.3)',   label: 'Risky' },
};

const RISK_COLOR = { Low: '#10b981', Medium: '#f59e0b', High: '#f97316', 'Very High': '#f43f5e' };

function computeMetricGrades(beta, conc, numStocks) {
  const betaGrade   = beta < 0.8  ? 'A' : beta < 1.3  ? 'B' : beta < 1.8  ? 'C' : 'D';
  const concGrade   = conc < 25   ? 'A' : conc < 35   ? 'B' : conc < 50   ? 'C' : 'D';
  const stocksGrade = numStocks >= 8 ? 'A' : numStocks >= 5 ? 'B' : numStocks >= 3 ? 'C' : 'D';
  const order = { A: 0, B: 1, C: 2, D: 3 };
  const worstGrade  = [betaGrade, concGrade, stocksGrade].reduce((w, g) => order[g] > order[w] ? g : w, 'A');
  return { betaGrade, concGrade, stocksGrade, worstGrade };
}

function StressTestPanel({ simResult, loading, portfolio, totalCurrent, onRun, onReset }) {
  const [customDrop, setCustomDrop] = useState(20);
  const [customReturn, setCustomReturn] = useState(12);

  const beta = simResult?.beta || 1;
  const portfolioValue = totalCurrent || simResult?.total_value || 0;
  const custActualDrop = customDrop * beta;
  const custLossAmt    = (custActualDrop / 100) * portfolioValue;
  const custRecovery   = calcRecovery(custActualDrop, customReturn / 100);
  const custValueAfter = portfolioValue - Math.abs(custLossAmt);

  if (!simResult) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem' }}>🛡️</div>
        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#f0f6ff', marginBottom: '8px' }}>Portfolio Stress Test</div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '28px', lineHeight: '1.7', maxWidth: '340px', margin: '0 auto 28px' }}>
          See exactly how much you'd lose in market crashes — and how long it'd take to recover your money.
        </div>
        <button onClick={onRun} disabled={loading || portfolio.length === 0}
          style={{ background: portfolio.length === 0 ? '#1e293b' : 'linear-gradient(135deg, #10b981, #059669)', padding: '12px 36px', fontWeight: '700', border: 'none', borderRadius: '12px', color: portfolio.length === 0 ? '#475569' : 'white', cursor: portfolio.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.9rem', boxShadow: portfolio.length === 0 ? 'none' : '0 4px 20px rgba(16,185,129,0.3)' }}>
          {loading ? '⏳ Analysing portfolio...' : '🛡️ Run Stress Test'}
        </button>
        {portfolio.length === 0 && <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#475569' }}>Add stocks to your portfolio first</div>}
      </div>
    );
  }

  const grade = GRADE_CONFIG[simResult.grade] || GRADE_CONFIG['C'];
  const conc = simResult.max_concentration || 0;
  const numStocks = simResult.num_stocks || 0;

  const betaStatus = beta < 0.7 ? { label: 'Defensive', color: '#10b981', icon: '🛡️' }
    : beta < 1.0 ? { label: 'Stable', color: '#3b82f6', icon: '⚖️' }
    : beta < 1.3 ? { label: 'Market-like', color: '#f59e0b', icon: '📊' }
    : beta < 1.6 ? { label: 'Aggressive', color: '#f97316', icon: '⚡' }
    : { label: 'Very High Risk', color: '#f43f5e', icon: '🔥' };

  const betaAdvice = beta < 0.7 ? 'Your portfolio moves much less than the market. Great for capital preservation but may lag in bull runs.'
    : beta < 1.0 ? 'Solid balance — your portfolio is steadier than Nifty. Good for long-term wealth building.'
    : beta < 1.3 ? 'Your portfolio tracks the market closely. Returns will mirror Nifty ups and downs.'
    : beta < 1.6 ? 'Your portfolio amplifies market moves. Big gains in bull runs, bigger losses in crashes. Consider adding defensive stocks.'
    : 'Very high volatility. A 10% Nifty fall could drop your portfolio by ' + (beta * 10).toFixed(0) + '%. Diversify urgently.';

  const concStatus = conc > 60 ? { label: 'Highly Concentrated', color: '#f43f5e', icon: '⚠️' }
    : conc > 40 ? { label: 'Concentrated', color: '#f97316', icon: '⚠️' }
    : conc > 25 ? { label: 'Moderate', color: '#f59e0b', icon: '📌' }
    : { label: 'Well Diversified', color: '#10b981', icon: '✅' };

  const concAdvice = conc > 60
    ? `Your top holding is ${conc}% of your portfolio. If that stock falls 30%, you lose ${(conc * 0.3).toFixed(0)}% of your total value. Reduce it below 25%.`
    : conc > 40 ? `${conc}% in one stock is risky. Aim to spread across 8–12 stocks.`
    : conc > 25 ? `${conc}% is acceptable but consider spreading more. No stock should exceed 20–25%.`
    : `Great job! Your top holding is just ${conc}% — well spread across ${numStocks} stocks.`;

  const diversityStatus = numStocks < 3 ? { label: 'Too Few Stocks', color: '#f43f5e' }
    : numStocks < 6 ? { label: 'Building Up', color: '#f59e0b' }
    : numStocks < 10 ? { label: 'Good Mix', color: '#3b82f6' }
    : { label: 'Well Diversified', color: '#10b981' };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {(() => {
        const { betaGrade, concGrade, stocksGrade } = computeMetricGrades(beta, conc, numStocks);
        const mgColor = g => GRADE_CONFIG[g]?.color || '#f59e0b';
        const metricChip = (label, val, g) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: `${mgColor(g)}12`, border: `1px solid ${mgColor(g)}30` }}>
            <span style={{ fontSize: '0.65rem', color: '#8899b4' }}>{label}</span>
            <span style={{ fontSize: '0.65rem', color: '#8899b4' }}>{val}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: mgColor(g) }}>({g})</span>
          </div>
        );
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '12px', alignItems: 'stretch' }}>
            <div style={{ background: grade.bg, border: `2px solid ${grade.border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 6px', gap: '3px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: grade.color, lineHeight: 1 }}>{simResult.grade}</div>
              <div style={{ fontSize: '0.55rem', color: grade.color, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>{grade.label}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#d0daea' }}>
                {simResult.grade === 'A' ? '🏆 Excellent portfolio health — low risk, well diversified'
                  : simResult.grade === 'B' ? '👍 Good portfolio — minor improvements can boost your score'
                  : simResult.grade === 'C' ? '📋 Average portfolio — see metric breakdown below'
                  : '⚠️ High-risk portfolio — take action to protect your wealth'}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {metricChip('Beta', beta.toFixed(2), betaGrade)}
                {metricChip('Concentration', `${conc}%`, concGrade)}
                {metricChip('Holdings', `${numStocks} stocks`, stocksGrade)}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: `${RISK_COLOR[simResult.risk_score] || '#f59e0b'}12`, border: `1px solid ${RISK_COLOR[simResult.risk_score] || '#f59e0b'}30` }}>
                  <span style={{ fontSize: '0.65rem', color: '#8899b4' }}>Risk</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: RISK_COLOR[simResult.risk_score] || '#f59e0b' }}>{simResult.risk_score}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
        {[
          { g: 'A', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', points: ['Beta < 0.8', 'No stock > 25%', '8+ stocks'] },
          { g: 'B', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', points: ['Beta 0.8–1.3', 'No stock > 35%', '5–7 stocks'] },
          { g: 'C', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', points: ['Beta 1.3–1.8', 'Top stock 35–50%', '3–5 stocks'] },
          { g: 'D', color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)', points: ['Beta > 1.8', 'Top stock > 50%', '< 3 stocks'] },
        ].map(r => (
          <div key={r.g} style={{ background: r.g === simResult.grade ? r.bg : 'rgba(0,0,0,0.2)', border: `1px solid ${r.g === simResult.grade ? r.border : 'rgba(255,255,255,0.04)'}`, borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: r.color, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {r.g} {r.g === simResult.grade && <span style={{ fontSize: '0.55rem', background: r.color, color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>YOU</span>}
            </div>
            {r.points.map((p, i) => (
              <div key={i} style={{ fontSize: '0.65rem', color: r.g === simResult.grade ? '#8899b4' : '#334155', marginBottom: '2px' }}>
                <span style={{ color: r.g === simResult.grade ? r.color : '#1e293b', fontSize: '0.55rem' }}>▸</span> {p}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { status: betaStatus, title: 'Portfolio Beta', ideal: 'Ideal range: 0.7 – 1.2 for most long-term investors', advice: betaAdvice, value: beta.toFixed(2), sub: 'vs Nifty = 1.0' },
          { status: concStatus, title: 'Concentration Risk', ideal: 'Ideal: No single stock > 20–25% · Hold 8–15 stocks', advice: concAdvice, value: `${conc}%`, sub: 'top holding' },
          { status: diversityStatus, title: 'Number of Holdings', ideal: 'Ideal: 8–15 stocks across 4+ sectors', advice: numStocks < 6 ? 'Add more stocks across different sectors to reduce single-stock risk.' : `${numStocks} stocks is a solid mix. Keep diversifying across sectors.`, value: `${numStocks}`, sub: 'stocks held' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.28)', border: `1px solid ${card.status.color}18`, borderRadius: '14px', padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>{card.title}</span>
                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.62rem', fontWeight: '700', background: `${card.status.color}15`, color: card.status.color, border: `1px solid ${card.status.color}30` }}>{card.status.label}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8899b4', lineHeight: '1.6' }}>{card.advice}</div>
              <div style={{ fontSize: '0.68rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#10b981' }}>💡</span> {card.ideal}
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: '72px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: card.status.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: '0.6rem', color: '#334155', marginTop: '4px' }}>{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontSize: '0.65rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>MARKET SCENARIOS</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {simResult.scenarios?.map((sc, i) => {
          const isGain = sc.impact_value >= 0;
          const dropPct = Math.abs(sc.impact_percent);
          const recText = recLabel(!isGain ? calcRecovery(dropPct) : 0);
          const accentColor = isGain ? '#10b981' : '#f43f5e';
          return (
            <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${isGain ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)'}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#d0daea' }}><span>{sc.emoji}</span> {sc.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '2px' }}>Nifty {sc.market_move > 0 ? '+' : ''}{sc.market_move}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '900', color: accentColor }}>
                    {isGain ? '+' : ''}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sc.impact_value)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: accentColor, fontWeight: '700' }}>{sc.impact_percent > 0 ? '+' : ''}{sc.impact_percent?.toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, dropPct * 3)}%`, background: accentColor, borderRadius: '2px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#334155', textTransform: 'uppercase', marginBottom: '3px' }}>VALUE AFTER</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#94a3b8' }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sc.value_after)}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#334155', textTransform: 'uppercase', marginBottom: '3px' }}>{isGain ? 'OPPORTUNITY' : 'RECOVERY'}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: isGain ? '#10b981' : '#a78bfa' }}>{isGain ? 'Book profits ✓' : recText ? `⏱ ${recText}` : '—'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontSize: '0.65rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>CUSTOM CALCULATOR</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.06), rgba(59,130,246,0.04))', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>If Nifty Falls By</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="number" value={customDrop} min={1} max={90} onChange={e => setCustomDrop(Math.min(90, Math.max(1, Number(e.target.value))))}
                  style={{ width: '52px', padding: '4px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', color: '#f43f5e', fontSize: '0.9rem', fontWeight: '800', textAlign: 'center' }} />
                <span style={{ color: '#f43f5e', fontWeight: '800' }}>%</span>
              </div>
            </div>
            <input type="range" min={1} max={90} value={customDrop} onChange={e => setCustomDrop(Number(e.target.value))} style={{ width: '100%', accentColor: '#f43f5e' }} />
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[5, 10, 20, 35, 50].map(v => (
                <button key={v} onClick={() => setCustomDrop(v)} style={{ padding: '3px 9px', borderRadius: '5px', border: `1px solid ${customDrop === v ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.07)'}`, background: customDrop === v ? 'rgba(244,63,94,0.1)' : 'rgba(0,0,0,0.3)', color: customDrop === v ? '#f43f5e' : '#475569', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer' }}>-{v}%</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Annual Return Rate</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="number" value={customReturn} min={1} max={30} onChange={e => setCustomReturn(Math.min(30, Math.max(1, Number(e.target.value))))}
                  style={{ width: '52px', padding: '4px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', color: '#10b981', fontSize: '0.9rem', fontWeight: '800', textAlign: 'center' }} />
                <span style={{ color: '#10b981', fontWeight: '800' }}>%</span>
              </div>
            </div>
            <input type="range" min={1} max={30} value={customReturn} onChange={e => setCustomReturn(Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
              {[8, 12, 15, 20].map(v => (
                <button key={v} onClick={() => setCustomReturn(v)} style={{ padding: '3px 9px', borderRadius: '5px', border: `1px solid ${customReturn === v ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.07)'}`, background: customReturn === v ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.3)', color: customReturn === v ? '#10b981' : '#475569', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer' }}>{v}%</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px' }}>
          {[
            { label: 'Your Portfolio Drop', value: `${custActualDrop.toFixed(1)}%`, sub: `Beta ${beta.toFixed(2)} × ${customDrop}%`, color: '#f43f5e' },
            { label: 'Money Lost', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(custLossAmt)), sub: `From ₹${(portfolioValue/1e5).toFixed(1)}L portfolio`, color: '#f97316' },
            { label: 'Value After Crash', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.max(0, custValueAfter)), sub: 'If you stay invested', color: '#94a3b8' },
            { label: 'Time to Recover', value: recLabel(custRecovery) || '—', sub: `At ${customReturn}% annual return`, color: '#a78bfa' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontSize: '0.6rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: '#334155', marginTop: '4px' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onReset} style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center' }}>
        ↩ Run Test Again
      </button>
    </div>
  );
}

export default function InvestorPortfolio() {
  const [portfolio, setPortfolio]       = useState([]);
  const [livePortfolio, setLivePf]      = useState([]);
  const [user, setUser]                 = useState(null);
  const [transactions, setTxns]         = useState([]);
  const [simResult, setSimResult]       = useState(null);
  const [symbol, setSymbol]             = useState('');
  const [quoteData, setQuoteData]       = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [symbolSugg, setSymbolSugg]     = useState([]);
  const [showSugg, setShowSugg]         = useState(false);
  const symbolRef                       = useRef(null);
  const [quantity, setQuantity]         = useState(1);
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [tradeMsg, setTradeMsg]         = useState(null);
  const [activeTab, setActiveTab]       = useState('holdings');

  const fetchData = useCallback(async () => {
    try {
      const [userRes, portRes, txRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/portfolio/'),
        api.get('/portfolio/transactions').catch(() => ({ data: [] })),
      ]);
      setUser(userRes.data);
      setPortfolio(portRes.data);
      setTxns(txRes.data || []);
      if (portRes.data.length > 0) {
        const enriched = await Promise.all(portRes.data.map(async (item) => {
          try {
            const sym = item.symbol.includes('.') ? item.symbol : `${item.symbol}.NS`;
            const q = await api.get(`/market/quote/${sym}`);
            const livePrice = q.data?.price || item.average_price;
            const invested = item.quantity * item.average_price;
            const current  = item.quantity * livePrice;
            const pnl      = current - invested;
            const pnlPct   = invested > 0 ? (pnl / invested) * 100 : 0;
            return { ...item, livePrice, invested, current, pnl, pnlPct };
          } catch {
            const invested = item.quantity * item.average_price;
            return { ...item, livePrice: item.average_price, invested, current: invested, pnl: 0, pnlPct: 0 };
          }
        }));
        setLivePf(enriched);
      } else { setLivePf([]); }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const h = (e) => { if (symbolRef.current && !symbolRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const refresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // ── Fix 2: fetchQuote called on suggestion click + blur ──────────────────
  const fetchQuote = async (sym) => {
    if (!sym) { setQuoteData(null); return; }
    setQuoteLoading(true);
    setQuoteData(null);
    try {
      const searchSym = sym.includes('.') ? sym : `${sym}.NS`;
      const res = await api.get(`/market/quote/${searchSym.toUpperCase()}`);
      setQuoteData(res.data);
    } catch { setQuoteData(null); }
    finally { setQuoteLoading(false); }
  };

  const handleTrade = async (type) => {
    if (!symbol || quantity <= 0) {
      setTradeMsg({ type: 'error', text: '❌ Please enter a valid symbol and quantity.' });
      return;
    }
    setLoading(true);
    setTradeMsg(null);
    try {
      const searchSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
      // ── Fix: send as JSON body instead of query params ───────────────────
      await api.post(`/portfolio/${type.toLowerCase()}`, {
        symbol: searchSymbol.toUpperCase(),
        quantity: quantity,
      });
      setTradeMsg({ type: 'success', text: `✅ ${type} ${quantity} × ${symbol.toUpperCase()} added to your investment portfolio!` });
      setSymbol('');
      setQuantity(1);
      setQuoteData(null);
      await fetchData();
    } catch (err) {
      // ── Fix 1: Properly extract error detail ─────────────────────────────
      setTradeMsg({ type: 'error', text: `❌ ${extractErrorMessage(err)}` });
    } finally { setLoading(false); }
  };

  const runStressTest = async () => {
    if (portfolio.length === 0) { setTradeMsg({ type: 'error', text: '❌ Portfolio is empty. Add stocks first.' }); return; }
    setLoading(true);
    try { const res = await api.get('/portfolio/stress-test'); setSimResult(res.data); setActiveTab('stress'); }
    catch (err) { setTradeMsg({ type: 'error', text: `❌ ${extractErrorMessage(err)}` }); }
    finally { setLoading(false); }
  };

  const totalInvested = livePortfolio.reduce((s, i) => s + (i.invested || 0), 0);
  const totalCurrent  = livePortfolio.reduce((s, i) => s + (i.current  || 0), 0);
  const totalPnL      = totalCurrent - totalInvested;
  const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const totalNetworth = (user?.balance || 0) + totalCurrent;
  const chartData     = livePortfolio.map((p, i) => ({ name: p.symbol.replace('.NS','').replace('.BO',''), value: parseFloat((p.current || 0).toFixed(2)), color: COLORS[i % COLORS.length] }));
  const pnlColor      = totalPnL >= 0 ? '#10b981' : '#f43f5e';
  const isPositive    = totalPnL >= 0;
  const tabs          = [{ id: 'holdings', label: '📊 Holdings' }, { id: 'transactions', label: '🔄 Transactions' }, { id: 'stress', label: '🛡️ Stress Test' }];

  // ── Fix 3: All form elements share the same height constant ─────────────
  const ROW_H = '48px';
  const inputBase = { height: ROW_H, padding: '0 16px', boxSizing: 'border-box', width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f0f6ff', outline: 'none', fontSize: '0.95rem' };
  const mkBtn = (bg, shadow) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: ROW_H, padding: '0 20px', background: bg, border: 'none', borderRadius: '10px', color: 'white', fontWeight: '800', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: shadow, opacity: loading ? 0.6 : 1, letterSpacing: '0.03em', transition: 'all 0.15s', whiteSpace: 'nowrap' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.15)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>💼 Investment Portfolio</h2>
          <div style={{ fontSize: '0.8rem', color: '#8899b4', marginTop: '3px' }}>Build your practice long-term portfolio — track holdings, diversification & stress test your investments</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ padding: '5px 12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>💼 Investor Mode</div>
          <button onClick={refresh} disabled={refreshing} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', fontSize: '0.84rem' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <StatCard icon={<Wallet size={18} />} label="Available Cash" value={fmtINR(user?.balance)} sub="Virtual funds remaining" color="#10b981" />
        <StatCard icon={<Activity size={18} />} label="Invested Value" value={fmtINR(totalInvested)} sub={`${livePortfolio.length} holding(s)`} color="#a78bfa" />
        <StatCard icon={isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />} label="Unrealised P&L" value={fmtINR(totalPnL)} sub={`${fmtPct(totalPnLPct)} vs invested`} color={pnlColor} glow />
        <StatCard icon={<DollarSign size={18} />} label="Total Networth" value={fmtINR(totalNetworth)} sub="Cash + holdings" color="#3b82f6" />
      </div>

      {tradeMsg && (
        <div style={{ padding: '12px 18px', borderRadius: '10px', fontSize: '0.87rem', fontWeight: '500', background: tradeMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: tradeMsg.type === 'success' ? '#10b981' : '#f43f5e', border: `1px solid ${tradeMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}` }}>
          {tradeMsg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'stretch' }}>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '14px', background: activeTab === t.id ? 'rgba(16,185,129,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === t.id ? '2px solid #10b981' : '2px solid transparent', color: activeTab === t.id ? '#f0f6ff' : '#8899b4', fontSize: '0.84rem', fontWeight: activeTab === t.id ? '600' : '500', cursor: 'pointer', borderRadius: 0 }}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'holdings' && (
            livePortfolio.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8899b4' }}>
                <Activity size={36} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <div style={{ fontWeight: '600', marginBottom: '6px' }}>No holdings yet</div>
                <div style={{ fontSize: '0.82rem' }}>Add stocks using the investment terminal to build your portfolio</div>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Symbol</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Avg Price</th><th style={{ textAlign: 'right' }}>Live Price</th><th style={{ textAlign: 'right' }}>Invested</th><th style={{ textAlign: 'right' }}>Current</th><th style={{ textAlign: 'right' }}>P&L</th></tr></thead>
                <tbody>
                  {livePortfolio.map((p, i) => {
                    const pos = p.pnl >= 0;
                    return (
                      <tr key={i}>
                        <td><div style={{ fontWeight: '700', fontFamily: 'monospace' }}>{p.symbol.replace('.NS','').replace('.BO','')}</div></td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{p.quantity}</td>
                        <td style={{ textAlign: 'right', color: '#8899b4', fontSize: '0.84rem' }}>₹{Number(p.average_price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{Number(p.livePrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right', color: '#8899b4', fontSize: '0.84rem' }}>{fmtINR(p.invested)}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmtINR(p.current)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '700', color: pos ? '#10b981' : '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                            {pos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{fmtINR(p.pnl)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: pos ? '#10b981' : '#f43f5e' }}>{fmtPct(p.pnlPct)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td colSpan={4} style={{ padding: '12px 14px', fontWeight: '700', fontSize: '0.85rem', color: '#8899b4' }}>TOTAL</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{fmtINR(totalInvested)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{fmtINR(totalCurrent)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: pnlColor }}>{fmtINR(totalPnL)}</div>
                      <div style={{ fontSize: '0.72rem', color: pnlColor }}>{fmtPct(totalPnLPct)}</div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )
          )}

          {activeTab === 'transactions' && (
            transactions.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8899b4' }}>
                <Clock size={36} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <div style={{ fontWeight: '600' }}>No transactions yet</div>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Symbol</th><th>Type</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th><th>Date</th></tr></thead>
                <tbody>
                  {[...transactions].reverse().slice(0, 30).map((tx, i) => {
                    const isBuy = tx.type === 'BUY';
                    return (
                      <tr key={i}>
                        <td><span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{tx.symbol?.replace('.NS','')}</span></td>
                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: '700', background: isBuy ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)', color: isBuy ? '#10b981' : '#f43f5e' }}>{isBuy ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {tx.type}</span></td>
                        <td style={{ textAlign: 'right' }}>{tx.quantity}</td>
                        <td style={{ textAlign: 'right', color: '#8899b4', fontSize: '0.84rem' }}>₹{Number(tx.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmtINR(tx.price * tx.quantity)}</td>
                        <td style={{ color: '#8899b4', fontSize: '0.78rem' }}>{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'stress' && <StressTestPanel simResult={simResult} loading={loading} portfolio={portfolio} totalCurrent={totalCurrent} beta={simResult?.beta} onRun={runStressTest} onReset={() => setSimResult(null)} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '16px' }}>📊 Allocation</h3>
            {chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '0.82rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {chartData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color }} />
                        <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{d.name}</span>
                      </div>
                      <span style={{ color: '#8899b4' }}>{totalCurrent > 0 ? ((d.value / totalCurrent) * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8899b4', fontSize: '0.82rem', flexDirection: 'column', gap: '8px' }}>
                <Activity size={28} style={{ opacity: 0.3 }} />No holdings to display
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add to Portfolio ── */}
      <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '16px', padding: '24px 28px', borderTop: '3px solid #10b981' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16,185,129,0.12)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}><ArrowUpRight size={18} color="#10b981"/></div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#f0f6ff' }}>Add to Portfolio</h3>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Buy or sell any NSE/BSE stock at live market price</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '4px 12px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}/>Live Prices
          </div>
        </div>

        {/* Fix 3: alignItems:'end' ensures all columns bottom-align, and all items use ROW_H */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 160px 110px 1fr 1fr', gap: '14px', alignItems: 'end' }}>

          {/* Symbol */}
          <div>
            <div style={{ fontSize: '0.68rem', color: '#8899b4', marginBottom: '7px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NSE Symbol</div>
            <div style={{ position: 'relative' }} ref={symbolRef}>
              <input type="text" placeholder="e.g. TCS, RELIANCE" value={symbol}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  setSymbol(val);
                  if (val.length > 0) {
                    const filtered = NSE_STOCKS.filter(s => s.symbol.toLowerCase().startsWith(val.toLowerCase()) || s.name.toLowerCase().includes(val.toLowerCase())).slice(0, 7);
                    setSymbolSugg(filtered); setShowSugg(true);
                  } else { setSymbolSugg([]); setShowSugg(false); setQuoteData(null); }
                }}
                onFocus={() => { if (symbol.length > 0) setShowSugg(true); }}
                onBlur={() => { if (symbol.length >= 1) fetchQuote(symbol); }}
                style={inputBase} />
              {showSugg && symbolSugg.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f1623', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', zIndex: 200, boxShadow: '0 16px 40px rgba(0,0,0,0.7)', overflow: 'hidden', marginTop: '4px' }}>
                  {symbolSugg.map((s, i) => (
                    <div key={i}
                      onMouseDown={() => {
                        setSymbol(s.symbol);
                        setShowSugg(false);
                        // Fix 2: trigger price fetch immediately on suggestion click
                        fetchQuote(s.symbol);
                      }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < symbolSugg.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '0.88rem', color: '#10b981' }}>{s.symbol}</span>
                      <span style={{ fontSize: '0.74rem', color: '#8899b4' }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Price — same height as inputs */}
          <div>
            <div style={{ fontSize: '0.68rem', color: '#8899b4', marginBottom: '7px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Price</div>
            <div style={{ height: ROW_H, padding: '0 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
              {quoteLoading ? (
                <span style={{ fontSize: '0.82rem', color: '#475569' }}>Fetching...</span>
              ) : quoteData ? (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f0f6ff', lineHeight: 1.1 }}>₹{Number(quoteData.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: '600', color: quoteData.percent_change >= 0 ? '#10b981' : '#f43f5e' }}>{quoteData.percent_change >= 0 ? '▲' : '▼'} {Math.abs(quoteData.percent_change).toFixed(2)}%</div>
                </div>
              ) : (
                <span style={{ fontSize: '0.82rem', color: '#334155' }}>Select a stock</span>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <div style={{ fontSize: '0.68rem', color: '#8899b4', marginBottom: '7px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quantity</div>
            <input type="number" min="1" step="1" value={quantity}
              onChange={e => { const v = parseInt(e.target.value, 10); setQuantity(isNaN(v) || v < 1 ? 1 : v); }}
              style={inputBase} />
          </div>

          {/* BUY */}
          <button onClick={() => handleTrade('BUY')} disabled={loading} style={mkBtn('linear-gradient(135deg, #10b981, #059669)', '0 4px 20px rgba(16,185,129,0.35)')}>
            <ArrowUpRight size={18} /> BUY — Add Long Position
          </button>

          {/* SELL */}
          <button onClick={() => handleTrade('SELL')} disabled={loading} style={mkBtn('linear-gradient(135deg, #ef4444, #b91c1c)', '0 4px 20px rgba(239,68,68,0.25)')}>
            <ArrowDownRight size={18} /> SELL — Reduce Position
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#475569', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}/>
          Prices fetched live from NSE · Changes saved to your account · For educational paper trading only
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 22px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '12px' }}>
        <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '1px' }}>💼</span>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700', marginBottom: '4px' }}>Investor Reminder</div>
          <div style={{ fontSize: '0.78rem', color: '#8899b4', lineHeight: '1.6' }}>
            Investing is a long-term game. Use this portfolio to test your stock picks before committing real money. Focus on quality businesses with strong fundamentals, consistent earnings, and low debt. Never invest money you can't afford to lose.
          </div>
        </div>
      </div>
    </div>
  );
}
