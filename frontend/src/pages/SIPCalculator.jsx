import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Target, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const fmt = (v) => {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};
const fmtShort = (v) => {
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(0)}L`;
  return `${(v / 1e3).toFixed(0)}K`;
};

const PRESETS = [
  { label: 'Conservative', rate: 10, color: '#10b981', desc: 'Debt + Large Cap funds', hint: 'e.g. Nifty 50 Index Fund, HDFC Balanced Advantage, SBI Bluechip' },
  { label: 'Moderate',     rate: 12, color: '#3b82f6', desc: 'Balanced / Flexi Cap funds', hint: 'e.g. Parag Parikh Flexi Cap, Mirae Asset Flexi Cap, ICICI Pru Balanced Advantage' },
  { label: 'Aggressive',   rate: 15, color: '#f59e0b', desc: 'Mid + Small Cap funds', hint: 'e.g. Nippon India Small Cap, Axis Midcap, Quant Small Cap Fund' },
  { label: 'Nifty 50 Hist.', rate: 13.5, color: '#8b5cf6', desc: 'Historical Nifty 50 avg', hint: 'e.g. UTI Nifty 50 Index Fund, HDFC Index Fund Nifty 50 Plan' },
];

const INFLATION_RATE = 0.07; // India avg ~7%
const FD_RATE        = 0.07; // SBI FD ~7%
const LTCG_EXEMPTION = 100000; // ₹1L exempt per year
const LTCG_TAX       = 0.10;   // 10% on gains above ₹1L

function calcSIP(sip, ls, rate, years) {
  const r = rate / 100 / 12;
  const n = years * 12;
  if (!sip && !ls) return null;
  const sipFV = sip ? sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : 0;
  const lsFV  = ls  ? ls * Math.pow(1 + rate / 100, years) : 0;
  return sipFV + lsFV;
}

export default function SIPCalculator() {
  const [monthly,  setMonthly]  = useState('5000');
  const [years,    setYears]    = useState('10');
  const [rate,     setRate]     = useState('12');
  const [lumpsum,  setLumpsum]  = useState('0');
  const [stepUp,   setStepUp]   = useState('0');
  const [inflation,setInflation]= useState('7');
  const [showTable,setShowTable]= useState(false);
  const [goalAmt,  setGoalAmt]  = useState('10000000'); // ₹1 Cr default

  const sip = parseFloat(monthly.replace(/,/g, ''))  || 0;
  const ls  = parseFloat(lumpsum.replace(/,/g, ''))   || 0;
  const su  = parseFloat(stepUp)   || 0;
  const inf = parseFloat(inflation) / 100 || INFLATION_RATE;
  const yr  = parseInt(years)  || 10;
  const rt  = parseFloat(rate) || 12;
  const r   = rt / 100 / 12;
  const n   = yr * 12;
  const goal= parseFloat(goalAmt.replace(/,/g, '')) || 1e7;

  const results = useMemo(() => {
    if (!sip && !ls) return null;

    // ── Basic SIP FV ─────────────────────────────────────────────────────────
    const sipFV      = sip ? sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : 0;
    const lsFV       = ls  ? ls * Math.pow(1 + rt / 100, yr) : 0;
    const totalFV    = sipFV + lsFV;
    const totalInvested = sip * n + ls;
    const gains      = totalFV - totalInvested;

    // ── LTCG Tax ─────────────────────────────────────────────────────────────
    const taxableGains = Math.max(0, gains - LTCG_EXEMPTION);
    const taxAmount    = taxableGains * LTCG_TAX;
    const postTaxFV    = totalFV - taxAmount;
    const postTaxGains = postTaxFV - totalInvested;

    // ── Inflation-Adjusted (Real) Value ───────────────────────────────────────
    const realValue    = totalFV / Math.pow(1 + inf, yr);
    const realPostTax  = postTaxFV / Math.pow(1 + inf, yr);

    // ── Step-Up FV ───────────────────────────────────────────────────────────
    let stepFV = 0, stepInvested = 0;
    if (su > 0) {
      let cur = sip;
      for (let y = 0; y < yr; y++) {
        for (let m = 0; m < 12; m++) {
          const rem = n - (y * 12 + m);
          stepFV += cur * Math.pow(1 + r, rem);
          stepInvested += cur;
        }
        cur *= (1 + su / 100);
      }
      stepFV += ls * Math.pow(1 + rt / 100, yr);
      stepInvested += ls;
    }

    // ── Year-by-Year table + chart data ──────────────────────────────────────
    const chartData = [];
    let breakEvenYear = null;
    for (let y = 1; y <= yr; y++) {
      const nm   = y * 12;
      const fv   = sip * ((Math.pow(1 + r, nm) - 1) / r) * (1 + r) + ls * Math.pow(1 + rt / 100, y);
      const inv  = sip * nm + ls;
      const g    = fv - inv;
      const fdFV = inv * Math.pow(1 + FD_RATE, y) - inv; // FD gains on same invested amount
      const realFV = fv / Math.pow(1 + inf, y);
      const taxG = Math.max(0, g - LTCG_EXEMPTION) * LTCG_TAX;
      const postTax = fv - taxG;

      if (!breakEvenYear && fv > inv * Math.pow(1 + FD_RATE, y)) {
        breakEvenYear = y;
      }

      chartData.push({
        year: y,
        invested:  Math.round(inv),
        wealth:    Math.round(fv),
        realValue: Math.round(realFV),
        postTax:   Math.round(postTax),
        gains:     Math.round(g),
        fdValue:   Math.round(inv * Math.pow(1 + FD_RATE, y)),
      });
    }

    // ── Comparison across all presets ─────────────────────────────────────────
    const comparison = PRESETS.map(p => {
      const fv  = calcSIP(sip, ls, p.rate, yr);
      const inv = sip * n + ls;
      const g   = fv - inv;
      const tax = Math.max(0, g - LTCG_EXEMPTION) * LTCG_TAX;
      const rv  = fv / Math.pow(1 + inf, yr);
      return { ...p, fv, gains: g, postTax: fv - tax, realValue: rv, invested: inv };
    });

    // ── Goal: SIP needed ─────────────────────────────────────────────────────
    const sipNeeded = goal / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));

    return {
      totalFV, totalInvested, gains, postTaxFV, postTaxGains, taxAmount,
      realValue, realPostTax, sipFV, lsFV,
      stepFV: su > 0 ? stepFV : null, stepInvested: su > 0 ? stepInvested : null,
      chartData, comparison, sipNeeded, breakEvenYear,
      returnPct: (gains / totalInvested) * 100,
    };
  }, [monthly, years, rate, lumpsum, stepUp, inflation, goalAmt]);

  const activePreset = PRESETS.find(p => parseFloat(rate) === p.rate);

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderTop: '3px solid #10b981' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calculator size={20} color="#10b981" /> SIP & Wealth Calculator
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#8899b4' }}>
          Plan your systematic investments — with inflation, tax, and goal planning built in.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>

        {/* ── LEFT: Inputs ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#10b981' }}>📥 Investment Details</h3>

            {/* Monthly SIP */}
            {[
              { label: 'Monthly SIP Amount (₹)', val: monthly, set: setMonthly },
              { label: 'Lumpsum Amount (₹) — optional', val: lumpsum, set: setLumpsum },
            ].map(({ label, val, set }) => (
              <div key={label} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.72rem', color: '#8899b4', display: 'block', marginBottom: '5px' }}>{label}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder="e.g. 5000"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f6ff', fontSize: '0.95rem', fontWeight: '600' }} />
                {val && parseFloat(val.replace(/,/g, '')) > 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '3px' }}>{fmt(parseFloat(val.replace(/,/g, '')))}</div>
                )}
              </div>
            ))}

            {/* Duration slider */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.72rem', color: '#8899b4', display: 'block', marginBottom: '6px' }}>
                Investment Duration: <strong style={{ color: '#f0f6ff' }}>{years} years</strong>
              </label>
              <input type="range" min="1" max="40" value={years} onChange={e => setYears(e.target.value)} style={{ width: '100%', accentColor: '#10b981' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b' }}>
                <span>1 yr</span><span>10 yrs</span><span>20 yrs</span><span>40 yrs</span>
              </div>
            </div>

            {/* Return rate */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.72rem', color: '#8899b4', display: 'block', marginBottom: '6px' }}>
                Expected Annual Return: <strong style={{ color: '#f0f6ff' }}>{rate}%</strong>
              </label>
              <input type="range" min="5" max="30" step="0.5" value={rate} onChange={e => setRate(e.target.value)} style={{ width: '100%', accentColor: '#3b82f6' }} />
              <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                {PRESETS.map(p => (
                  <button key={p.label} onClick={() => setRate(String(p.rate))}
                    style={{ padding: '3px 7px', borderRadius: '5px', border: `1px solid ${parseFloat(rate) === p.rate ? p.color : 'rgba(255,255,255,0.08)'}`, background: parseFloat(rate) === p.rate ? `${p.color}22` : 'transparent', color: parseFloat(rate) === p.rate ? p.color : '#8899b4', fontSize: '0.65rem', cursor: 'pointer', fontWeight: parseFloat(rate) === p.rate ? '700' : '400' }}>
                    {p.label} ({p.rate}%)
                  </button>
                ))}
              </div>
            </div>

            {/* Step-up */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.72rem', color: '#8899b4', display: 'block', marginBottom: '6px' }}>
                Annual Step-Up: <strong style={{ color: '#f0f6ff' }}>{stepUp}%</strong>
                <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: '6px' }}>(increase SIP yearly)</span>
              </label>
              <input type="range" min="0" max="30" value={stepUp} onChange={e => setStepUp(e.target.value)} style={{ width: '100%', accentColor: '#8b5cf6' }} />
            </div>

            {/* Inflation rate */}
            <div>
              <label style={{ fontSize: '0.72rem', color: '#8899b4', display: 'block', marginBottom: '6px' }}>
                Assumed Inflation: <strong style={{ color: '#f0f6ff' }}>{inflation}%</strong>
                <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: '6px' }}>(India avg ~7%)</span>
              </label>
              <input type="range" min="2" max="12" step="0.5" value={inflation} onChange={e => setInflation(e.target.value)} style={{ width: '100%', accentColor: '#ef4444' }} />
            </div>
          </div>

          {/* Goal planner */}
          <div className="glass-panel" style={{ padding: '16px 18px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#3b82f6' }}>🎯 Goal Planner</h3>
            <label style={{ fontSize: '0.72rem', color: '#8899b4', display: 'block', marginBottom: '5px' }}>Target Amount (₹)</label>
            <input value={goalAmt} onChange={e => setGoalAmt(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(59,130,246,0.2)', color: '#f0f6ff', fontSize: '0.9rem', fontWeight: '600' }} />
            {goalAmt && <div style={{ fontSize: '0.7rem', color: '#3b82f6', marginTop: '3px' }}>{fmt(parseFloat(goalAmt.replace(/,/g, '')) || 0)}</div>}
            {results && (
              <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.8rem', color: '#d0daea', lineHeight: '1.6' }}>
                To reach <strong style={{ color: '#3b82f6' }}>{fmt(parseFloat(goalAmt.replace(/,/g, '')) || 1e7)}</strong> in {years} years at {rate}%,<br />
                you need <strong style={{ color: '#10b981', fontSize: '1rem' }}>{fmt(results.sipNeeded)}</strong> monthly SIP.
              </div>
            )}
          </div>

          {activePreset && (
            <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: `1px solid ${activePreset.color}33`, fontSize: '0.78rem', color: '#8899b4', lineHeight: '1.6' }}>
              💡 <strong style={{ color: activePreset.color }}>{activePreset.label}:</strong> {activePreset.desc}
              <div style={{ marginTop: '5px', fontSize: '0.72rem', color: '#64748b' }}>
                📦 {activePreset.hint}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────────────────── */}
        {results ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Top stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Total Wealth', value: fmt(results.totalFV), sub: `${results.returnPct.toFixed(0)}% total return`, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                { label: 'After Tax (LTCG)', value: fmt(results.postTaxFV), sub: `Tax paid: ${fmt(results.taxAmount)}`, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
                { label: `Real Value (${inflation}% inf.)`, value: fmt(results.realPostTax), sub: `Today's money equivalent`, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
              ].map(c => (
                <div key={c.label} style={{ padding: '14px 16px', background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}` }}>
                  <div style={{ fontSize: '0.68rem', color: '#8899b4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{c.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: c.color, lineHeight: 1 }}>{c.value}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '5px' }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { label: 'Total Invested', value: fmt(results.totalInvested), color: '#8899b4' },
                { label: 'Total Gains', value: `+${fmt(results.gains)}`, color: '#10b981' },
                { label: 'Return Multiple', value: `${(results.totalFV / results.totalInvested).toFixed(1)}x`, color: '#3b82f6' },
                { label: 'Beat FD at Year', value: results.breakEvenYear ? `Yr ${results.breakEvenYear}` : 'Always', color: '#8b5cf6' },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Step-up card */}
            {results.stepFV && (
              <div style={{ padding: '14px 18px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#8899b4', marginBottom: '3px' }}>🚀 With {stepUp}% Annual Step-Up</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8b5cf6' }}>{fmt(results.stepFV)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#8899b4', marginTop: '2px' }}>Total invested: {fmt(results.stepInvested)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#8899b4', marginBottom: '3px' }}>Extra vs regular SIP</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>+{fmt(results.stepFV - results.totalFV)}</div>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="glass-panel" style={{ padding: '18px 20px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '0.88rem' }}>📈 Wealth Growth Over Time</h3>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {[
                  { color: '#10b981', label: 'Total Wealth', dash: false },
                  { color: '#3b82f6', label: 'Amount Invested', dash: true },
                  { color: '#ef4444', label: `Real Value (${inflation}% inflation)`, dash: false },
                  { color: '#94a3b8', label: 'If in FD instead', dash: true },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', color: '#8899b4' }}>
                    <div style={{ width: '20px', height: '2px', background: l.color, borderRadius: '1px', opacity: l.dash ? 0.6 : 1, borderBottom: l.dash ? '2px dashed' : 'none', borderColor: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={results.chartData}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#8899b4' }} tickFormatter={v => `Yr ${v}`} />
                  <YAxis tick={{ fontSize: 10, fill: '#8899b4' }} tickFormatter={fmtShort} width={42} />
                  <Tooltip
                    formatter={(v, name) => {
                      const labels = { wealth: 'Total Wealth', invested: 'Invested', realValue: `Real Value`, fdValue: 'FD Value', postTax: 'Post-Tax' };
                      return [fmt(v), labels[name] || name];
                    }}
                    contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.78rem' }}
                  />
                  <Area type="monotone" dataKey="invested"  stroke="#3b82f6" fill="transparent" strokeWidth={1.5} strokeDasharray="5 3" />
                  <Area type="monotone" dataKey="fdValue"   stroke="#94a3b8" fill="transparent" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.5} />
                  <Area type="monotone" dataKey="realValue" stroke="#ef4444" fill="url(#rGrad)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="wealth"    stroke="#10b981" fill="url(#wGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Table */}
            <div className="glass-panel" style={{ padding: '18px 20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.88rem' }}>⚖️ Strategy Comparison (same SIP & duration)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Strategy', 'Return', 'Total Wealth', 'After Tax', 'Real Value', 'Multiple'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Strategy' ? 'left' : 'right', color: '#64748b', fontWeight: '600', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.comparison.map((p, i) => {
                      const isActive = parseFloat(rate) === p.rate;
                      return (
                        <tr key={p.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isActive ? `${p.color}10` : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                          onClick={() => setRate(String(p.rate))}>
                          <td style={{ padding: '10px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                              <span style={{ fontWeight: isActive ? '700' : '500', color: isActive ? p.color : '#d0daea' }}>{p.label}</span>
                              {isActive && <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: `${p.color}22`, color: p.color, borderRadius: '3px' }}>selected</span>}
                            </div>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: p.color, fontWeight: '700' }}>{p.rate}%</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: '#f0f6ff' }}>{fmt(p.fv)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#f59e0b' }}>{fmt(p.postTax)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#ef4444' }}>{fmt(p.realValue)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: p.color, fontWeight: '700' }}>{(p.fv / p.invested).toFixed(1)}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '8px' }}>
                💡 Click any row to switch to that return rate. Real value assumes {inflation}% annual inflation.
              </div>
            </div>

            {/* Year-by-Year Breakdown */}
            <div className="glass-panel" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showTable ? '14px' : '0', cursor: 'pointer' }}
                onClick={() => setShowTable(v => !v)}>
                <h3 style={{ margin: 0, fontSize: '0.88rem' }}>📋 Year-by-Year Breakdown</h3>
                <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 10px', color: '#8899b4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                  {showTable ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Show Table</>}
                </button>
              </div>
              {showTable && (
                <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#0d1626', zIndex: 1 }}>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['Year', 'Invested', 'Total Wealth', 'Gains', 'Post-Tax', 'Real Value', 'vs FD'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Year' ? 'left' : 'right', color: '#64748b', fontWeight: '600', fontSize: '0.68rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.chartData.map((row, i) => {
                        const beatsFD = row.wealth > row.fdValue;
                        const isLast = i === results.chartData.length - 1;
                        return (
                          <tr key={row.year} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isLast ? 'rgba(16,185,129,0.06)' : i % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent' }}>
                            <td style={{ padding: '7px 10px', fontWeight: '600', color: '#f0f6ff' }}>Yr {row.year}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#8899b4' }}>{fmt(row.invested)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>{fmt(row.wealth)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#3b82f6' }}>+{fmt(row.gains)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#f59e0b' }}>{fmt(row.postTax)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#ef4444' }}>{fmt(row.realValue)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: beatsFD ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', color: beatsFD ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                {beatsFD ? `+${fmt(row.wealth - row.fdValue)}` : `-${fmt(row.fdValue - row.wealth)}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.15)', fontSize: '0.82rem', color: '#d0daea', lineHeight: '1.65' }}>
                <div style={{ fontSize: '0.72rem', color: '#8899b4', marginBottom: '6px' }}>💡 What This Means</div>
                Your <strong style={{ color: '#f0f6ff' }}>₹{Number(sip).toLocaleString('en-IN')}/mo</strong> SIP for <strong style={{ color: '#f0f6ff' }}>{years} yrs</strong> grows to <strong style={{ color: '#10b981' }}>{fmt(results.totalFV)}</strong> — but after {inflation}% inflation, its real purchasing power is <strong style={{ color: '#ef4444' }}>{fmt(results.realPostTax)}</strong>. Still <strong style={{ color: '#10b981' }}>{(results.realPostTax / results.totalInvested).toFixed(1)}x</strong> your money in real terms.
              </div>
              <div style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.82rem', color: '#d0daea', lineHeight: '1.65' }}>
                <div style={{ fontSize: '0.72rem', color: '#8899b4', marginBottom: '6px' }}>⚖️ Tax Reality Check</div>
                Your gross gains are <strong style={{ color: '#10b981' }}>{fmt(results.gains)}</strong>. LTCG tax of 10% on gains above ₹1L will cost you <strong style={{ color: '#f59e0b' }}>{fmt(results.taxAmount)}</strong>, leaving <strong style={{ color: '#3b82f6' }}>{fmt(results.postTaxFV)}</strong> post-tax.
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '6px' }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: '1px', color: '#8899b4' }} />
              Returns are estimated. LTCG calculation is simplified (actual tax depends on holding period per installment). Consult a SEBI-registered advisor before investing.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b', fontSize: '0.88rem', flexDirection: 'column', gap: '8px', padding: '60px 20px' }}>
            <Calculator size={32} color="#334155" />
            Enter your monthly SIP amount to see projections
          </div>
        )}
      </div>
    </div>
  );
}