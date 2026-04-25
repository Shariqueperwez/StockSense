import React, { useState } from 'react';
import { Activity, AlertTriangle, BarChart2, BookOpen, DollarSign, PieChart, Shield, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '3Y', value: '3y' },
  { label: '5Y', value: '5y' },
];

const HOLDING_OPTIONS = [
  { label: '3 Months', days: 90,  desc: 'Short-term investment' },
  { label: '6 Months', days: 180, desc: 'Medium-term' },
  { label: '1 Year',   days: 365, desc: 'Standard horizon' },
  { label: '2 Years',  days: 730, desc: 'Long-term' },
  { label: '5 Years',  days: 1825,desc: 'Wealth creation' },
];

const S = ({ label, value, sub, color }) => (
  <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '1rem', fontWeight: '700', color: color || 'var(--text-main)' }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
  </div>
);

function ValuationPanel({ stock, formatRupee }) {
  if (!stock.fifty_two_week_high || !stock.fifty_two_week_low) return null;
  const high = stock.fifty_two_week_high;
  const low = stock.fifty_two_week_low;
  const price = stock.price;
  const rangePct = ((price - low) / (high - low)) * 100;
  const pe = stock.pe_ratio;

  let verdict = 'Fairly Valued';
  let verdictColor = '#f59e0b';
  let verdictDesc = 'Trading near fair value range';
  if (rangePct < 30) { verdict = 'Near 52W Low'; verdictColor = '#10b981'; verdictDesc = 'Historically cheap — potential value zone'; }
  else if (rangePct > 75) { verdict = 'Near 52W High'; verdictColor = '#ef4444'; verdictDesc = 'Stretched — be cautious on entry'; }
  if (pe && pe > 40) { verdict = 'Overvalued'; verdictColor = '#ef4444'; verdictDesc = `High P/E of ${pe.toFixed(1)}x signals premium pricing`; }
  else if (pe && pe < 15) { verdict = 'Undervalued'; verdictColor = '#10b981'; verdictDesc = `Low P/E of ${pe.toFixed(1)}x — potential value opportunity`; }

  return (
    <div className="glass-panel" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
      <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>💰 Valuation Snapshot</h3>
      <div style={{ textAlign: 'center', padding: '10px 0 14px 0' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: verdictColor, marginBottom: '4px' }}>{verdict}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{verdictDesc}</div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
          <span>52W Low: {formatRupee(low)}</span><span>52W High: {formatRupee(high)}</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, height: '100%', width: '100%', background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)', borderRadius: '4px', opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: '-3px', left: `calc(${Math.min(95, Math.max(5, rangePct))}% - 5px)`, width: '14px', height: '14px', background: 'white', borderRadius: '50%', border: '2px solid #3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.6)' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#60a5fa', marginTop: '8px', fontWeight: '600' }}>Current: {formatRupee(price)} ({rangePct.toFixed(0)}% of 52W range)</div>
      </div>
      {pe && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.82rem', marginTop: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>P/E vs Market Avg (22x)</span>
          <span style={{ color: pe > 22 ? 'var(--accent-red)' : 'var(--accent-teal)', fontWeight: '700' }}>{pe.toFixed(1)}x {pe > 22 ? '▲ Premium' : '▼ Discount'}</span>
        </div>
      )}
    </div>
  );
}

