import React, { useState } from 'react';
import { Activity, AlertTriangle, BarChart2, Target, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Eye, Code2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api';

const PERIODS = [
  { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
];

const S = ({ label, value, sub, color }) => (
  <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '1rem', fontWeight: '700', color: color || 'var(--text-main)' }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
  </div>
);

// ── Parse AI thesis into structured sections ──────────────────────────────────
function parseThesis(thesis) {
  if (!thesis) return {};
  const s = {};

  // Direction: BUY or SHORT
  const dirMatch = thesis.match(/Direction[:\*\s]+(BUY|SHORT|AVOID)/i);
  s.direction = dirMatch?.[1]?.toUpperCase() || '';

  // Why / reason
  const whyMatch = thesis.match(/Why right now[:\*\s]+([^\n#]+(?:\n(?!##)[^\n#]+)*)/i);
  s.reason = whyMatch?.[1]?.replace(/\*+/g, '').trim() || '';

  // Trade type
  const ttMatch = thesis.match(/Trade Type[:\*\s]+([^\n\*]+)/i);
  s.tradeType = ttMatch?.[1]?.trim() || '';

  // Conviction
  const convMatch = thesis.match(/Conviction[:\*\s]+([^\n\*]+)/i);
  s.conviction = convMatch?.[1]?.trim() || '';

  // Trade levels — from "Exact Trade Levels" section
  const levelsSection = thesis.match(/Exact Trade Levels[\s\S]*?(?=##|$)/)?.[0] || thesis;
  s.entry = levelsSection.match(/Entry[:\*\s]+₹([\d,.]+)/i)?.[1]?.replace(',','') || '';
  s.sl    = levelsSection.match(/Stop Loss[:\*\s]+₹([\d,.]+)/i)?.[1]?.replace(',','') || '';
  s.t1    = levelsSection.match(/Target 1[:\*\s]+₹([\d,.]+)/i)?.[1]?.replace(',','') || '';
  s.t2    = levelsSection.match(/Target 2[:\*\s]+₹([\d,.]+)/i)?.[1]?.replace(',','') || '';
  s.rr    = thesis.match(/Risk:Reward[:\*\s]+1:([\d.]+)/i)?.[1] || '';

  // Position sizing
  s.pos1  = thesis.match(/₹1 Lakh[^\n]*?([\d,]+) shares/)?.[1];
  s.pos5  = thesis.match(/₹5 Lakh[^\n]*?([\d,]+) shares/)?.[1];
  s.pos10 = thesis.match(/₹10 Lakh[^\n]*?([\d,]+) shares/)?.[1];

  // Risk and rule
  s.risk = thesis.match(/One Thing That Could Go Wrong[\s\S]*?\n([^#\n][^\n]+)/)?.[1]?.replace(/\*+/g,'').trim() || '';
  s.rule = thesis.match(/One Rule for This Trade[\s\S]*?\n([^#\n][^\n]+)/)?.[1]?.replace(/\*+/g,'').trim() || '';

  return s;
}

// ── Position Sizer Component ─────────────────────────────────────────────────
function PositionSizer({ parsed, price, isBuy, primaryColor, initialMode }) {
  const [tradeMode, setTradeMode] = React.useState(initialMode || 'swing');
  React.useEffect(() => { if (initialMode) setTradeMode(initialMode); }, [initialMode]); // 'swing' | 'intraday'
  const [leverage, setLeverage] = React.useState(3);
  const [capital, setCapital] = React.useState(100000);

  const entryPrice = parseFloat(parsed.entry?.replace(/,/g,'') || price || 0);
  const slPrice    = parseFloat(parsed.sl?.replace(/,/g,'') || 0);
  const riskPerShare = entryPrice && slPrice ? Math.abs(entryPrice - slPrice) : entryPrice * 0.02;

  const CAPITALS = [
    { label: '₹50K',  value: 50000 },
    { label: '₹1L',   value: 100000 },
    { label: '₹2L',   value: 200000 },
    { label: '₹5L',   value: 500000 },
    { label: '₹10L',  value: 1000000 },
  ];
  const LEVERAGES = [
    { label: '3x', value: 3, desc: 'Conservative' },
    { label: '5x', value: 5, desc: 'Standard' },
    { label: '8x', value: 8, desc: 'Aggressive' },
    { label: '10x', value: 10, desc: 'Max risk' },
  ];

  // Calculations
  const effectiveCapital = tradeMode === 'intraday' ? capital * leverage : capital;
  const riskAmount       = capital * 0.01; // always risk 1% of actual capital
  const shares           = riskPerShare > 0 ? Math.max(1, Math.floor(riskAmount / riskPerShare)) : 0;
  const leveragedShares  = tradeMode === 'intraday'
    ? Math.max(1, Math.floor((riskAmount * leverage) / riskPerShare))
    : shares;
  const totalOutlay      = leveragedShares * entryPrice;
  const maxLoss          = leveragedShares * riskPerShare;
  const brokerMargin     = tradeMode === 'intraday' ? totalOutlay / leverage : totalOutlay;

  const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#a78bfa' }}>💰 Position Sizer</div>

        {/* Mode indicator — no toggle needed, user already chose above */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px', background: tradeMode === 'intraday' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${tradeMode === 'intraday' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`, borderRadius: '8px', width: 'fit-content' }}>
          <span style={{ fontSize: '0.85rem' }}>{tradeMode === 'intraday' ? '⚡' : '🔄'}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: tradeMode === 'intraday' ? '#f59e0b' : '#60a5fa' }}>
            {tradeMode === 'intraday' ? 'Intraday Mode' : 'Swing Mode (2–7 days)'}
          </span>
        </div>
      </div>

      {/* Capital selector */}
      <div>
        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Your Capital</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CAPITALS.map(({ label, value }) => (
            <button key={value} onClick={() => setCapital(value)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${capital === value ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`, background: capital === value ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.2)', color: capital === value ? '#a78bfa' : '#64748b', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Leverage selector — only for intraday */}
      {tradeMode === 'intraday' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Broker Leverage</div>
            <div style={{ fontSize: '0.65rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '20px' }}>
              SEBI allows up to 5x for most stocks
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {LEVERAGES.map(({ label, value, desc }) => (
              <button key={value} onClick={() => setLeverage(value)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${leverage === value ? (value > 5 ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)') : 'rgba(255,255,255,0.08)'}`, background: leverage === value ? (value > 5 ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)') : 'rgba(0,0,0,0.2)', color: leverage === value ? (value > 5 ? '#f87171' : '#60a5fa') : '#64748b', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
                {label} <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>({desc})</span>
              </button>
            ))}
          </div>
          {leverage > 5 && (
            <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#f87171', display: 'flex', gap: '6px', alignItems: 'center' }}>
              ⚠️ Above 5x is very risky — losses multiply equally fast. Only for experienced traders.
            </div>
          )}
        </div>
      )}

      {/* Result card */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${primaryColor}25`, borderRadius: '12px', padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
        {/* Shares */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{isBuy ? 'Shares to Buy' : 'Shares to Short'}</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#a78bfa', lineHeight: 1 }}>{fmt(leveragedShares)}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>shares</div>
        </div>
        {/* Total outlay */}
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '0 10px' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{tradeMode === 'intraday' ? 'Margin Required' : 'Total Outlay'}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f0f6ff', lineHeight: 1 }}>₹{fmt(tradeMode === 'intraday' ? brokerMargin : totalOutlay)}</div>
          {tradeMode === 'intraday' && <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>({leverage}x = ₹{fmt(totalOutlay)} total)</div>}
        </div>
        {/* Max loss */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Max Loss if SL Hit</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ef4444', lineHeight: 1 }}>₹{fmt(maxLoss)}</div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>{((maxLoss/capital)*100).toFixed(1)}% of capital</div>
        </div>
      </div>

      {/* Explanation */}
      <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: '1.7', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid rgba(139,92,246,0.3)' }}>
        {tradeMode === 'swing' ? (
          <>
            <strong style={{ color: '#94a3b8' }}>Swing trade (no leverage):</strong> You put in ₹{fmt(totalOutlay)} of your own money. 
            If the trade goes wrong and hits your stop loss, you lose ₹{fmt(maxLoss)} ({((maxLoss/capital)*100).toFixed(1)}% of your ₹{fmt(capital)} capital). 
            This is the safest approach — recommended for beginners.
          </>
        ) : (
          <>
            <strong style={{ color: '#94a3b8' }}>Intraday with {leverage}x leverage:</strong> You only need ₹{fmt(brokerMargin)} margin from your account. 
            Your broker provides the rest. You control ₹{fmt(totalOutlay)} worth of {leveragedShares} shares. 
            <strong style={{ color: '#f87171' }}> Must exit before 3:20 PM same day.</strong> If SL hits, loss = ₹{fmt(maxLoss)}.
          </>
        )}
      </div>
    </div>
  );
}

// ── Simple View Card ─────────────────────────────────────────────────────────
function SimpleSignalCard({ parsed, price, priceChanged, priceDrift }) {
  const [tradeStyle, setTradeStyle] = React.useState(null); // null=not chosen, 'swing', 'intraday'

  const isBuy   = parsed.direction === 'BUY';
  const isShort = parsed.direction === 'SHORT';
  const isAvoid = parsed.direction === 'AVOID' || (!isBuy && !isShort);
  const conviction = parsed.conviction?.toLowerCase() || '';

  const primaryColor  = isBuy ? '#10b981' : isShort ? '#ef4444' : '#f59e0b';
  const primaryBg     = isBuy ? 'rgba(16,185,129,0.08)' : isShort ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';
  const primaryBorder = isBuy ? 'rgba(16,185,129,0.25)' : isShort ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)';
  const convColor = conviction.includes('high') ? '#10b981' : conviction.includes('low') ? '#ef4444' : '#f59e0b';

  // ── Recalculate targets based on trade style ─────────────────────────────
  // Intraday: small moves (0.5% SL, 0.8% T1, 1.5% T2)
  // Swing: bigger moves (2% SL, 4% T1, 7% T2)
  const entryNum = parseFloat(parsed.entry?.replace(/,/g,'') || price || 0);
  const adjustedLevels = React.useMemo(() => {
    if (!entryNum || !tradeStyle) return parsed;
    if (tradeStyle === 'intraday') {
      // Intraday: tight levels based on % from entry
      const slPct   = 0.006;  // 0.6% SL
      const t1Pct   = 0.008;  // 0.8% T1
      const t2Pct   = 0.015;  // 1.5% T2
      if (isBuy) return {
        ...parsed,
        sl: Math.round(entryNum * (1 - slPct)).toString(),
        t1: Math.round(entryNum * (1 + t1Pct)).toString(),
        t2: Math.round(entryNum * (1 + t2Pct)).toString(),
      };
      if (isShort) return {
        ...parsed,
        sl: Math.round(entryNum * (1 + slPct)).toString(),
        t1: Math.round(entryNum * (1 - t1Pct)).toString(),
        t2: Math.round(entryNum * (1 - t2Pct)).toString(),
      };
    } else {
      // Swing: use AI levels as-is (already correct for multi-day moves)
      return parsed;
    }
    return parsed;
  }, [tradeStyle, entryNum, parsed.entry]);

  const displayParsed = tradeStyle ? adjustedLevels : parsed;
  const slDiff  = entryNum && displayParsed.sl  ? Math.abs(entryNum - parseFloat(displayParsed.sl?.replace(/,/g,''))).toFixed(0)  : 0;
  const t1Diff  = entryNum && displayParsed.t1  ? Math.abs(entryNum - parseFloat(displayParsed.t1?.replace(/,/g,''))).toFixed(0)  : 0;
  const t2Diff  = entryNum && displayParsed.t2  ? Math.abs(entryNum - parseFloat(displayParsed.t2?.replace(/,/g,''))).toFixed(0)  : 0;
  const slPct   = entryNum && slDiff  ? (slDiff  / entryNum * 100).toFixed(1) : 0;
  const t1Pct   = entryNum && t1Diff  ? (t1Diff  / entryNum * 100).toFixed(1) : 0;
  const t2Pct   = entryNum && t2Diff  ? (t2Diff  / entryNum * 100).toFixed(1) : 0;
  const rrRatio = slDiff > 0 ? (t1Diff / slDiff).toFixed(1) : parsed.rr || '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Big signal banner */}
      <div style={{ background: primaryBg, border: `2px solid ${primaryBorder}`, borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: '700' }}>AI Recommendation</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: primaryColor, letterSpacing: '-0.5px' }}>
            {isBuy ? '▲ BUY — Price likely going UP' : isShort ? '▼ SHORT — Price likely going DOWN' : '⚠ AVOID — No clear setup now'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
            <span style={{ color: '#60a5fa', fontWeight: '700', background: 'rgba(59,130,246,0.1)', padding: '2px 10px', borderRadius: '20px', marginRight: '8px' }}>
              {parsed.tradeType?.includes('Intraday') ? '⚡ Intraday — buy & sell same day'
                : parsed.tradeType?.includes('Swing') ? '🔄 Swing — hold 2 to 7 days'
                : parsed.tradeType?.includes('Positional') ? '📅 Positional — hold 2 to 6 weeks'
                : parsed.tradeType || 'Swing'}
            </span>
            <span style={{ color: convColor, fontWeight: '700' }}>{parsed.conviction} Conviction</span>
          </div>
        </div>
        <div style={{ maxWidth: '320px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '10px', borderLeft: `3px solid ${primaryColor}` }}>
          {parsed.reason || 'Click "Get AI Signal" to generate analysis'}
        </div>
      </div>

      {/* ── Step 1: Choose your trade style ── */}
      {!isAvoid && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px 24px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#60a5fa' }}>1</div>
            How are you planning to trade this?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button onClick={() => setTradeStyle('swing')}
              style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${tradeStyle === 'swing' ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'}`, background: tradeStyle === 'swing' ? 'rgba(59,130,246,0.12)' : 'rgba(0,0,0,0.2)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '6px' }}>🔄</div>
              <div style={{ fontWeight: '800', color: tradeStyle === 'swing' ? '#60a5fa' : '#e2e8f0', fontSize: '0.9rem', marginBottom: '4px' }}>Swing Trade</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.5' }}>Hold for 2–7 days. No leverage. Full cash required. Lower risk.</div>
              {tradeStyle === 'swing' && <div style={{ marginTop: '8px', fontSize: '0.68rem', color: '#60a5fa', fontWeight: '700' }}>✓ Selected</div>}
            </button>
            <button onClick={() => setTradeStyle('intraday')}
              style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${tradeStyle === 'intraday' ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.08)'}`, background: tradeStyle === 'intraday' ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.2)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '6px' }}>⚡</div>
              <div style={{ fontWeight: '800', color: tradeStyle === 'intraday' ? '#f59e0b' : '#e2e8f0', fontSize: '0.9rem', marginBottom: '4px' }}>Intraday Trade</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.5' }}>Buy & sell same day. Leverage available (3x–5x). Must exit by 3:20 PM.</div>
              {tradeStyle === 'intraday' && <div style={{ marginTop: '8px', fontSize: '0.68rem', color: '#f59e0b', fontWeight: '700' }}>✓ Selected</div>}
            </button>
          </div>
          {!tradeStyle && (
            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#475569', textAlign: 'center' }}>
              👆 Pick one to see your personalized trade plan below
            </div>
          )}
        </div>
      )}

      {/* Show rest only after trade style is chosen */}
      {(!isAvoid && !tradeStyle) ? null : (
        <React.Fragment>

      {/* Live price drift warning */}
      {priceChanged && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite', flexShrink: 0 }}/>
          <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>
            <strong>Live price update:</strong> Signal was generated at ₹{parsed.entry ? parseFloat(parsed.entry.replace(/,/g,'')).toLocaleString('en-IN') : '—'}. 
            Price has moved <strong style={{ color: priceDrift > 0 ? '#10b981' : '#ef4444' }}>{priceDrift > 0 ? '+' : ''}₹{Math.round(priceDrift)}</strong>. 
            Levels auto-adjusted to current price ₹{price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}.
          </div>
        </div>
      )}

      {/* Single direction trade card */}
      {!isAvoid && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '-4px' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${primaryColor}22`, border: `1px solid ${primaryColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900', color: primaryColor, flexShrink: 0 }}>2</div>
          <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8' }}>Your exact trade levels</div>
        </div>
      )}
      {!isAvoid && (
        <div style={{ background: isBuy ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${isBuy ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '14px', padding: '20px', borderTop: `3px solid ${primaryColor}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            {isBuy ? <TrendingUp size={18} color="#10b981"/> : <TrendingDown size={18} color="#ef4444"/>}
            <span style={{ fontWeight: '900', color: primaryColor, fontSize: '1rem' }}>{isBuy ? 'BUY — Enter this trade to profit when price goes UP' : 'SHORT — Enter this trade to profit when price goes DOWN'}</span>
          </div>
          {/* Style badge inside card */}
          {tradeStyle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', padding: '6px 12px', background: tradeStyle === 'intraday' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${tradeStyle === 'intraday' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`, borderRadius: '8px', width: 'fit-content' }}>
              <span>{tradeStyle === 'intraday' ? '⚡' : '🔄'}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: tradeStyle === 'intraday' ? '#f59e0b' : '#60a5fa' }}>
                {tradeStyle === 'intraday' ? 'Intraday levels — tight targets, must exit by 3:20 PM' : 'Swing levels — wider targets, hold 2–7 days'}
              </span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {[
              { label: '📍 Enter at', value: displayParsed.entry ? `₹${displayParsed.entry}` : '—', sub: 'Current market price', pct: null, color: '#f0f6ff', bg: 'rgba(255,255,255,0.06)' },
              { label: '🛑 Stop Loss', value: displayParsed.sl ? `₹${displayParsed.sl}` : '—', sub: `Exit immediately if hit (${isBuy?'-':'+'}}${slPct}%)`, pct: slPct, color: isBuy ? '#ef4444' : '#10b981', bg: 'rgba(239,68,68,0.06)' },
              { label: '🎯 Target 1', value: displayParsed.t1 ? `₹${displayParsed.t1}` : '—', sub: `Book 50% here → move SL to entry (${isBuy?'+':'-'}${t1Pct}%)`, pct: t1Pct, color: primaryColor, bg: `${primaryColor}12` },
              { label: '🚀 Target 2', value: displayParsed.t2 ? `₹${displayParsed.t2}` : '—', sub: `Trail the rest (${isBuy?'+':'-'}${t2Pct}%)`, pct: t2Pct, color: primaryColor, bg: `${primaryColor}08` },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: bg, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>{label}</div>
                  <div style={{ fontSize: '0.65rem', color: '#475569', lineHeight: '1.4' }}>{sub}</div>
                </div>
                <div style={{ fontWeight: '900', fontFamily: 'monospace', fontSize: '1.1rem', color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '10px', background: `${primaryColor}10`, borderRadius: '8px', fontSize: '0.82rem', color: primaryColor, fontWeight: '700' }}>
            Risk : Reward = 1:{rrRatio} &nbsp;—&nbsp; For every ₹1 you risk, you could gain ₹{rrRatio}
          </div>
        </div>
      )}

      {/* Position sizing with leverage toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '-4px' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#a78bfa', flexShrink: 0 }}>3</div>
        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8' }}>How many shares to {isBuy ? 'buy' : 'short'}</div>
      </div>
      {(parsed.pos1 || parsed.pos5 || parsed.entry) && (
        <PositionSizer parsed={displayParsed} price={price} isBuy={isBuy} primaryColor={primaryColor} initialMode={tradeStyle} />
      )}

      {/* Step by step trade management */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '-4px' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#10b981', flexShrink: 0 }}>4</div>
        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8' }}>What to do — step by step</div>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 20px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8', marginBottom: '12px' }}>🔄 What To Do — Step by Step</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { step: '1', text: 'Enter the trade at the Entry price shown above', color: '#3b82f6' },
            { step: '2', text: 'Set your Stop Loss immediately after entering — this is your safety net', color: '#f59e0b' },
            { step: '3', text: 'When Target 1 is hit → sell half your shares + move stop loss to entry (now you cannot lose money)', color: '#10b981' },
            { step: '4', text: 'When Target 2 is hit → exit the rest, or trail your stop loss 1-2% behind the price', color: '#10b981' },
            { step: '!', text: 'If price hits your Stop Loss → exit immediately. No hoping. No averaging down.', color: '#ef4444' },
          ].map(({ step, text, color }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${color}22`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800', color, flexShrink: 0, marginTop: '1px' }}>{step}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.5' }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk + Rule */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {parsed.risk && (
          <div style={{ display: 'flex', gap: '10px', padding: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: '800', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Watch Out For</div>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.6' }}>{parsed.risk}</div>
            </div>
          </div>
        )}
        {parsed.rule && (
          <div style={{ display: 'flex', gap: '10px', padding: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '800', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Rule</div>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.6' }}>{parsed.rule}</div>
            </div>
          </div>
        )}
      </div>
        </React.Fragment>
      )}
    </div>
  );
}

// ── Technical Analysis Panel ─────────────────────────────────────────────────
function TechnicalPanelWrapper({ symbol, stock }) {
  const [td, setTd] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    api.get(`/market/technicals/${symbol}`)
      .then(r => setTd(r.data.technicals || null))
      .catch(() => setTd(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  const price  = stock?.price || 0;
  const high52 = stock?.fifty_two_week_high || 0;
  const low52  = stock?.fifty_two_week_low  || 0;
  const dayH   = stock?.day_high  || 0;
  const dayL   = stock?.day_low   || 0;
  const prevClose = stock?.prev_close || price;
  const range52Pct = high52 && low52 ? ((price-low52)/(high52-low52)*100).toFixed(0) : null;
  const dayRangePct = dayH && dayL ? ((price-dayL)/(dayH-dayL)*100).toFixed(0) : null;

  const overallColor = td?.overall==='BUY' ? '#10b981' : td?.overall==='SELL' ? '#ef4444' : '#f59e0b';
  const overallBg    = td?.overall==='BUY' ? 'rgba(16,185,129,0.1)' : td?.overall==='SELL' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)';

  return (
    <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'3px', height:'18px', background:'linear-gradient(180deg,#10b981,#3b82f6)', borderRadius:'2px' }}/>
          <h3 style={{ margin:0, fontSize:'0.88rem', fontWeight:'700', color:'#e2e8f0' }}>Technical Analysis</h3>
        </div>
        {td?.overall && (
          <span style={{ fontSize:'0.65rem', padding:'3px 12px', borderRadius:'20px', fontWeight:'800', background:overallBg, color:overallColor, border:`1px solid ${overallColor}40` }}>
            {td.overall==='BUY'?'🟢 BULLISH':td.overall==='SELL'?'🔴 BEARISH':'🟡 NEUTRAL'}
          </span>
        )}
      </div>

      {/* Momentum snapshot */}
      {td && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'6px' }}>
          {[
            { label:'5D Return', value:`${td.mom5>0?'+':''}${td.mom5}%`, color:td.mom5>0?'#10b981':'#ef4444', hint:'5-day price change' },
            { label:'20D Return', value:`${td.mom20>0?'+':''}${td.mom20}%`, color:td.mom20>0?'#10b981':'#ef4444', hint:'20-day momentum' },
            { label:'Trend', value:td.trend_strength, color:td.trend_strength==='Strong'?'#10b981':td.trend_strength==='Moderate'?'#f59e0b':'#ef4444', hint:'Trend strength' },
          ].map(({label,value,color,hint}) => (
            <div key={label} style={{ padding:'8px 10px', background:'rgba(0,0,0,0.25)', borderRadius:'8px', border:`1px solid ${color}22` }}>
              <div style={{ fontSize:'0.6rem', color:'#64748b', textTransform:'uppercase', marginBottom:'3px' }}>{label}</div>
              <div style={{ fontWeight:'800', color, fontSize:'0.88rem' }}>{value}</div>
              <div style={{ fontSize:'0.58rem', color:'#475569', marginTop:'1px' }}>{hint}</div>
            </div>
          ))}
        </div>
      )}

      {/* RSI + MACD + StochRSI + ATR */}
      {td && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
          {[
            { label:'RSI (14)', value:td.rsi?.toFixed(1), color:td.rsi<30?'#10b981':td.rsi>70?'#ef4444':'#f59e0b', hint:td.rsi<30?'Oversold':td.rsi>70?'Overbought':'Neutral' },
            { label:'Stoch RSI', value:td.stoch_rsi?.toFixed(0)+'%', color:td.stoch_rsi<20?'#10b981':td.stoch_rsi>80?'#ef4444':'#f59e0b', hint:td.stoch_rsi<20?'Oversold':td.stoch_rsi>80?'Overbought':'Neutral' },
            { label:'MACD', value:td.macd>td.macd_signal?'Bullish':'Bearish', color:td.macd>td.macd_signal?'#10b981':'#ef4444', hint:`${td.macd?.toFixed(2)} vs ${td.macd_signal?.toFixed(2)}` },
            { label:'ATR (14)', value:`${td.atr_pct}%`, color:td.atr_pct>3?'#ef4444':td.atr_pct>1.5?'#f59e0b':'#10b981', hint:`₹${td.atr?.toFixed(1)} daily range` },
          ].map(({label,value,color,hint}) => (
            <div key={label} style={{ padding:'8px 8px', background:'rgba(0,0,0,0.3)', borderRadius:'8px', textAlign:'center', border:`1px solid ${color}22` }}>
              <div style={{ fontSize:'0.58rem', color:'#64748b', textTransform:'uppercase', marginBottom:'3px' }}>{label}</div>
              <div style={{ fontWeight:'800', color, fontSize:'0.8rem' }}>{value ?? '—'}</div>
              <div style={{ fontSize:'0.58rem', color:'#475569', marginTop:'1px' }}>{hint}</div>
            </div>
          ))}
        </div>
      )}

      {/* Moving Averages */}
      {td && (
        <div>
          <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Moving Averages</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
            {[
              { label:'EMA 9', value:td.ma9, above:price>td.ma9 },
              { label:'SMA 20', value:td.ma20, above:price>td.ma20 },
              { label:'SMA 50', value:td.ma50, above:price>td.ma50 },
              { label:'SMA 200', value:td.ma200, above:price>td.ma200 },
            ].map(({label,value,above}) => value ? (
              <div key={label} style={{ padding:'7px 8px', background:'rgba(0,0,0,0.2)', borderRadius:'7px', borderLeft:`3px solid ${above?'#10b981':'#ef4444'}` }}>
                <div style={{ fontSize:'0.58rem', color:'#64748b', marginBottom:'2px' }}>{label}</div>
                <div style={{ fontWeight:'700', fontFamily:'monospace', color:'#e2e8f0', fontSize:'0.78rem' }}>₹{value?.toLocaleString('en-IN',{maximumFractionDigits:1})}</div>
                <div style={{ fontSize:'0.58rem', color:above?'#10b981':'#ef4444', marginTop:'1px' }}>{above?'↑ Above':'↓ Below'}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Bollinger Bands */}
      {td?.bb_upper && (
        <div>
          <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Bollinger Bands (20,2)</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'6px' }}>
            {[
              { label:'Upper', value:td.bb_upper, color:'#ef4444' },
              { label:'Middle', value:((td.bb_upper+td.bb_lower)/2).toFixed(1), color:'#94a3b8' },
              { label:'Lower', value:td.bb_lower, color:'#10b981' },
            ].map(({label,value,color}) => (
              <div key={label} style={{ padding:'6px 10px', background:'rgba(0,0,0,0.2)', borderRadius:'6px', textAlign:'center' }}>
                <div style={{ fontSize:'0.58rem', color:'#64748b', marginBottom:'2px' }}>{label}</div>
                <div style={{ fontWeight:'700', fontFamily:'monospace', color, fontSize:'0.78rem' }}>₹{parseFloat(value).toLocaleString('en-IN',{maximumFractionDigits:1})}</div>
              </div>
            ))}
          </div>
          <div style={{ height:'5px', background:'linear-gradient(90deg,rgba(16,185,129,0.3),rgba(245,158,11,0.3),rgba(239,68,68,0.3))', borderRadius:'3px', position:'relative' }}>
            <div style={{ position:'absolute', top:'-3px', left:`${Math.max(2,Math.min(98,td.bb_pct))}%`, width:'11px', height:'11px', borderRadius:'50%', background:td.bb_pct>80?'#ef4444':td.bb_pct<20?'#10b981':'#f59e0b', border:'2px solid #0f1623', transform:'translateX(-50%)' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.58rem', color:'#334155', marginTop:'3px' }}>
            <span>Oversold</span><span>Mid</span><span>Overbought</span>
          </div>
        </div>
      )}

      {/* 52W + Day Range bars */}
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {range52Pct !== null && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', marginBottom:'4px' }}>
              <span style={{ color:'#64748b' }}>52W Range</span>
              <span style={{ color:'#94a3b8', fontWeight:'600' }}>{range52Pct}% of yearly range</span>
            </div>
            <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
              <div style={{ width:`${range52Pct}%`, height:'100%', background:range52Pct>70?'#ef4444':range52Pct<30?'#10b981':'#3b82f6', borderRadius:'3px', transition:'width 0.8s' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.58rem', color:'#334155', marginTop:'2px' }}>
              <span>₹{low52?.toLocaleString('en-IN')}</span><span>₹{high52?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
        {dayRangePct !== null && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', marginBottom:'4px' }}>
              <span style={{ color:'#64748b' }}>Day Range</span>
              <span style={{ color:'#94a3b8', fontWeight:'600' }}>{dayRangePct}% of today's range</span>
            </div>
            <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
              <div style={{ width:`${dayRangePct}%`, height:'100%', background:'#f59e0b', borderRadius:'3px' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.58rem', color:'#334155', marginTop:'2px' }}>
              <span style={{ color:'#10b981' }}>L ₹{dayL?.toLocaleString('en-IN')}</span>
              <span style={{ color:'#ef4444' }}>H ₹{dayH?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Key signals */}
      {td?.signals?.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          {td.signals.map((sig,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.72rem', padding:'5px 8px', background:'rgba(0,0,0,0.15)', borderRadius:'6px' }}>
              <span style={{ color:sig.includes('Bullish')||sig.includes('above')||sig.includes('Oversold')||sig.includes('spike')?'#10b981':sig.includes('Bearish')||sig.includes('below')||sig.includes('Overbought')?'#ef4444':'#f59e0b', flexShrink:0 }}>●</span>
              <span style={{ color:'#94a3b8' }}>{sig}</span>
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ fontSize:'0.72rem', color:'#475569', textAlign:'center', padding:'8px' }}>Loading indicators...</div>}
      {!loading && !td && (
        <div style={{ fontSize:'0.72rem', color:'#475569', padding:'6px 10px', background:'rgba(245,158,11,0.04)', borderRadius:'6px', borderLeft:'3px solid rgba(245,158,11,0.3)' }}>
          📊 Technical indicators loading — restart backend if this persists
        </div>
      )}
    </div>
  );
}

// ── Technical Panel ──────────────────────────────────────────────────────────
function TechnicalPanel({ symbol, onNoData }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(true); setData(null);
    api.get(`/market/technicals/${symbol}`)
      .then(r => setData(r.data.technicals))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return (
    <div className="glass-panel" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto 8px' }} />
      Computing technical indicators...
    </div>
  );
  if (!data || Object.keys(data).length === 0) return (
    <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '3px solid rgba(245,158,11,0.4)' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>📊 Technical indicators unavailable — NSE data may be loading. Try refreshing or wait a moment.</span>
    </div>
  );

  const signalColor = data.overall === 'BUY' ? '#10b981' : data.overall === 'SELL' ? '#ef4444' : '#f59e0b';
  const rsiColor = data.rsi < 30 ? '#10b981' : data.rsi > 70 ? '#ef4444' : '#f59e0b';

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="#3b82f6" /> Technical Indicators
        </h3>
        <div style={{ padding: '5px 16px', borderRadius: '20px', fontWeight: '800', fontSize: '0.88rem', background: `${signalColor}22`, color: signalColor, border: `1px solid ${signalColor}44`, letterSpacing: '0.08em' }}>
          {data.overall === 'BUY' ? '🟢 BUY SIGNAL' : data.overall === 'SELL' ? '🔴 SELL SIGNAL' : '🟡 HOLD/NEUTRAL'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: `1px solid ${rsiColor}33`, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>RSI (14)</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: rsiColor }}>{data.rsi}</div>
          <div style={{ fontSize: '0.62rem', color: rsiColor }}>{data.rsi < 30 ? 'Oversold' : data.rsi > 70 ? 'Overbought' : 'Neutral'}</div>
        </div>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: `1px solid ${data.macd > data.macd_signal ? '#10b98133' : '#ef444433'}`, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>MACD</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: data.macd > data.macd_signal ? '#10b981' : '#ef4444' }}>{data.macd > 0 ? '+' : ''}{data.macd?.toFixed(2)}</div>
          <div style={{ fontSize: '0.62rem', color: data.macd > data.macd_signal ? '#10b981' : '#ef4444' }}>{data.macd > data.macd_signal ? 'Bullish' : 'Bearish'}</div>
        </div>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>BB Position</div>
          <div style={{ fontSize: '1rem', fontWeight: '700' }}>{data.bb_pct?.toFixed(0)}%</div>
          <div style={{ fontSize: '0.62rem', color: data.bb_pct > 80 ? '#ef4444' : data.bb_pct < 20 ? '#10b981' : 'var(--text-muted)' }}>
            {data.bb_pct > 80 ? 'Near Upper' : data.bb_pct < 20 ? 'Near Lower' : 'Mid Band'}
          </div>
        </div>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Vol Ratio</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: data.vol_ratio > 1.5 ? '#10b981' : 'var(--text-main)' }}>{data.vol_ratio?.toFixed(2)}x</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{data.vol_ratio > 1.5 ? 'High Volume' : 'Normal'}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Moving Averages</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: '#94a3b8' }}>MA 20</span>
            <span style={{ fontWeight: '600' }}>₹{data.ma20?.toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#94a3b8' }}>MA 50</span>
            <span style={{ fontWeight: '600' }}>₹{data.ma50?.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Key Levels</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span style={{ color: '#10b981' }}>Support</span>
            <span style={{ fontWeight: '600', color: '#10b981' }}>₹{data.support?.toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#ef4444' }}>Resistance</span>
            <span style={{ fontWeight: '600', color: '#ef4444' }}>₹{data.resistance?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {data.signals?.map((sig, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', padding: '6px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
            <span style={{ color: sig.includes('Bullish') || sig.includes('above') || sig.includes('Oversold') ? '#10b981' : sig.includes('Bearish') || sig.includes('below') || sig.includes('Overbought') ? '#ef4444' : '#f59e0b' }}>●</span>
            {sig}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main TraderView ──────────────────────────────────────────────────────────
export default function TraderView({ stock, chartData, chartLoading, news, optionsData, optionsLoading, activePeriod, changePeriod, thesis, thesisLoading, thesisError, loadThesis, formatRupee, formatLargeNum, fmtVol, CustomTooltip, livePrice }) {
  const [signalView, setSignalView] = useState('simple');
  const parsed = parseThesis(thesis);

  // ── Dynamic level recalculation ──────────────────────────────────────────────
  // When AI generated the signal, price was X. Now price is livePrice.
  // We shift Entry/SL/T1/T2 by the same rupee difference.
  const signalPrice = parseFloat(parsed.entry?.replace(/,/g,'') || stock?.price || 0);
  const currentPrice = livePrice || stock?.price || signalPrice;
  const priceDrift = signalPrice > 0 ? (currentPrice - signalPrice) : 0;
  const priceChanged = Math.abs(priceDrift) > signalPrice * 0.005; // >0.5% drift

  const shiftLevel = (val) => {
    if (!val || !priceDrift) return val;
    const num = parseFloat(val.replace(/,/g,''));
    return Math.round(num + priceDrift).toString();
  };

  const dynamicParsed = thesis && priceChanged ? {
    ...parsed,
    entry: shiftLevel(parsed.entry),
    sl:    shiftLevel(parsed.sl),
    t1:    shiftLevel(parsed.t1),
    t2:    shiftLevel(parsed.t2),
  } : parsed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── ROW 1: Chart (left) + News (right) — same height ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Price Chart */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '3px', height: '18px', background: 'linear-gradient(180deg,#3b82f6,#8b5cf6)', borderRadius: '2px' }}/>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '700', color: '#e2e8f0' }}>Price Chart</h3>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '4px' }}>SHORT-TERM</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{label:'1W',value:'5d'},{label:'1M',value:'1mo'},{label:'3M',value:'3mo'}].map(p => (
                <button key={p.value} onClick={() => changePeriod(p.value)}
                  style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid var(--border-color)', background: activePeriod === p.value ? 'var(--accent-blue)' : 'transparent', color: activePeriod === p.value ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            {chartLoading ? (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading chart...</div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{top:4,right:4,bottom:0,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} tickFormatter={v => v.slice(5)} interval={Math.floor(chartData.length / 5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} domain={([min,max])=>[Math.floor(min*0.998), Math.ceil(max*1.002)]} width={62} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{r:4}} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</div>}
          </div>
        </div>

        {/* Market News — fixed height matching chart, scroll inside */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '342px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '3px', height: '16px', background: 'linear-gradient(180deg,#3b82f6,#8b5cf6)', borderRadius: '2px' }}/>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '700', color: '#e2e8f0' }}>Market News</h3>
            </div>
            {news.filter(n => n.headline).length > 0 && (
              <span style={{ fontSize: '0.62rem', color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                {news.filter(n => n.headline).length} articles
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {news.filter(n => n.headline).length > 0 ? news.filter(n => n.headline).map((n, i, arr) => (
              <div key={i} style={{ paddingBottom: '10px', borderBottom: i < arr.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', flexShrink: 0 }}>
                <a href={n.url} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '500', fontSize: '0.8rem', lineHeight: '1.5', display: 'block', marginBottom: '5px' }}
                  onMouseOver={e => e.target.style.color = 'var(--accent-blue)'} onMouseOut={e => e.target.style.color = 'var(--text-main)'}>
                  {n.headline}
                </a>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{n.source}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--accent-teal)', background: 'rgba(16,185,129,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.15)' }}>Relevant</span>
                </div>
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px' }}>No recent news</div>}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Technicals (left half) + Trading Metrics (right half) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <TechnicalPanelWrapper symbol={stock.symbol} stock={stock} />
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'3px', height:'18px', background:'linear-gradient(180deg,#f59e0b,#ef4444)', borderRadius:'2px' }}/>
            <h3 style={{ margin:0, fontSize:'0.88rem', fontWeight:'700', color:'#e2e8f0' }}>Trading Metrics</h3>
          </div>

          {/* Volume Analysis */}
          <div>
            <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>📊 Volume Analysis</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
              {[
                { label:"Today's Volume", value:fmtVol(stock.volume), color:'#f0f6ff' },
                { label:'Avg Volume (20D)', value:fmtVol(stock.avg_volume), color:'#94a3b8' },
              ].map(({label,value,color}) => (
                <div key={label} style={{ padding:'10px 12px', background:'rgba(0,0,0,0.25)', borderRadius:'9px', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:'0.62rem', color:'#64748b', marginBottom:'4px', textTransform:'uppercase' }}>{label}</div>
                  <div style={{ fontSize:'0.95rem', fontWeight:'800', color, fontFamily:'monospace' }}>{value ?? '—'}</div>
                </div>
              ))}
            </div>
            {stock.volume && stock.avg_volume && (() => {
              const ratio = stock.volume / stock.avg_volume;
              const pct = (ratio * 100).toFixed(0);
              const color = ratio > 1.5 ? '#10b981' : ratio < 0.5 ? '#ef4444' : '#f59e0b';
              const label = ratio > 1.5 ? '🔥 High Volume — Strong move' : ratio < 0.5 ? '📉 Low Volume — Weak move' : '➡ Normal Volume';
              return (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.62rem', marginBottom:'4px' }}>
                    <span style={{ color:'#64748b' }}>vs 20D Average</span>
                    <span style={{ color, fontWeight:'700' }}>{pct}% — {label}</span>
                  </div>
                  <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(200,ratio*100)}%`, height:'100%', background:color, borderRadius:'3px' }}/>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Price Reference */}
          <div>
            <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>💹 Price Reference</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              {[
                { label:'Open', value:formatRupee(stock.open), diff: stock.price && stock.open ? ((stock.price/stock.open-1)*100).toFixed(2) : null },
                { label:'Prev Close', value:formatRupee(stock.prev_close), diff: stock.price && stock.prev_close ? ((stock.price/stock.prev_close-1)*100).toFixed(2) : null },
                { label:'Day High', value:formatRupee(stock.day_high), color:'#10b981' },
                { label:'Day Low', value:formatRupee(stock.day_low), color:'#ef4444' },
              ].map(({label,value,diff,color}) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', background:'rgba(0,0,0,0.15)', borderRadius:'6px' }}>
                  <span style={{ fontSize:'0.72rem', color:'#64748b' }}>{label}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    {diff && <span style={{ fontSize:'0.65rem', color:parseFloat(diff)>=0?'#10b981':'#ef4444', fontWeight:'700' }}>{parseFloat(diff)>=0?'+':''}{diff}%</span>}
                    <span style={{ fontWeight:'700', fontFamily:'monospace', color:color||'#e2e8f0', fontSize:'0.82rem' }}>{value ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk & Market */}
          <div>
            <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>⚡ Risk & Market Info</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[
                { label:'Beta', value:stock.beta ? `${stock.beta}x` : '—', hint:stock.beta>1.5?'High volatility':stock.beta<0.8?'Low volatility':'Moderate vol', color:stock.beta>1.5?'#ef4444':stock.beta<0.8?'#10b981':'#f59e0b' },
                { label:'Market Cap', value:formatLargeNum(stock.market_cap), hint:'Company size', color:'#94a3b8' },
                { label:'52W High', value:formatRupee(stock.fifty_two_week_high), hint:stock.price&&stock.fifty_two_week_high?`${(((stock.price/stock.fifty_two_week_high)-1)*100).toFixed(1)}% from high`:'', color:'#ef4444' },
                { label:'52W Low', value:formatRupee(stock.fifty_two_week_low), hint:stock.price&&stock.fifty_two_week_low?`+${(((stock.price/stock.fifty_two_week_low)-1)*100).toFixed(1)}% from low`:'', color:'#10b981' },
              ].map(({label,value,hint,color}) => (
                <div key={label} style={{ padding:'8px 10px', background:'rgba(0,0,0,0.2)', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize:'0.62rem', color:'#64748b', marginBottom:'3px' }}>{label}</div>
                  <div style={{ fontWeight:'700', fontFamily:'monospace', color, fontSize:'0.88rem' }}>{value ?? '—'}</div>
                  {hint && <div style={{ fontSize:'0.58rem', color:'#475569', marginTop:'2px' }}>{hint}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Position Size */}
          {stock.price && (
            <div style={{ padding:'10px 12px', background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:'10px' }}>
              <div style={{ fontSize:'0.65rem', color:'#a78bfa', fontWeight:'700', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.08em' }}>💰 Quick Position Size (2% SL rule)</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'6px' }}>
                {[{cap:'₹1L',risk:1000},{cap:'₹5L',risk:5000},{cap:'₹10L',risk:10000}].map(({cap,risk}) => {
                  const slAmt = stock.price * 0.02;
                  const shares = Math.max(1, Math.floor(risk / slAmt));
                  return (
                    <div key={cap} style={{ textAlign:'center', padding:'7px', background:'rgba(0,0,0,0.2)', borderRadius:'7px' }}>
                      <div style={{ fontSize:'0.58rem', color:'#64748b' }}>{cap} capital</div>
                      <div style={{ fontWeight:'900', color:'#a78bfa', fontSize:'1.1rem' }}>{shares}</div>
                      <div style={{ fontSize:'0.58rem', color:'#475569' }}>shares</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:'0.6rem', color:'#334155', marginTop:'6px', textAlign:'center' }}>Risking 1% of capital with 2% stop loss</div>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: F&O Options (if available) ── */}
      {optionsData?.expiry && (
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>⚡ F&O Options Flow</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '400px' }}>
            <div style={{ padding: '12px', background: `rgba(${optionsData.pcr > 1 ? '16,185,129' : '239,68,68'},0.08)`, border: `1px solid rgba(${optionsData.pcr > 1 ? '16,185,129' : '239,68,68'},0.25)`, borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>PCR</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: optionsData.pcr > 1 ? 'var(--accent-teal)' : 'var(--accent-red)' }}>{optionsData.pcr}</div>
              <div style={{ fontSize: '0.68rem', marginTop: '3px', color: optionsData.pcr > 1 ? 'var(--accent-teal)' : 'var(--accent-red)' }}>{optionsData.pcr > 1 ? '🟢 Bullish' : '🔴 Bearish'}</div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Max Pain</div>
              <div style={{ fontSize: '1rem', fontWeight: '700' }}>{formatRupee(optionsData.max_pain)}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>Expiry: {optionsData.expiry}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 4: AI Signal — FULL WIDTH ── */}
      <div className="glass-panel" style={{ minHeight: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '7px', background: 'rgba(59,130,246,0.12)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Target size={16} color="#3b82f6" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#f0f6ff' }}>AI Trade Signal</h3>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>Entry · Stop Loss · Target · Position Size</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {thesis && (
              <button onClick={() => setSignalView(signalView === 'simple' ? 'advanced' : 'simple')}
                style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}>
                {signalView === 'simple' ? '📋 Raw Output' : '📊 Visual View'}
              </button>
            )}
            <button onClick={loadThesis} disabled={thesisLoading}
              style={{ padding: '9px 20px', background: thesisLoading ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: thesisLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: thesisLoading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)' }}>
              {thesisLoading ? '⚡ Analyzing...' : '📈 Get AI Signal'}
            </button>
          </div>
        </div>

        {thesisError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertTriangle size={15} /> {thesisError}
          </div>
        )}

        {!thesis && !thesisLoading && !thesisError && (
          <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', gap: '10px' }}>
            <Target size={32} style={{ opacity: 0.3 }} />
            <div style={{ fontWeight: '600', color: '#94a3b8' }}>Get Your Personalized Trade Plan</div>
            <div style={{ fontSize: '0.78rem' }}>Entry · Stop Loss · Targets · Position sizing · Step-by-step execution guide</div>
          </div>
        )}

        {thesisLoading && (
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: '0.85rem', gap: '8px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px' }} />
            Analyzing price action, technicals & options flow...
          </div>
        )}

        {thesis && signalView === 'simple' && <SimpleSignalCard parsed={dynamicParsed} price={currentPrice} priceChanged={priceChanged} priceDrift={priceDrift} />}
        {thesis && signalView === 'advanced' && (
          <div style={{ lineHeight: '1.75', whiteSpace: 'pre-wrap', background: 'var(--bg-dark)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: '#94a3b8' }}>
            {thesis}
          </div>
        )}
      </div>
    </div>
  );
}