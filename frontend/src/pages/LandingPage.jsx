import React, { useState, useEffect } from 'react';

export default function LandingPage({ onEnter }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n+1), 3000); return () => clearInterval(t); }, []);

  const tickers = [
    { sym:'TCS',     price:'₹2,396', chg:'-4.77%', down:true },
    { sym:'RELIANCE',price:'₹1,327', chg:'-1.23%', down:true },
    { sym:'ADANIENT',price:'₹2,840', chg:'+3.20%', down:false },
    { sym:'SBIN',    price:'₹812',   chg:'+1.50%', down:false },
    { sym:'INFY',    price:'₹1,154', chg:'-8.99%', down:true },
  ];

  const features = [
    { icon:'📈', title:'AI Trade Signal', desc:'BUY or SHORT with exact Entry, SL & Target. Not generic advice — specific to current price action.', color:'#3b82f6' },
    { icon:'⚡', title:'Paper Trading Terminal', desc:'Practice Intraday & Swing trades with ₹10 Lakh virtual money. Real NSE prices — zero financial risk.', color:'#f59e0b' },
    { icon:'💰', title:'Position Sizer', desc:'Know exactly how many shares to buy based on your capital. Never over-risk again.', color:'#10b981' },
    { icon:'🔍', title:'Fundamental Analysis', desc:'P/E, ROE, fair value estimate and AI investment thesis for long-term stock picking.', color:'#8b5cf6' },
    { icon:'📊', title:'Live Technicals', desc:'RSI, MACD, Bollinger Bands, Support & Resistance — always up to date from NSE.', color:'#06b6d4' },
    { icon:'🛡️', title:'Portfolio Stress Test', desc:'See how your holdings survive a market crash, bull run or sector rotation.', color:'#ef4444' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#070c14', color:'#f0f6ff', fontFamily:"'DM Sans',system-ui,sans-serif", overflowX:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,400&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(59,130,246,0.3)}50%{box-shadow:0 0 40px rgba(59,130,246,0.6)}}
        .fade1{animation:fadeUp 0.6s 0.1s ease forwards;opacity:0}
        .fade2{animation:fadeUp 0.6s 0.25s ease forwards;opacity:0}
        .fade3{animation:fadeUp 0.6s 0.4s ease forwards;opacity:0}
        .fade4{animation:fadeUp 0.6s 0.55s ease forwards;opacity:0}
        .fcard{transition:all 0.2s;border:1px solid rgba(255,255,255,0.07) !important;}
        .fcard:hover{transform:translateY(-4px);border-color:rgba(59,130,246,0.35) !important;background:rgba(59,130,246,0.05) !important;}
        .cta-btn{transition:all 0.2s;}
        .cta-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(59,130,246,0.5) !important;}
        .sec-btn{transition:all 0.2s;}
        .sec-btn:hover{background:rgba(255,255,255,0.08) !important;}
      `}</style>

      {/* Ticker tape */}
      <div style={{ background:'rgba(59,130,246,0.06)', borderBottom:'1px solid rgba(59,130,246,0.15)', padding:'8px 0', overflow:'hidden', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-flex', gap:'40px', animation:'ticker 20s linear infinite' }}>
          {[...tickers,...tickers,...tickers].map((t,i) => (
            <span key={i} style={{ fontSize:'0.75rem', fontWeight:'600', color: t.down ? '#ef4444' : '#10b981' }}>
              {t.sym} {t.price} {t.chg}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 60px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>📈</div>
          <span style={{ fontSize:'1.2rem', fontWeight:'900', letterSpacing:'-0.5px' }}>Stock<span style={{ color:'#3b82f6' }}>Sense</span></span>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <span style={{ fontSize:'0.75rem', color:'#475569', padding:'4px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'20px' }}>NSE · BSE · Real-time Data</span>
          <button className="cta-btn" onClick={onEnter}
            style={{ padding:'9px 22px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none', borderRadius:'8px', color:'white', fontWeight:'700', fontSize:'0.85rem', cursor:'pointer', boxShadow:'0 4px 16px rgba(59,130,246,0.3)' }}>
            Get Started Free →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding:'80px 60px 60px', maxWidth:'1100px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'60px', alignItems:'center' }}>
        <div>
          <div className="fade1" style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'5px 14px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'20px', fontSize:'0.72rem', color:'#10b981', fontWeight:'700', marginBottom:'24px' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', animation:'pulse 2s infinite', display:'inline-block' }}/>
            NSE · BSE · Real-time · AI-Powered
          </div>
          <h1 className="fade2" style={{ fontSize:'3.2rem', fontWeight:'900', lineHeight:'1.05', letterSpacing:'-1.5px', marginBottom:'20px' }}>
            Real Market Data.<br/>
            <span style={{ color:'#3b82f6' }}>Smarter Trading</span><br/>
            Decisions.
          </h1>
          <p className="fade3" style={{ fontSize:'1rem', color:'#94a3b8', lineHeight:'1.7', marginBottom:'32px', maxWidth:'440px' }}>
            Live NSE/BSE prices, AI trade signals with exact Entry/SL/Target, professional technicals and paper trading with virtual ₹10L — everything you need to trade smarter.
          </p>
          <div className="fade4" style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            <button className="cta-btn" onClick={onEnter}
              style={{ padding:'14px 32px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none', borderRadius:'10px', color:'white', fontWeight:'800', fontSize:'1rem', cursor:'pointer', boxShadow:'0 4px 24px rgba(59,130,246,0.4)', letterSpacing:'0.01em' }}>
              Get Started Free →
            </button>
            <button className="sec-btn" onClick={onEnter}
              style={{ padding:'14px 24px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', color:'#e2e8f0', fontWeight:'600', fontSize:'0.95rem', cursor:'pointer' }}>
              View Demo
            </button>
          </div>
          {/* Social proof */}
          <div className="fade4" style={{ display:'flex', gap:'24px', marginTop:'36px', flexWrap:'wrap' }}>
            {[['₹10L','Virtual Money to Practice'],['Real-time','NSE/BSE Prices'],['₹0','No Real Money Needed']].map(([v,l]) => (
              <div key={l}>
                <div style={{ fontSize:'1.3rem', fontWeight:'900', color:'#f0f6ff' }}>{v}</div>
                <div style={{ fontSize:'0.7rem', color:'#475569', marginTop:'2px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — mock signal card */}
        <div className="fade3" style={{ position:'relative' }}>
          <div style={{ position:'absolute', inset:'-20px', background:'radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ background:'rgba(15,22,35,0.9)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:'20px', padding:'24px', backdropFilter:'blur(20px)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', animation:'glow 3s ease infinite' }}>
            {/* Stock header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
              <div>
                <div style={{ fontSize:'1.4rem', fontWeight:'900', letterSpacing:'-0.5px' }}>TCS</div>
                <div style={{ fontSize:'0.72rem', color:'#64748b' }}>Tata Consultancy Services</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'1.5rem', fontWeight:'800' }}>₹2,396</div>
                <div style={{ fontSize:'0.75rem', color:'#ef4444', fontWeight:'700' }}>▼ -4.77% today</div>
              </div>
            </div>
            {/* AI Signal */}
            <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'12px', padding:'14px', marginBottom:'14px' }}>
              <div style={{ fontSize:'0.65rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px' }}>AI Recommendation</div>
              <div style={{ fontSize:'1.5rem', fontWeight:'900', color:'#ef4444', marginBottom:'4px' }}>▼ SHORT — Price going DOWN</div>
              <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>🔄 Swing — hold 2 to 7 days · Medium Conviction</div>
            </div>
            {/* Levels */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                {l:'📍 Entry',v:'₹2,400',c:'#f0f6ff'},
                {l:'🛑 Stop Loss',v:'₹2,470',c:'#10b981'},
                {l:'🎯 Target 1',v:'₹2,250',c:'#ef4444'},
                {l:'🚀 Target 2',v:'₹2,150',c:'#ef4444'},
              ].map(({l,v,c}) => (
                <div key={l} style={{ padding:'8px 12px', background:'rgba(0,0,0,0.3)', borderRadius:'8px' }}>
                  <div style={{ fontSize:'0.62rem', color:'#475569', marginBottom:'2px' }}>{l}</div>
                  <div style={{ fontWeight:'800', fontFamily:'monospace', color:c, fontSize:'0.9rem' }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Position sizing */}
            <div style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:'8px', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>💰 Position Size (₹5L capital, 1% risk)</div>
              <div style={{ fontWeight:'800', color:'#a78bfa', fontSize:'0.9rem' }}>104 shares</div>
            </div>
          </div>
        </div>
      </section>

      {/* Two modes */}
      <section style={{ padding:'50px 60px', borderTop:'1px solid rgba(255,255,255,0.05)', maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <h2 style={{ fontSize:'1.8rem', fontWeight:'800', marginBottom:'8px', letterSpacing:'-0.5px' }}>Two Modes, One Platform</h2>
          <p style={{ color:'#64748b', fontSize:'0.88rem' }}>Switch anytime — built for both traders and investors</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {[
            { color:'#3b82f6', icon:'⚡', mode:'Trader Mode', tag:'Short-term · Intraday · Swing', desc:'Get AI BUY/SHORT signals with exact entry, stop loss and target. Paper trade with leverage. Track your P&L.', points:['AI signals for every NSE stock','Intraday (same day) & Swing (2-7 days)','Leverage calculator (1x to 10x)','Paper terminal with virtual ₹10L'] },
            { color:'#10b981', icon:'📈', mode:'Investor Mode', tag:'Long-term · Fundamentals · Wealth', desc:'Analyze P/E, ROE, revenue growth and get an AI investment thesis. Build and stress test your portfolio.', points:['Fundamental analysis & fair value','AI investment thesis in plain English','Portfolio diversification tracker','Stress test against market scenarios'] },
          ].map(({color,icon,mode,tag,desc,points}) => (
            <div key={mode} className="fcard" style={{ padding:'28px', background:'rgba(255,255,255,0.02)', borderRadius:'16px', borderTop:`3px solid ${color} !important` }}>
              <div style={{ fontSize:'1.6rem', marginBottom:'12px' }}>{icon}</div>
              <div style={{ fontSize:'1rem', fontWeight:'800', color, marginBottom:'4px' }}>{mode}</div>
              <div style={{ fontSize:'0.68rem', color:'#64748b', marginBottom:'14px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em' }}>{tag}</div>
              <p style={{ fontSize:'0.82rem', color:'#94a3b8', lineHeight:'1.65', marginBottom:'16px' }}>{desc}</p>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'7px' }}>
                {points.map(p => <li key={p} style={{ fontSize:'0.78rem', color:'#cbd5e1', display:'flex', gap:'8px' }}><span style={{ color, flexShrink:0 }}>✓</span>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding:'50px 60px', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(59,130,246,0.02)', maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <h2 style={{ fontSize:'1.8rem', fontWeight:'800', marginBottom:'8px', letterSpacing:'-0.5px' }}>Learn With Professional Tools</h2>
          <p style={{ color:'#64748b', fontSize:'0.88rem' }}>Real market tools — explained in plain language for beginners</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
          {features.map(({icon,title,desc,color}) => (
            <div key={title} className="fcard" style={{ padding:'22px', background:'rgba(0,0,0,0.2)', borderRadius:'12px' }}>
              <div style={{ width:'40px', height:'40px', background:`${color}18`, border:`1px solid ${color}30`, borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', marginBottom:'12px' }}>{icon}</div>
              <h4 style={{ fontSize:'0.88rem', fontWeight:'700', marginBottom:'7px', color:'#e2e8f0' }}>{title}</h4>
              <p style={{ fontSize:'0.76rem', color:'#64748b', lineHeight:'1.6', margin:0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who is it for */}
      <section style={{ padding:'50px 60px', borderTop:'1px solid rgba(255,255,255,0.05)', maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <h2 style={{ fontSize:'1.8rem', fontWeight:'800', marginBottom:'8px', letterSpacing:'-0.5px' }}>Who Is StockSense For?</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
          {[
            {e:'🎓',t:'Beginners',d:'Never traded before? Every term explained simply. Practice with virtual money first.'},
            {e:'📱',t:'Young Investors',d:'Learning to invest in your 20s? Build good habits with paper trading before using real money.'},
            {e:'🔁',t:'Active Traders',d:'Want to learn day trading or swing trading? Practice strategies with zero financial risk.'},
            {e:'💼',t:'Long-term Investors',d:'Learning to pick stocks for the long term? Understand fundamentals and practice portfolio building.'},
          ].map(({e,t,d}) => (
            <div key={t} className="fcard" style={{ padding:'20px', background:'rgba(0,0,0,0.2)', borderRadius:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'1.8rem', marginBottom:'10px' }}>{e}</div>
              <h4 style={{ fontSize:'0.85rem', fontWeight:'700', marginBottom:'8px', color:'#e2e8f0' }}>{t}</h4>
              <p style={{ fontSize:'0.74rem', color:'#64748b', lineHeight:'1.6', margin:0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'70px 60px', textAlign:'center', background:'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(59,130,246,0.1) 0%, transparent 70%)', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize:'2.2rem', fontWeight:'900', marginBottom:'12px', letterSpacing:'-1px' }}>Start Trading Smarter Today</h2>
        <p style={{ color:'#64748b', marginBottom:'28px', fontSize:'0.9rem' }}>Free forever · Real NSE/BSE data · Paper trade with virtual ₹10L</p>
        <button className="cta-btn" onClick={onEnter}
          style={{ padding:'15px 42px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none', borderRadius:'12px', color:'white', fontWeight:'800', fontSize:'1.05rem', cursor:'pointer', boxShadow:'0 4px 28px rgba(59,130,246,0.45)', letterSpacing:'0.02em' }}>
          Start Learning for Free →
        </button>

        {/* Disclaimer */}
        <div style={{ marginTop:'50px', padding:'16px 24px', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:'10px', maxWidth:'700px', margin:'50px auto 0', textAlign:'left', display:'flex', gap:'10px' }}>
          <span style={{ flexShrink:0 }}>⚠️</span>
          <p style={{ fontSize:'0.72rem', color:'#64748b', lineHeight:'1.7', margin:0 }}>
            <strong style={{ color:'#f59e0b' }}>Important:</strong> StockSense is purely an <strong style={{ color:'#f0f6ff' }}>educational paper trading platform</strong>. All trades use virtual money — no real money is ever involved. AI signals, analysis and recommendations are for <strong style={{ color:'#f0f6ff' }}>learning purposes only</strong> and do not constitute financial advice. Never make real investment decisions based solely on this platform. Consult a SEBI-registered financial advisor for real investments.
          </p>
        </div>
        <div style={{ marginTop:'24px', fontSize:'0.72rem', color:'#1e293b' }}>
          © 2026 StockSense · Educational Platform · Not SEBI Registered
        </div>
      </section>
    </div>
  );
}