function DayRangePanel({ stock, formatRupee }) {
  const high = stock.day_high;
  const low = stock.day_low;
  const price = stock.price;
  if (!high || !low || high === low) return null;

  const rangePct = ((price - low) / (high - low)) * 100;
  const midPoint = (high + low) / 2;
  const priceVsMid = price >= midPoint;

  let zone = priceVsMid ? 'Upper Half' : 'Lower Half';
  let zoneColor = priceVsMid ? '#f59e0b' : '#10b981';
  let zoneDesc = priceVsMid ? 'Trading in upper half of today\'s range' : 'Trading near today\'s lows — potential entry';

  if (rangePct > 80) { zone = 'Near Day High'; zoneColor = '#ef4444'; zoneDesc = 'Close to today\'s high — be cautious on entry'; }
  else if (rangePct < 20) { zone = 'Near Day Low'; zoneColor = '#10b981'; zoneDesc = 'Near today\'s low — potential intraday opportunity'; }

  return (
    <div className="glass-panel">
      <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>📅 Today's Range</h3>
      <div style={{ textAlign: 'center', padding: '10px 0 14px 0' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: zoneColor, marginBottom: '4px' }}>{zone}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{zoneDesc}</div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
          <span style={{ color: '#10b981', fontWeight: '600' }}>Day Low: {formatRupee(low)}</span>
          <span style={{ color: '#ef4444', fontWeight: '600' }}>Day High: {formatRupee(high)}</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, height: '100%', width: '100%', background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)', borderRadius: '4px', opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: '-3px', left: `calc(${Math.min(95, Math.max(5, rangePct))}% - 5px)`, width: '14px', height: '14px', background: 'white', borderRadius: '50%', border: '2px solid #a78bfa', boxShadow: '0 0 8px rgba(167,139,250,0.6)' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#a78bfa', marginTop: '8px', fontWeight: '600' }}>
          Current: {formatRupee(price)} ({rangePct.toFixed(0)}% of today's range)
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.82rem', marginTop: '8px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Day Range Width</span>
        <span style={{ color: '#f0f6ff', fontWeight: '700' }}>₹{(high - low).toFixed(2)} ({(((high - low) / low) * 100).toFixed(2)}%)</span>
      </div>
    </div>
  );
}

