import React, { useState } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const EVENTS = [
  // ── PAST EVENTS ───────────────────────────────────────────────────────────
  { date: '2026-01-15', title: 'India CPI Inflation Data (Dec 2025)', category: 'Macro', impact: 'HIGH', desc: 'December CPI inflation came in at 5.2%, slightly above RBI target. Impacted rate cut expectations for Feb MPC.', markets: ['Broad Market', 'Bonds', 'Banks'] },
  { date: '2026-01-31', title: 'NSE Monthly F&O Expiry (Jan 2026)', category: 'F&O', impact: 'MEDIUM', desc: 'January monthly expiry. Nifty closed near max pain at 23,500. Short covering seen in final hour.', markets: ['Nifty 50', 'BankNifty'] },
  { date: '2026-02-01', title: 'Union Budget FY27', category: 'Policy', impact: 'HIGH', desc: 'Union Budget 2026 announced capex of ₹11.2 lakh crore. Tax slabs revised — ₹12L income now tax free. Markets rallied 2.1% on budget day.', markets: ['All Sectors'] },
  { date: '2026-02-07', title: 'RBI MPC Meeting — Rate Decision', category: 'RBI', impact: 'HIGH', desc: 'RBI cut repo rate by 25 bps to 6.25%. Accommodative stance maintained. Banking and real estate stocks rallied.', markets: ['Banks', 'NBFCs', 'Real Estate', 'Auto'] },
  { date: '2026-02-14', title: 'India CPI & WPI Inflation (Jan 2026)', category: 'Macro', impact: 'HIGH', desc: 'January CPI eased to 4.9%, giving RBI headroom for further cuts. WPI at 2.3%.', markets: ['Broad Market', 'Bonds', 'Banks'] },
  { date: '2026-02-17', title: 'NSE Derivatives Expiry — Sensex Options', category: 'F&O', impact: 'LOW', desc: 'BSE Sensex options saw increased participation after new lot size revision. Liquidity improving.', markets: ['Sensex', 'BSE F&O'] },
  { date: '2026-02-28', title: 'NSE Monthly F&O Expiry (Feb 2026)', category: 'F&O', impact: 'MEDIUM', desc: 'February expiry with high rollover activity ahead of Budget-driven positions unwinding.', markets: ['Nifty 50', 'BankNifty'] },
  { date: '2026-03-05', title: 'India Q3 FY26 GDP Data', category: 'Macro', impact: 'HIGH', desc: 'Q3 GDP grew at 7.1%, beating estimates of 6.8%. Infrastructure and manufacturing drove growth. Markets reacted positively.', markets: ['Broad Market', 'Infrastructure', 'Consumer'] },
  { date: '2026-03-06', title: 'RBI MPC Meeting', category: 'RBI', impact: 'HIGH', desc: 'RBI held rates at 6.25%. Governor noted inflation remains within target band. Neutral stance.', markets: ['Banks', 'NBFCs', 'Real Estate'] },
  { date: '2026-03-14', title: 'India CPI Inflation Data (Feb 2026)', category: 'Macro', impact: 'HIGH', desc: 'February CPI at 4.6% — lowest in 18 months. Strengthened case for another rate cut in April/May.', markets: ['Broad Market', 'Bonds', 'Banks'] },
  { date: '2026-03-16', title: 'India PMI Services (Feb 2026)', category: 'Macro', impact: 'LOW', desc: 'Services PMI at 58.1 — strong expansion. IT and hospitality sectors leading growth.', markets: ['IT', 'Hospitality', 'Consumer Services'] },
  { date: '2026-03-27', title: 'NSE Monthly F&O Expiry (Mar 2026)', category: 'F&O', impact: 'MEDIUM', desc: 'March quarter-end expiry. High volatility as institutional positions closed before Q4 results season.', markets: ['Nifty 50', 'BankNifty', 'Nifty IT'] },
  { date: '2026-03-31', title: 'Financial Year End FY26', category: 'Policy', impact: 'MEDIUM', desc: 'FY26 closes. Mutual fund rebalancing, tax harvesting, and institutional repositioning. Nifty ended FY26 up ~14%.', markets: ['All Sectors'] },
  { date: '2026-04-01', title: 'India PMI Manufacturing (Mar 2026)', category: 'Macro', impact: 'LOW', desc: 'Manufacturing PMI at 56.3 — strong start to new fiscal year. Auto and capital goods led.', markets: ['Manufacturing', 'Auto', 'Capital Goods'] },
  { date: '2026-04-07', title: 'RBI Monetary Policy — Emergency Review', category: 'RBI', impact: 'HIGH', desc: 'RBI held an unscheduled review amid global macro volatility. No rate action taken. Reassured markets of liquidity support.', markets: ['Banks', 'NBFCs', 'Currency', 'Bonds'] },
  { date: '2026-04-11', title: 'India CPI Inflation Data (Mar 2026)', category: 'Macro', impact: 'HIGH', desc: 'March CPI at 4.5%. Food inflation eased significantly. Rate cut in May MPC meeting now widely expected.', markets: ['Broad Market', 'Bonds', 'Banks'] },
  { date: '2026-04-14', title: 'India WPI Inflation (Mar 2026)', category: 'Macro', impact: 'LOW', desc: 'WPI rose 1.9% in March. Commodity prices subdued. No inflationary pressure from producer side.', markets: ['FMCG', 'Commodities', 'Chemicals'] },
  { date: '2026-04-15', title: 'Wipro Q4 FY26 Results', category: 'Earnings', impact: 'MEDIUM', desc: 'Wipro reported 4.2% revenue growth in Q4 FY26. IT guidance for Q1 FY27 was cautious. Stock fell 3% post results.', markets: ['IT Sector'] },
  { date: '2026-04-17', title: 'NSE Weekly F&O Expiry', category: 'F&O', impact: 'LOW', desc: 'Routine weekly expiry. Low volatility week — Nifty traded in a tight 200-point range.', markets: ['Nifty 50', 'BankNifty'] },
  { date: '2026-04-19', title: 'India IIP Data (Feb 2026)', category: 'Macro', impact: 'LOW', desc: 'Industrial production grew 5.8% in February. Mining and electricity sectors outperformed.', markets: ['Manufacturing', 'Capital Goods', 'Power'] },
  // ── UPCOMING EVENTS ───────────────────────────────────────────────────────
  { date: '2026-04-23', title: 'TCS Q4 FY26 Results', category: 'Earnings', impact: 'HIGH', desc: 'TCS results are the bellwether for the Indian IT sector. Revenue growth guidance for FY27 will set the tone for Infosys, Wipro, HCL. Watch for deal wins commentary.', markets: ['IT Sector'] },
  { date: '2026-04-24', title: 'NSE Weekly F&O Expiry', category: 'F&O', impact: 'MEDIUM', desc: 'Weekly options expiry on Nifty and BankNifty. High intraday volatility expected in the last hour. Watch max pain levels.', markets: ['Nifty 50', 'BankNifty'] },
  { date: '2026-04-25', title: 'HDFC Bank Q4 FY26 Results', category: 'Earnings', impact: 'HIGH', desc: "India's largest private bank. NIM trajectory, deposit growth, and credit cost are key metrics to watch.", markets: ['Banking Sector'] },
  { date: '2026-04-29', title: 'US Federal Reserve FOMC Meeting', category: 'Global', impact: 'HIGH', desc: 'US interest rate decision. Fed policy heavily impacts FII flows into Indian markets. Any dovish signal is bullish for India.', markets: ['FII-heavy stocks', 'IT', 'Pharma'] },
  { date: '2026-04-30', title: 'India GDP Q3 FY26 Revised Data', category: 'Macro', impact: 'MEDIUM', desc: 'Revised GDP figures for October-December quarter. Upward revision would boost sentiment.', markets: ['Broad Market', 'Infrastructure'] },
  { date: '2026-05-05', title: 'Reliance Industries Q4 FY26 Results', category: 'Earnings', impact: 'HIGH', desc: "India's largest company by market cap. Jio subscriber growth, retail EBITDA, and O2C margins are key.", markets: ['Telecom', 'Retail', 'Energy'] },
  { date: '2026-05-08', title: 'RBI MPC Meeting & Rate Decision', category: 'RBI', impact: 'HIGH', desc: 'Key policy meeting — market pricing in 25bps cut. Rate decision and forward guidance will move banking stocks sharply.', markets: ['Banks', 'NBFCs', 'Real Estate', 'Auto'] },
  { date: '2026-05-12', title: 'Infosys Q4 FY26 Results', category: 'Earnings', impact: 'HIGH', desc: 'Full year guidance and revenue growth outlook will set IT sector sentiment for FY27. Watch for US client spending commentary.', markets: ['IT Sector'] },
  { date: '2026-05-14', title: 'India CPI & WPI Inflation Data', category: 'Macro', impact: 'HIGH', desc: 'April inflation print — crucial ahead of next RBI meeting. Sub-4.5% CPI would confirm rate cut path.', markets: ['Broad Market', 'Bonds', 'Banks'] },
  { date: '2026-05-20', title: 'India PMI Manufacturing (Apr 2026)', category: 'Macro', impact: 'LOW', desc: 'April manufacturing PMI — early indicator of Q1 FY27 industrial activity. Watch for new orders sub-index.', markets: ['Manufacturing', 'Auto', 'Capital Goods'] },
  { date: '2026-05-29', title: 'NSE Monthly F&O Expiry (May 2026)', category: 'F&O', impact: 'MEDIUM', desc: 'Monthly futures and options expiry. High volatility expected in last 30–60 mins. Max pain levels matter.', markets: ['Nifty 50', 'BankNifty', 'Individual F&O stocks'] },
  { date: '2026-06-05', title: 'RBI Monetary Policy Committee Meeting', category: 'RBI', impact: 'HIGH', desc: 'Second bi-monthly policy review of FY27. Rate decision and stance change could move markets.', markets: ['Banks', 'NBFCs', 'Real Estate'] },
  { date: '2026-06-17', title: 'US Federal Reserve FOMC Meeting', category: 'Global', impact: 'HIGH', desc: 'Key Fed meeting with updated dot plot projections for 2026–2027. Will signal pace of future cuts.', markets: ['FII flows', 'IT', 'USDINR'] },
  { date: '2026-06-25', title: 'NSE Monthly F&O Expiry (June 2026)', category: 'F&O', impact: 'MEDIUM', desc: 'Monthly futures and options expiry. High volatility expected near close.', markets: ['Nifty 50', 'BankNifty'] },
  { date: '2026-06-30', title: 'India GDP Q4 FY26 Data', category: 'Macro', impact: 'HIGH', desc: 'Full year FY26 GDP numbers. Will confirm if India grew at 7%+ for the year.', markets: ['Broad Market', 'Infrastructure', 'Consumer'] },
  { date: '2026-07-01', title: 'GST Council Meeting', category: 'Policy', impact: 'MEDIUM', desc: 'Goods and Services Tax rate changes and policy updates. Watch for EV, insurance, and FMCG rate changes.', markets: ['FMCG', 'Auto', 'Consumer Durables'] },
  { date: '2026-07-06', title: 'India PMI Manufacturing (Jun 2026)', category: 'Macro', impact: 'LOW', desc: 'June manufacturing PMI — signals Q1 FY27 industrial momentum going into results season.', markets: ['Manufacturing', 'Auto', 'Capital Goods'] },
  { date: '2026-07-10', title: 'US CPI Inflation Data', category: 'Global', impact: 'HIGH', desc: 'US inflation data directly impacts Fed rate path and global risk appetite. High CPI = risk-off for EMs.', markets: ['IT', 'Pharma', 'Broad Market'] },
  { date: '2026-07-15', title: 'India CPI Inflation Data', category: 'Macro', impact: 'HIGH', desc: 'Consumer Price Index — key input for RBI rate decisions. High inflation = rate hike risk.', markets: ['Broad Market', 'Bonds', 'Banks'] },
  { date: '2026-07-15', title: 'India WPI Inflation Data', category: 'Macro', impact: 'MEDIUM', desc: 'Wholesale Price Index — tracks price pressures at producer level.', markets: ['FMCG', 'Commodities', 'Chemicals'] },
  { date: '2026-08-06', title: 'RBI MPC Meeting', category: 'RBI', impact: 'HIGH', desc: 'Third bi-monthly policy meeting. Rate path for H2 FY27 will be signalled.', markets: ['Banks', 'NBFCs', 'Real Estate'] },
  { date: '2026-09-15', title: 'India IIP Data (Industrial Output)', category: 'Macro', impact: 'MEDIUM', desc: 'Index of Industrial Production — measures manufacturing and mining activity.', markets: ['Manufacturing', 'Capital Goods', 'Power'] },
  { date: '2026-09-30', title: 'Q1 FY27 Results Season End', category: 'Earnings', impact: 'HIGH', desc: 'Most companies announce April-June quarter results. High earnings surprises can move individual stocks 5–15%.', markets: ['All Sectors'] },
  { date: '2026-10-01', title: 'RBI MPC Meeting', category: 'RBI', impact: 'HIGH', desc: 'Bi-monthly policy meeting. Watch for stance shift and liquidity management signals.', markets: ['Banks', 'NBFCs', 'REIT'] },
  { date: '2027-02-01', title: 'Union Budget FY28', category: 'Policy', impact: 'HIGH', desc: 'The most market-moving event of the year. Fiscal policy, capex plans, and tax changes directly impact all sectors.', markets: ['All Sectors'] },
];