// ── Parse investor thesis into structured sections ────────────────────────────
function parseInvestorThesis(thesis) {
  if (!thesis) return null;
  const s = {};

  // What does company do
  const whatMatch = thesis.match(/What Does.*?Do\??([\s\S]*?)(?=##|$)/i);
  s.what = whatMatch?.[1]?.replace(/\*+/g,'').replace(/##.*/g,'').trim() || '';

  // Valuation
  const valMatch = thesis.match(/Cheap or Expensive|Valuation([\s\S]*?)(?=##|$)/i);
  s.valuation = valMatch?.[1]?.replace(/\*+/g,'').replace(/##.*/g,'').trim() || '';

  // Verdict / overall
  const verdictMatch = thesis.match(/Verdict[:\s*]+(BUY|SELL|HOLD|AVOID)/i);
  s.verdict = verdictMatch?.[1]?.toUpperCase() || '';

  // Fair value
  const fvMatch = thesis.match(/Fair Value[^₹]*?(₹[\d,]+\s*[–-]\s*₹[\d,]+)/i);
  s.fairValueRange = fvMatch?.[1] || '';
  const upsideMatch = thesis.match(/[Uu]pside[^:]*?:?\s*([\d.]+)%/);
  s.upside = upsideMatch?.[1] || '';
  const currentMatch = thesis.match(/Current Price[^₹]*(₹[\d,]+\.?\d*)/i);
  s.currentPrice = currentMatch?.[1] || '';

  // Bull case bullets
  const bullMatch = thesis.match(/Buy.*?Bull Case([\s\S]*?)(?=##|🔴|Bear|$)/i);
  if (bullMatch) {
    s.bullPoints = bullMatch[1].split('\n').filter(l => l.trim().startsWith('*')).map(l => l.replace(/^[* ]+/,'').trim()).filter(Boolean);
  }

  // Bear case bullets
  const bearMatch = thesis.match(/Careful.*?Bear Case([\s\S]*?)(?=##|🎯|Fair|$)/i);
  if (bearMatch) {
    s.bearPoints = bearMatch[1].split('\n').filter(l => l.trim().startsWith('*')).map(l => l.replace(/^[* ]+/,'').trim()).filter(Boolean);
  }

  // Outlook
  const outlookMatch = thesis.match(/(?:Outlook|365-Day)([\s\S]*?)(?=##|💡|Beginner|$)/i);
  s.outlook = outlookMatch?.[1]?.replace(/\*+/g,'').replace(/##.*/g,'').trim().slice(0,280) || '';

  // Beginner advice
  const beginnerMatch = thesis.match(/Beginner([\s\S]*?)(?=##|$)/i);
  s.beginner = beginnerMatch?.[1]?.replace(/\*+/g,'').replace(/##.*/g,'').trim().slice(0,240) || '';

  return s;
}

// ── Investor Thesis Card ───────────────────────────────────────────────────────
function InvestorThesisCard({ thesis, stock, holdingLabel }) {
  const [showRaw, setShowRaw] = React.useState(false);
  const p = parseInvestorThesis(thesis);
  if (!p) return null;

  const verdictColor = p.verdict==='BUY'?'#10b981':p.verdict==='SELL'?'#ef4444':p.verdict==='HOLD'?'#f59e0b':'#94a3b8';
  const verdictBg    = p.verdict==='BUY'?'rgba(16,185,129,0.1)':p.verdict==='SELL'?'rgba(239,68,68,0.1)':p.verdict==='HOLD'?'rgba(245,158,11,0.1)':'rgba(148,163,184,0.1)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      {/* Toggle */}
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button onClick={()=>setShowRaw(!showRaw)}
          style={{ padding:'4px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'#64748b', fontSize:'0.7rem', cursor:'pointer' }}>
          {showRaw ? '📊 Visual View' : '📋 Raw Output'}
        </button>
      </div>

      {showRaw ? (
        <div style={{ lineHeight:'1.75', whiteSpace:'pre-wrap', background:'var(--bg-dark)', padding:'16px', borderRadius:'10px', border:'1px solid var(--border-color)', fontSize:'0.85rem', color:'#94a3b8' }}>{thesis}</div>
      ) : (
        <>
          {/* Verdict + Fair Value banner */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={{ padding:'20px', background:verdictBg, border:`2px solid ${verdictColor}40`, borderRadius:'14px', borderTop:`3px solid ${verdictColor}`, textAlign:'center' }}>
              <div style={{ fontSize:'0.65rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>AI Verdict — {holdingLabel}</div>
              <div style={{ fontSize:'2.2rem', fontWeight:'900', color:verdictColor, marginBottom:'4px' }}>
                {p.verdict==='BUY'?'✅ BUY':p.verdict==='SELL'?'❌ SELL':p.verdict==='HOLD'?'🟡 HOLD':'⚠️ AVOID'}
              </div>
              <div style={{ fontSize:'0.75rem', color:'#64748b' }}>
                {p.verdict==='BUY'?'Good time to invest':p.verdict==='SELL'?'Consider exiting':p.verdict==='HOLD'?'Hold existing position':'Wait for better price'}
              </div>
            </div>
            <div style={{ padding:'20px', background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:'14px', borderTop:'3px solid #8b5cf6' }}>
              <div style={{ fontSize:'0.65rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>Fair Value Estimate</div>
              <div style={{ fontSize:'1.3rem', fontWeight:'800', color:'#a78bfa', marginBottom:'6px' }}>{p.fairValueRange || '—'}</div>
              {p.upside && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 10px', background:'rgba(16,185,129,0.1)', borderRadius:'20px', fontSize:'0.75rem', color:'#10b981', fontWeight:'700' }}>
                  ↑ {p.upside}% upside potential
                </div>
              )}
              {p.currentPrice && <div style={{ fontSize:'0.68rem', color:'#475569', marginTop:'6px' }}>Current: {p.currentPrice}</div>}
            </div>
          </div>

          {/* What the company does */}
          {p.what && (
            <div style={{ padding:'16px 18px', background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px' }}>
              <div style={{ fontSize:'0.7rem', color:'#60a5fa', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
                <span>🏢</span> What Does This Company Do?
              </div>
              <p style={{ fontSize:'0.82rem', color:'#94a3b8', lineHeight:'1.7', margin:0 }}>{p.what.slice(0,300)}</p>
            </div>
          )}

          {/* Bull + Bear side by side */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {/* Bull */}
            {p.bullPoints?.length > 0 && (
              <div style={{ padding:'16px', background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'12px', borderTop:'3px solid #10b981' }}>
                <div style={{ fontSize:'0.72rem', color:'#10b981', fontWeight:'800', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                  ✅ Reasons to BUY
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {p.bullPoints.slice(0,3).map((pt,i) => (
                    <div key={i} style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
                      <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:'800', color:'#10b981', flexShrink:0, marginTop:'1px' }}>✓</div>
                      <span style={{ fontSize:'0.78rem', color:'#94a3b8', lineHeight:'1.5' }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Bear */}
            {p.bearPoints?.length > 0 && (
              <div style={{ padding:'16px', background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:'12px', borderTop:'3px solid #ef4444' }}>
                <div style={{ fontSize:'0.72rem', color:'#ef4444', fontWeight:'800', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                  ⚠️ Reasons to Be Careful
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {p.bearPoints.slice(0,3).map((pt,i) => (
                    <div key={i} style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
                      <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:'800', color:'#ef4444', flexShrink:0, marginTop:'1px' }}>!</div>
                      <span style={{ fontSize:'0.78rem', color:'#94a3b8', lineHeight:'1.5' }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outlook */}
          {p.outlook && (
            <div style={{ padding:'14px 18px', background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'12px' }}>
              <div style={{ fontSize:'0.7rem', color:'#60a5fa', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px' }}>📅 12-Month Outlook</div>
              <p style={{ fontSize:'0.8rem', color:'#94a3b8', lineHeight:'1.7', margin:0 }}>{p.outlook}</p>
            </div>
          )}

          {/* Beginner advice */}
          {p.beginner && (
            <div style={{ padding:'14px 18px', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:'12px', display:'flex', gap:'12px', alignItems:'flex-start' }}>
              <span style={{ fontSize:'1.3rem', flexShrink:0 }}>💡</span>
              <div>
                <div style={{ fontSize:'0.7rem', color:'#f59e0b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>What Should a Beginner Do?</div>
                <p style={{ fontSize:'0.78rem', color:'#94a3b8', lineHeight:'1.6', margin:0 }}>{p.beginner}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function InvestorView({ stock, chartData, chartLoading, news, activePeriod, changePeriod, thesis, thesisLoading, thesisError, loadThesis, formatRupee, formatLargeNum, fmtVol, CustomTooltip, holdingDays, setHoldingDays }) {

  // Build flat list of all fundamental tiles — only include tiles that have data
  const fundamentalTiles = [
    stock.pe_ratio != null && (
      <S key="pe" label="P/E Ratio"
        value={stock.pe_ratio.toFixed(1) + 'x'}
        sub="Price to Earnings"
        color={stock.pe_ratio > 30 ? 'var(--accent-red)' : 'var(--accent-teal)'}
      />
    ),
    stock.eps != null && (
      <S key="eps" label="EPS"
        value={`₹${stock.eps.toFixed(2)}`}
        sub="Earnings/Share"
        color={stock.eps > 0 ? 'var(--accent-teal)' : 'var(--accent-red)'}
      />
    ),
    stock.market_cap != null && (
      <S key="mc" label="Market Cap"
        value={formatLargeNum(stock.market_cap)}
        sub={stock.sector && stock.sector !== 'N/A' ? stock.sector : 'Market Cap'}
      />
    ),
    stock.dividend_yield != null && (
      <S key="div" label="Dividend Yield"
        value={stock.dividend_yield ? stock.dividend_yield.toFixed(2) + '%' : '0%'}
        sub="Annual"
        color={stock.dividend_yield > 2 ? 'var(--accent-teal)' : 'var(--text-main)'}
      />
    ),
    stock.fifty_two_week_high != null && (
      <S key="52h" label="52W High"
        value={formatRupee(stock.fifty_two_week_high)}
        color="var(--accent-teal)"
      />
    ),
    stock.fifty_two_week_low != null && (
      <S key="52l" label="52W Low"
        value={formatRupee(stock.fifty_two_week_low)}
        color="var(--accent-red)"
      />
    ),
    stock.beta != null && (
      <S key="beta" label="Beta"
        value={stock.beta.toFixed(2)}
        sub="Market sensitivity"
        color={stock.beta > 1.3 ? '#f59e0b' : 'var(--text-main)'}
      />
    ),
    stock.avg_volume != null && (
      <S key="vol" label="Avg Volume"
        value={fmtVol(stock.avg_volume)}
        sub="30-day avg"
      />
    ),
    stock.day_high != null && (
      <S key="dh" label="Day High"
        value={formatRupee(stock.day_high)}
        sub="Today's high"
        color="var(--accent-teal)"
      />
    ),
    stock.day_low != null && (
      <S key="dl" label="Day Low"
        value={formatRupee(stock.day_low)}
        sub="Today's low"
        color="var(--accent-red)"
      />
    ),
    stock.open != null && (
      <S key="open" label="Open"
        value={formatRupee(stock.open)}
        sub="Today's open"
      />
    ),
    stock.prev_close != null && (
      <S key="pc" label="Prev Close"
        value={formatRupee(stock.prev_close)}
        sub="Previous close"
      />
    ),
    // Optional extras — shown only if data exists
    stock.pb_ratio != null && (
      <S key="pb" label="P/B Ratio"
        value={stock.pb_ratio.toFixed(2) + 'x'}
        sub={stock.pb_ratio > 5 ? '⚠️ High premium' : 'Price to Book'}
        color={stock.pb_ratio > 5 ? 'var(--accent-red)' : 'var(--text-main)'}
      />
    ),
    stock.roe != null && (
      <S key="roe" label="ROE %"
        value={stock.roe.toFixed(1) + '%'}
        sub={stock.roe > 15 ? '✅ Strong returns' : 'Return on Equity'}
        color={stock.roe > 15 ? 'var(--accent-teal)' : 'var(--text-main)'}
      />
    ),
    stock.profit_margin != null && (
      <S key="pm" label="Profit Margin"
        value={stock.profit_margin.toFixed(1) + '%'}
        sub={stock.profit_margin > 15 ? '✅ Healthy' : 'Net margin'}
        color={stock.profit_margin > 15 ? 'var(--accent-teal)' : 'var(--text-main)'}
      />
    ),
    stock.revenue_growth != null && (
      <S key="rg" label="Revenue Growth"
        value={(stock.revenue_growth > 0 ? '+' : '') + stock.revenue_growth.toFixed(1) + '%'}
        sub="YoY growth"
        color={stock.revenue_growth > 0 ? 'var(--accent-teal)' : 'var(--accent-red)'}
      />
    ),
    stock.earnings_growth != null && (
      <S key="eg" label="Earnings Growth"
        value={(stock.earnings_growth > 0 ? '+' : '') + stock.earnings_growth.toFixed(1) + '%'}
        sub="YoY EPS growth"
        color={stock.earnings_growth > 0 ? 'var(--accent-teal)' : 'var(--accent-red)'}
      />
    ),
    stock.debt_to_equity != null && (
      <S key="de" label="Debt/Equity"
        value={stock.debt_to_equity.toFixed(2)}
        sub={stock.debt_to_equity > 1 ? '⚠️ High leverage' : '✅ Low leverage'}
        color={stock.debt_to_equity > 1 ? 'var(--accent-red)' : 'var(--accent-teal)'}
      />
    ),
    stock.current_ratio != null && (
      <S key="cr" label="Current Ratio"
        value={stock.current_ratio.toFixed(2)}
        sub={stock.current_ratio > 1.5 ? '✅ Good liquidity' : '⚠️ Watch liquidity'}
        color={stock.current_ratio > 1.5 ? 'var(--accent-teal)' : 'var(--text-main)'}
      />
    ),
    stock.roe != null && (
      <S key="roe" label="ROE"
        value={stock.roe.toFixed(1) + '%'}
        sub={stock.roe > 15 ? '✅ Strong returns' : 'Return on Equity'}
        color={stock.roe > 15 ? 'var(--accent-teal)' : 'var(--text-main)'}
      />
    ),
  ].filter(Boolean);

  // Pad to nearest multiple of 4 so grid has no empty cells
  const paddedTiles = [...fundamentalTiles];
  while (paddedTiles.length % 4 !== 0) {
    paddedTiles.push(<div key={`pad-${paddedTiles.length}`} />);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* ── ROW 1: Chart (left) === Valuation (right) — same height ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'16px' }}>
        {/* Price Chart */}
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <h3 style={{ margin:0, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'8px' }}>
              <BarChart2 size={16} style={{ color:'#10b981' }} /> Price Trend
              <span style={{ fontSize:'0.65rem', color:'#10b981', background:'rgba(16,185,129,0.1)', padding:'2px 8px', borderRadius:'4px' }}>LONG-TERM</span>
            </h3>
            <div style={{ display:'flex', gap:'4px' }}>
              {PERIODS.map(p => (
                <button key={p.value} type="button" onClick={() => changePeriod(p.value)}
                  style={{ padding:'3px 9px', borderRadius:'6px', fontSize:'0.75rem', border:'1px solid var(--border-color)', background:activePeriod===p.value?'#10b981':'transparent', color:activePeriod===p.value?'white':'var(--text-muted)', cursor:'pointer' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {chartLoading ? (
            <div style={{ height:'240px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'0.85rem' }}>Loading...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{top:4,right:4,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#64748b' }} tickLine={false} tickFormatter={v=>v.slice(0,7)} interval={Math.floor(chartData.length/4)} />
                <YAxis tick={{ fontSize:10, fill:'#64748b' }} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}`} domain={['auto','auto']} width={68} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{r:4}} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{ height:'240px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'0.85rem' }}>No data</div>}
        </div>

        {/* Valuation — same height as chart via alignItems:stretch on parent */}
        <ValuationPanel stock={stock} formatRupee={formatRupee} />
      </div>

      {/* ── ROW 2: Key Fundamentals (left 2/3) | Today's Range + News stacked (right 1/3) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'16px', alignItems:'stretch' }}>

        {/* Key Fundamentals — left, full height */}
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{ width:'3px', height:'18px', background:'linear-gradient(180deg,#10b981,#f59e0b)', borderRadius:'2px' }}/>
            <h3 style={{ margin:0, fontSize:'0.88rem', fontWeight:'700', color:'#e2e8f0' }}>Key Fundamentals</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px', gridAutoRows:'1fr' }}>
            {paddedTiles}
          </div>
        </div>

        {/* Right column: Today's Range (top) + News (bottom, scrollable) */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <DayRangePanel stock={stock} formatRupee={formatRupee} />

          {/* Company News — flex:1 so it fills remaining height, scrolls inside */}
          <div className="glass-panel" style={{ display:'flex', flexDirection:'column', maxHeight:'280px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px', paddingBottom:'10px', borderBottom:'1px solid var(--border-color)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'3px', height:'14px', background:'linear-gradient(180deg,#10b981,#3b82f6)', borderRadius:'2px' }}/>
                <h3 style={{ margin:0, fontSize:'0.85rem', fontWeight:'700', color:'#e2e8f0' }}>Company News</h3>
              </div>
              {news.filter(n=>n.headline).length > 0 && (
                <span style={{ fontSize:'0.6rem', color:'#64748b', background:'rgba(255,255,255,0.04)', padding:'1px 7px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
                  {news.filter(n=>n.headline).length} articles
                </span>
              )}
            </div>
            <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.1) transparent' }}>
              {news.filter(n=>n.headline).length > 0 ? news.filter(n=>n.headline).map((n,i,arr) => (
                <div key={i} style={{ paddingBottom:'8px', borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.04)':'none', flexShrink:0 }}>
                  <a href={n.url} target="_blank" rel="noreferrer"
                    style={{ color:'var(--text-main)', textDecoration:'none', fontWeight:'500', fontSize:'0.78rem', lineHeight:'1.5', display:'block', marginBottom:'4px' }}
                    onMouseOver={e=>e.target.style.color='#10b981'} onMouseOut={e=>e.target.style.color='var(--text-main)'}>
                    {n.headline}
                  </a>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{n.source}</span>
                    <span style={{ fontSize:'0.62rem', color:'#10b981', background:'rgba(16,185,129,0.08)', padding:'1px 5px', borderRadius:'4px' }}>Relevant</span>
                  </div>
                </div>
              )) : <div style={{ color:'var(--text-muted)', fontSize:'0.8rem', textAlign:'center', padding:'16px' }}>No recent news</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: AI Investment Thesis — full width ── */}
      <div className="glass-panel">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ padding:'7px', background:'rgba(16,185,129,0.12)', borderRadius:'8px', border:'1px solid rgba(16,185,129,0.2)' }}>
              <BookOpen size={16} color="#10b981" />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'800', color:'#f0f6ff' }}>AI Investment Thesis</h3>
              <div style={{ fontSize:'0.68rem', color:'#64748b', marginTop:'1px' }}>Fundamentals · Valuation · Fair Value · Long-term outlook</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            {/* Horizon pills */}
            <div style={{ display:'flex', gap:'4px' }}>
              {HOLDING_OPTIONS.map(opt => (
                <button key={opt.days} type="button" onClick={() => setHoldingDays(opt.days)}
                  style={{ padding:'5px 12px', borderRadius:'20px', fontSize:'0.74rem', fontWeight:'600', border:`1px solid ${holdingDays===opt.days?'#10b981':'var(--border-color)'}`, background:holdingDays===opt.days?'rgba(16,185,129,0.15)':'transparent', color:holdingDays===opt.days?'#10b981':'var(--text-muted)', cursor:'pointer', transition:'all 0.15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => loadThesis(holdingDays)} disabled={thesisLoading}
              style={{ padding:'9px 20px', background:thesisLoading?'rgba(16,185,129,0.3)':'linear-gradient(135deg,#10b981,#059669)', color:'white', border:'none', borderRadius:'8px', fontSize:'0.85rem', fontWeight:'700', cursor:thesisLoading?'not-allowed':'pointer', boxShadow:thesisLoading?'none':'0 4px 16px rgba(16,185,129,0.3)', display:'flex', alignItems:'center', gap:'6px' }}>
              {thesisLoading ? '⏳ Analyzing...' : '💼 Generate Thesis'}
            </button>
          </div>
        </div>

        {thesisError && <div style={{ background:'rgba(239,68,68,0.1)', color:'var(--accent-red)', padding:'10px', borderRadius:'8px', fontSize:'0.85rem', display:'flex', gap:'8px' }}><AlertTriangle size={15} />{thesisError}</div>}
        {!thesis && !thesisLoading && !thesisError && (
          <div style={{ padding:'40px 20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', textAlign:'center', gap:'10px' }}>
            <BookOpen size={32} style={{ opacity:0.3 }} />
            <div style={{ fontWeight:'600', color:'#94a3b8' }}>Select a holding period and generate your investment thesis</div>
            <div style={{ fontSize:'0.78rem' }}>Fair value · Bull & Bear case · Beginner advice · Horizon-specific outlook</div>
          </div>
        )}
        {thesisLoading && (
          <div style={{ padding:'40px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#10b981', fontSize:'0.85rem', gap:'8px' }}>
            <div className="spinner" style={{ width:'24px', height:'24px', borderColor:'rgba(16,185,129,0.2)', borderTopColor:'#10b981' }} />
            Analyzing fundamentals for {HOLDING_OPTIONS.find(o=>o.days===holdingDays)?.label||'your'} horizon...
          </div>
        )}
        {thesis && <InvestorThesisCard thesis={thesis} stock={stock} holdingLabel={HOLDING_OPTIONS.find(o=>o.days===holdingDays)?.label||'your horizon'} />}
      </div>
    </div>
  );
}