const CAT_COLORS = {
  RBI:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: '🏦' },
  Macro:    { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '📊' },
  Global:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '🌍' },
  Earnings: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '📋' },
  'F&O':    { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '⚡' },
  Policy:   { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   icon: '🏛️' },
};

const IMPACT_STYLES = {
  HIGH:   { color: '#ef4444', label: 'HIGH IMPACT', bg: 'rgba(239,68,68,0.15)' },
  MEDIUM: { color: '#f59e0b', label: 'MEDIUM',      bg: 'rgba(245,158,11,0.15)' },
  LOW:    { color: '#10b981', label: 'LOW',          bg: 'rgba(16,185,129,0.15)' },
};

export default function EconomicCalendar() {
  const [tab, setTab] = useState('upcoming');        // 'upcoming' | 'past'
  const [filter, setFilter] = useState('ALL');
  const [impactFilter, setImpactFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const cats = ['ALL', ...Object.keys(CAT_COLORS)];
  const impacts = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

  const sorted = [...EVENTS].sort((a, b) => new Date(a.date) - new Date(b.date));
  const filtered = sorted.filter(e =>
    (filter === 'ALL' || e.category === filter) &&
    (impactFilter === 'ALL' || e.impact === impactFilter)
  );

  const upcoming = filtered.filter(e => e.date >= today);
  const past = [...filtered.filter(e => e.date < today)].reverse();
  const displayEvents = tab === 'upcoming' ? upcoming : past;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderTop: '3px solid #8b5cf6' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={20} color="#8b5cf6" /> Economic & Earnings Calendar
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#8899b4' }}>
          Key events that move Indian markets — RBI, earnings, global macro, F&O expiry.
        </p>
      </div>

      {/* ── TAB SWITCHER ── */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {[
          { key: 'upcoming', label: 'Upcoming Events', icon: <Clock size={15} />, count: upcoming.length, color: '#8b5cf6', activeGlow: 'rgba(139,92,246,0.25)' },
          { key: 'past',     label: 'Past Events',     icon: <CheckCircle size={15} />, count: past.length,     color: '#10b981', activeGlow: 'rgba(16,185,129,0.2)' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '14px 20px', borderRadius: '12px', border: `2px solid ${tab === t.key ? t.color : 'rgba(255,255,255,0.07)'}`,
            background: tab === t.key ? `${t.activeGlow}` : 'rgba(255,255,255,0.02)',
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: tab === t.key ? `0 0 20px ${t.activeGlow}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ color: tab === t.key ? t.color : '#64748b' }}>{t.icon}</span>
              <span style={{ fontWeight: '700', fontSize: '0.92rem', color: tab === t.key ? t.color : '#64748b' }}>{t.label}</span>
              <span style={{
                padding: '2px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700',
                background: tab === t.key ? t.color : 'rgba(255,255,255,0.06)',
                color: tab === t.key ? 'white' : '#64748b',
              }}>{t.count}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.72rem', color: '#8899b4', alignSelf: 'center', marginRight: '4px' }}>Category:</span>
          {cats.map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: filter === c ? '700' : '400', background: filter === c ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)', color: filter === c ? '#8b5cf6' : '#8899b4', transition: 'all 0.15s' }}>
              {c === 'ALL' ? 'All Events' : `${CAT_COLORS[c]?.icon} ${c}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: '#8899b4', alignSelf: 'center', marginRight: '4px' }}>Impact:</span>
          {impacts.map(imp => {
            const s = IMPACT_STYLES[imp];
            const isActive = impactFilter === imp;
            return (
              <button key={imp} onClick={() => setImpactFilter(imp)} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: isActive ? '700' : '400', background: isActive ? (s?.bg || 'rgba(59,130,246,0.15)') : 'rgba(255,255,255,0.04)', color: isActive ? (s?.color || '#3b82f6') : '#8899b4', transition: 'all 0.15s' }}>
                {imp === 'ALL' ? 'All Impacts' : imp}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(IMPACT_STYLES).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#8899b4' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: v.color }} />
            {v.label}
          </div>
        ))}
        <div style={{ fontSize: '0.75rem', color: '#8899b4', marginLeft: 'auto' }}>Click any event to see details</div>
      </div>

      {/* Events List */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {displayEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#8899b4' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{tab === 'upcoming' ? '📅' : '✅'}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>No events found</div>
            <div style={{ fontSize: '0.78rem' }}>Try changing the category or impact filter.</div>
          </div>
        ) : (
          displayEvents.map((e, i) => {
            const cat = CAT_COLORS[e.category] || { color: '#8899b4', bg: 'rgba(255,255,255,0.06)', icon: '📅' };
            const imp = IMPACT_STYLES[e.impact] || IMPACT_STYLES.LOW;
            const isOpen = expanded === (e.title + e.date);
            const isPast = tab === 'past';
            const isToday = e.date === today;

            return (
              <div key={i}
                onClick={() => setExpanded(isOpen ? null : (e.title + e.date))}
                style={{ padding: '12px 16px', background: isPast ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)', borderRadius: '10px', marginBottom: '8px', border: `1px solid ${isToday ? cat.color + '55' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', opacity: isPast ? 0.65 : 1, transition: 'all 0.2s' }}
                onMouseOver={el => { el.currentTarget.style.borderColor = cat.color + '44'; el.currentTarget.style.opacity = '1'; }}
                onMouseOut={el => { el.currentTarget.style.borderColor = isToday ? cat.color + '55' : 'rgba(255,255,255,0.06)'; el.currentTarget.style.opacity = isPast ? '0.65' : '1'; }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Date badge */}
                  <div style={{ minWidth: '76px', textAlign: 'center', padding: '8px 6px', background: isPast ? 'rgba(255,255,255,0.03)' : cat.bg, borderRadius: '8px', border: `1px solid ${isPast ? 'rgba(255,255,255,0.06)' : cat.color + '30'}` }}>
                    <div style={{ fontSize: '1.1rem' }}>{isPast ? '✅' : cat.icon}</div>
                    <div style={{ fontSize: '0.65rem', color: isPast ? '#64748b' : cat.color, fontWeight: '700', marginTop: '3px' }}>
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                    {isToday && (
                      <div style={{ fontSize: '0.55rem', marginTop: '2px', background: '#10b981', color: 'white', borderRadius: '3px', padding: '1px 4px', fontWeight: '800' }}>TODAY</div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isPast ? '#94a3b8' : '#f0f6ff', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: imp.bg, color: imp.color, fontWeight: '700' }}>{imp.label}</span>
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: cat.bg, color: cat.color, fontWeight: '600' }}>{e.category}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748b', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '0.83rem', color: isPast ? '#94a3b8' : '#d0daea', lineHeight: '1.65', margin: '0 0 10px' }}>{e.desc}</p>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📌 Sectors to Watch</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {e.markets.map(m => (
                        <span key={m} style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#94a3b8' }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Disclaimer */}
      <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', fontSize: '0.78rem', color: '#8899b4', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
        Dates are approximate and may change. Always verify exact dates with official NSE/RBI/BSE announcements before trading.
      </div>
    </div>
  );
}