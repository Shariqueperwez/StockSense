/**
 * PaperTrading — Real trading simulation
 * BUY = Long (profit when price goes UP)
 * SELL = Short (profit when price goes DOWN)
 * Every trade has Entry, SL, Target — like a real trader
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import NSE_STOCKS from '../data/nseStocks';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, X, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../api';

const getKeys = (userId) => ({
  trades:  `pt_trades_v4_${userId || 'guest'}`,
  balance: `pt_balance_v4_${userId || 'guest'}`,
});
const INITIAL_CAP  = 1_000_000;

const loadJ = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const saveJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const fmtINR  = (n) => `₹${Number(Math.abs(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtS    = (n) => `${n>=0?'+':'-'}${fmtINR(n)}`;
const fmtPct  = (n) => `${n>=0?'+':''}${Number(n).toFixed(2)}%`;
const uid     = () => Date.now().toString(36)+Math.random().toString(36).slice(2);

function calcPnl(t, lp) {
  const p = lp || t.exitPrice || t.entryPrice;
  return t.direction === 'BUY' ? (p - t.entryPrice)*t.qty : (t.entryPrice - p)*t.qty;
}
function calcPct(t, lp) {
  const inv = t.entryPrice * t.qty;
  return inv > 0 ? (calcPnl(t,lp)/inv)*100 : 0;
}

/* ─── Order Panel ─────────────────────────────────────────────────────────── */
function OrderPanel({ balance, onTrade, currentTradeMode }) {
  const [sym,  setSym]  = useState('');
  const [qty,  setQty]  = useState(100);
  const [dir,  setDir]  = useState('BUY');
  const [sl,   setSl]   = useState('');
  const [tgt,  setTgt]  = useState('');
  const [quote, setQ]   = useState(null);
  const [ql,   setQL]   = useState(false);
  const [sugg, setSugg] = useState([]);
  const [showS,setShowS]= useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [riskPct, setRiskPct] = useState(1);
  const [leverage, setLeverage] = useState(3);
  const [msg,  setMsg]  = useState(null);
  const symRef = useRef(null);
  const msgT   = useRef(null);

  const flash = (text, type='ok') => { setMsg({text,type}); clearTimeout(msgT.current); msgT.current=setTimeout(()=>setMsg(null),3500); };

  useEffect(()=>{ const h=(e)=>{if(symRef.current&&!symRef.current.contains(e.target))setShowS(false);}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[]);

  const fetchQ = async (s) => {
    if (!s) return; setQL(true); setQ(null);
    try { const r=await api.get(`/market/quote/${s.includes('.')?s:s+'.NS'}`); setQ(r.data); } catch{} finally{setQL(false);}
  };

  const price = quote?.price || 0;
  const margin = price * qty; // kept for compatibility

  // Risk calculations
  const slNum  = parseFloat(sl)  || 0;
  const tgtNum = parseFloat(tgt) || 0;
  const riskPerShare   = slNum  ? Math.abs(price - slNum)  : 0;
  const rewardPerShare = tgtNum ? Math.abs(tgtNum - price) : 0;
  const riskAmt  = riskPerShare  * qty;
  const rewardAmt= rewardPerShare* qty;
  const rrRatio  = riskAmt > 0 ? (rewardAmt / riskAmt).toFixed(2) : '—';
  const rrColor  = parseFloat(rrRatio) >= 2 ? '#00ff88' : parseFloat(rrRatio) >= 1 ? '#f59e0b' : '#ff3366';

  // Auto-qty from risk %
  const suggestedQty = slNum && price ? Math.floor((balance * riskPct / 100) / Math.abs(price - slNum)) : 0;

  // Intraday leverage calculations — must be AFTER price & qty are defined
  const isIntraday = currentTradeMode === 'intraday';
  const totalPositionValue = price * qty;
  const actualMarginNeeded = isIntraday ? totalPositionValue / leverage : totalPositionValue;
  const marginRequired = actualMarginNeeded; // what user actually pays
  const canAfford = actualMarginNeeded <= balance && totalPositionValue > 0;

  // SL/Target validation for direction
  const slValid  = slNum  > 0 && (dir==='BUY' ? slNum  < price : slNum  > price);
  const tgtValid = tgtNum > 0 && (dir==='BUY' ? tgtNum > price : tgtNum < price);

  const doTrade = async () => {
    if (!sym||qty<=0) { flash('Enter symbol and quantity','err'); return; }
    setBusy(true);
    try {
      let p = price;
      if (!p) { const r=await api.get(`/market/quote/${sym.includes('.')?sym:sym+'.NS'}`); p=r.data?.price; setQ(r.data); }
      if (!p) throw new Error();
      const actualMargin = isIntraday ? p*qty/leverage : p*qty;
      if (actualMargin > balance) { flash(`Insufficient capital — need ₹${actualMargin.toLocaleString('en-IN',{maximumFractionDigits:0})} but have ₹${balance.toLocaleString('en-IN',{maximumFractionDigits:0})}`,'err'); setBusy(false); return; }
      onTrade({
        id:uid(), symbol:sym.toUpperCase().replace('.NS',''), direction:dir, qty, entryPrice:p,
        stopLoss:slNum||null, target:tgtNum||null, status:'OPEN', enteredAt:new Date().toISOString(),
        note: note.trim() || null, tradeMode: currentTradeMode, leverage: isIntraday ? leverage : 1,
        originalQty: qty,
      }, p*qty);
      flash(`✅ ${dir} ${qty}×${sym.toUpperCase().replace('.NS','')} @ ₹${p.toLocaleString('en-IN')} entered`,'ok');
      setSym(''); setQty(100); setQ(null); setSl(''); setTgt(''); setNote('');
    } catch { flash('Could not fetch price — try again','err'); }
    finally { setBusy(false); }
  };

  const dirColor  = dir==='BUY' ? '#00ff88' : '#ff3366';
  const dirBg     = dir==='BUY' ? 'rgba(0,255,136,0.08)' : 'rgba(255,51,102,0.08)';
  const dirBorder = dir==='BUY' ? 'rgba(0,255,136,0.25)' : 'rgba(255,51,102,0.25)';

  return (
    <div style={{background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:'0.62rem',color:'#334155',textTransform:'uppercase',letterSpacing:'0.15em',fontWeight:'700'}}>NEW TRADE</div>
        {price>0&&<div style={{fontSize:'0.72rem',fontWeight:'800',color:quote?.percent_change>=0?'#00ff88':'#ff3366'}}>{quote?.percent_change>=0?'+':''}{quote?.percent_change?.toFixed(2)}% today</div>}
      </div>

      {/* Symbol */}
      <div>
        <div style={{fontSize:'0.62rem',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'6px'}}>SYMBOL</div>
        <div style={{position:'relative'}} ref={symRef}>
          <input value={sym} onChange={e=>{const v=e.target.value.toUpperCase();setSym(v);if(v.length>0){setSugg(NSE_STOCKS.filter(s=>s.symbol.startsWith(v)||s.name.toLowerCase().includes(v.toLowerCase())).slice(0,6));setShowS(true);}else{setShowS(false);setQ(null);}}}
            onBlur={()=>{if(sym)fetchQ(sym);}} placeholder="TCS, RELIANCE..."
            style={{width:'100%',padding:'10px 12px',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',color:'#00d4ff',fontSize:'1rem',fontFamily:'monospace',fontWeight:'800',boxSizing:'border-box',letterSpacing:'0.06em'}}/>
          {showS&&sugg.length>0&&(
            <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#0a0f1a',border:'1px solid rgba(0,212,255,0.2)',borderRadius:'8px',zIndex:200,overflow:'hidden',marginTop:'4px'}}>
              {sugg.map((s,i)=>(
                <div key={i} onMouseDown={()=>{setSym(s.symbol);setShowS(false);fetchQ(s.symbol);}} style={{padding:'8px 12px',cursor:'pointer',display:'flex',justifyContent:'space-between',fontSize:'0.8rem',borderBottom:i<sugg.length-1?'1px solid rgba(255,255,255,0.04)':'none'}} onMouseOver={e=>e.currentTarget.style.background='rgba(0,212,255,0.06)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{fontWeight:'700',color:'#00d4ff',fontFamily:'monospace'}}>{s.symbol}</span>
                  <span style={{color:'#334155',fontSize:'0.7rem'}}>{s.name.slice(0,20)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Live quote */}
        {ql && <div style={{marginTop:'6px',fontSize:'0.7rem',color:'#334155'}}>Fetching price...</div>}
        {quote&&!ql&&(
          <div style={{marginTop:'8px',padding:'10px 12px',background:'rgba(0,0,0,0.4)',borderRadius:'8px',border:'1px solid rgba(0,212,255,0.1)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'2px'}}>
              <span style={{fontSize:'1.4rem',fontWeight:'900',color:'#f0f6ff',fontFamily:'monospace',fontVariantNumeric:'tabular-nums'}}>₹{price.toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
              <span style={{fontSize:'0.82rem',fontWeight:'700',color:quote.percent_change>=0?'#00ff88':'#ff3366'}}>{quote.percent_change>=0?'+':''}{quote.percent_change?.toFixed(2)}%</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px',fontSize:'0.62rem',color:'#334155'}}>
              <span>H ₹{quote.day_high?.toLocaleString('en-IN',{maximumFractionDigits:1})}</span>
              <span style={{textAlign:'right'}}>L ₹{quote.day_low?.toLocaleString('en-IN',{maximumFractionDigits:1})}</span>
              <span>52W H ₹{quote.fifty_two_week_high?.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
              <span style={{textAlign:'right'}}>52W L ₹{quote.fifty_two_week_low?.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
            </div>
          </div>
        )}
      </div>

      {/* Direction */}
      <div>
        <div style={{fontSize:'0.62rem',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'6px'}}>DIRECTION</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
          {[
            {d:'BUY', label:'▲ BUY',  sub:'Profit when price ↑', ac:'rgba(0,255,136,0.5)', bg:'rgba(0,255,136,0.12)', c:'#00ff88'},
            {d:'SELL',label:'▼ SHORT', sub:'Profit when price FALLS ↓', ac:'rgba(255,51,102,0.5)', bg:'rgba(255,51,102,0.12)', c:'#ff3366'},
          ].map(({d,label,sub,ac,bg,c})=>(
            <button key={d} onClick={()=>{setDir(d);setSl('');setTgt('');}} style={{padding:'10px 6px',borderRadius:'9px',border:`1px solid ${dir===d?ac:'rgba(255,255,255,0.07)'}`,background:dir===d?bg:'rgba(0,0,0,0.3)',color:dir===d?c:'#475569',fontWeight:'800',cursor:'pointer',fontSize:'0.88rem',transition:'all 0.15s',lineHeight:'1.4'}}>
              {label}<br/><span style={{fontSize:'0.6rem',fontWeight:'500',opacity:0.75}}>{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <div style={{fontSize:'0.62rem',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'6px'}}>QUANTITY</div>
        <div style={{display:'flex',gap:'4px',marginBottom:'6px',flexWrap:'wrap'}}>
          {[10,50,100,200,500].map(q=>(
            <button key={q} onClick={()=>setQty(q)} style={{padding:'3px 9px',borderRadius:'5px',border:`1px solid ${qty===q?'rgba(0,212,255,0.5)':'rgba(255,255,255,0.07)'}`,background:qty===q?'rgba(0,212,255,0.1)':'rgba(0,0,0,0.3)',color:qty===q?'#00d4ff':'#475569',fontSize:'0.7rem',fontWeight:'700',cursor:'pointer',transition:'all 0.12s'}}>{q}</button>
          ))}
        </div>
        <input type="number" value={qty} min="1" onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} style={{width:'100%',padding:'9px 12px',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',color:'#00d4ff',fontSize:'1rem',fontFamily:'monospace',fontWeight:'800',boxSizing:'border-box'}}/>
        <div style={{fontSize:'0.6rem',color:'#334155',marginTop:'3px'}}>
          💡 Use Position Sizer below (after setting SL) to get the right quantity automatically
        </div>
      </div>

      {/* ── INTRADAY: Leverage panel ── */}
      {currentTradeMode==='intraday'&&(
        <div style={{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'12px',padding:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'0.7rem',color:'#f59e0b',fontWeight:'800',display:'flex',alignItems:'center',gap:'6px'}}>
              ⚡ Leverage
              <span style={{fontSize:'0.58rem',color:'#64748b',fontWeight:'400',background:'rgba(0,0,0,0.3)',padding:'1px 6px',borderRadius:'4px'}}>SEBI max 5x</span>
            </div>
            {leverage>5&&<span style={{fontSize:'0.6rem',color:'#ff3366',fontWeight:'700'}}>⚠️ High risk</span>}
          </div>

          {/* What is leverage — 1 line */}
          <div style={{fontSize:'0.65rem',color:'#475569',lineHeight:'1.5',padding:'6px 10px',background:'rgba(0,0,0,0.2)',borderRadius:'6px',borderLeft:'2px solid rgba(245,158,11,0.3)'}}>
            <strong style={{color:'#f59e0b'}}>What is leverage?</strong> With 5x, you control ₹5 worth of stock for every ₹1 you put in. Profits and losses both multiply by {leverage}x.
          </div>

          {/* Leverage buttons */}
          <div style={{display:'flex',gap:'4px'}}>
            {[1,3,5,8,10].map(l=>(
              <button key={l} onClick={()=>setLeverage(l)}
                style={{flex:1,padding:'7px 0',borderRadius:'6px',border:`1px solid ${leverage===l?l>5?'rgba(255,51,102,0.5)':'rgba(245,158,11,0.5)':'rgba(255,255,255,0.07)'}`,background:leverage===l?l>5?'rgba(255,51,102,0.15)':'rgba(245,158,11,0.15)':'rgba(0,0,0,0.3)',color:leverage===l?l>5?'#ff3366':'#f59e0b':'#475569',fontSize:'0.78rem',fontWeight:'800',cursor:'pointer',transition:'all 0.15s'}}>
                {l}x
              </button>
            ))}
          </div>

          {/* Live margin breakdown */}
          {price>0&&qty>0?(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
              {[
                {label:'You pay',value:`₹${(price*qty/leverage).toLocaleString('en-IN',{maximumFractionDigits:0})}`,color:'#f59e0b',hint:'margin from your account'},
                {label:'Broker adds',value:`₹${(price*qty*(leverage-1)/leverage).toLocaleString('en-IN',{maximumFractionDigits:0})}`,color:'#94a3b8',hint:'broker funds'},
                {label:'You control',value:`₹${(price*qty).toLocaleString('en-IN',{maximumFractionDigits:0})}`,color:'#f0f6ff',hint:'total position size'},
              ].map(({label,value,color,hint})=>(
                <div key={label} style={{padding:'7px 8px',background:'rgba(0,0,0,0.3)',borderRadius:'7px',textAlign:'center'}}>
                  <div style={{fontSize:'0.58rem',color:'#475569',marginBottom:'3px'}}>{label}</div>
                  <div style={{fontSize:'0.78rem',fontWeight:'800',color,fontFamily:'monospace'}}>{value}</div>
                  <div style={{fontSize:'0.55rem',color:'#334155',marginTop:'2px'}}>{hint}</div>
                </div>
              ))}
            </div>
          ):(
            <div style={{fontSize:'0.65rem',color:'#334155',textAlign:'center'}}>Select a stock to see margin breakdown</div>
          )}

          {/* Benefit + risk */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',fontSize:'0.62rem'}}>
            <div style={{padding:'6px 8px',background:'rgba(0,255,136,0.04)',borderRadius:'6px',borderLeft:'2px solid rgba(0,255,136,0.3)'}}>
              <div style={{color:'#00ff88',fontWeight:'700',marginBottom:'2px'}}>✅ Benefit</div>
              <div style={{color:'#475569',lineHeight:'1.4'}}>Trade bigger positions with less capital. A 1% price move = {leverage}% profit on your money.</div>
            </div>
            <div style={{padding:'6px 8px',background:'rgba(255,51,102,0.04)',borderRadius:'6px',borderLeft:'2px solid rgba(255,51,102,0.3)'}}>
              <div style={{color:'#ff3366',fontWeight:'700',marginBottom:'2px'}}>⚠️ Risk</div>
              <div style={{color:'#475569',lineHeight:'1.4'}}>Losses also multiply {leverage}x. Always use Stop Loss. Must exit by 3:15 PM.</div>
            </div>
          </div>
        </div>
      )}

      {/* Swing info — compact */}
      {currentTradeMode==='swing'&&price>0&&qty>0&&(
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'8px'}}>
          <span style={{fontSize:'0.68rem',color:'#60a5fa'}}>🔄 Swing · Full cash · Hold 2–7 days</span>
          <span style={{fontWeight:'800',color:'#60a5fa',fontFamily:'monospace',fontSize:'0.82rem'}}>₹{(price*qty).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
        </div>
      )}

      {/* SL + Target */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
        <div>
          <div style={{fontSize:'0.62rem',color:'#ff3366',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'6px',display:'flex',justifyContent:'space-between'}}>
            <span>STOP LOSS ₹</span>
            {slNum>0&&!slValid&&<span style={{color:'#f59e0b',fontSize:'0.58rem'}}>⚠ wrong side</span>}
            {slValid&&<span style={{color:'#00ff88',fontSize:'0.58rem'}}>✓</span>}
          </div>
          {/* Quick SL presets */}
          {price>0&&(
            <div style={{display:'flex',gap:'3px',marginBottom:'5px'}}>
              {(currentTradeMode==='intraday'?[0.3,0.5,0.7,1]:[1,1.5,2,3]).map(pct=>(
                <button key={pct} onClick={()=>setSl((dir==='BUY'?price*(1-pct/100):price*(1+pct/100)).toFixed(1))}
                  style={{flex:1,padding:'2px 0',borderRadius:'4px',border:'1px solid rgba(255,51,102,0.2)',background:'rgba(255,51,102,0.05)',color:'#ff3366',fontSize:'0.58rem',fontWeight:'700',cursor:'pointer'}}>
                  {pct}%
                </button>
              ))}
            </div>
          )}
          <input type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder={price?(dir==='BUY'?(price*0.97).toFixed(1):(price*1.03).toFixed(1)):'e.g. 2150'}
            style={{width:'100%',padding:'9px 10px',background:'rgba(255,51,102,0.05)',border:`1px solid ${sl?(slValid?'rgba(0,255,136,0.3)':'rgba(255,51,102,0.3)'):'rgba(255,255,255,0.08)'}`,borderRadius:'9px',color:'#f0f6ff',fontSize:'0.9rem',fontFamily:'monospace',boxSizing:'border-box'}}/>
          {price>0&&sl&&slValid&&<div style={{fontSize:'0.62rem',color:'#ff3366',marginTop:'3px'}}>Risk: {fmtINR(riskAmt)}</div>}
        </div>
        <div>
          <div style={{fontSize:'0.62rem',color:'#00ff88',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'6px',display:'flex',justifyContent:'space-between'}}>
            <span>TARGET ₹</span>
            {tgtNum>0&&!tgtValid&&<span style={{color:'#f59e0b',fontSize:'0.58rem'}}>⚠ wrong side</span>}
            {tgtValid&&<span style={{color:'#00ff88',fontSize:'0.58rem'}}>✓</span>}
          </div>
          {/* Quick Target presets */}
          {price>0&&(
            <div style={{display:'flex',gap:'3px',marginBottom:'5px'}}>
              {(currentTradeMode==='intraday'?[0.5,0.8,1,1.5]:[2,3,5,7]).map(pct=>(
                <button key={pct} onClick={()=>setTgt((dir==='BUY'?price*(1+pct/100):price*(1-pct/100)).toFixed(1))}
                  style={{flex:1,padding:'2px 0',borderRadius:'4px',border:'1px solid rgba(0,255,136,0.2)',background:'rgba(0,255,136,0.04)',color:'#00ff88',fontSize:'0.58rem',fontWeight:'700',cursor:'pointer'}}>
                  {pct}%
                </button>
              ))}
            </div>
          )}
          <input type="number" value={tgt} onChange={e=>setTgt(e.target.value)} placeholder={price?(dir==='BUY'?(price*1.05).toFixed(1):(price*0.95).toFixed(1)):'e.g. 2400'}
            style={{width:'100%',padding:'9px 10px',background:'rgba(0,255,136,0.03)',border:`1px solid ${tgt?(tgtValid?'rgba(0,255,136,0.3)':'rgba(255,51,102,0.3)'):'rgba(255,255,255,0.08)'}`,borderRadius:'9px',color:'#f0f6ff',fontSize:'0.9rem',fontFamily:'monospace',boxSizing:'border-box'}}/>
          {price>0&&tgt&&tgtValid&&<div style={{fontSize:'0.62rem',color:'#00ff88',marginTop:'3px'}}>Reward: {fmtINR(rewardAmt)}</div>}
        </div>
      </div>

      {/* Risk:Reward */}
      {slValid&&tgtValid&&(
        <div style={{padding:'10px 14px',background:'rgba(0,0,0,0.3)',border:`1px solid ${parseFloat(rrRatio)>=2?'rgba(0,255,136,0.2)':parseFloat(rrRatio)>=1?'rgba(245,158,11,0.2)':'rgba(255,51,102,0.2)'}`,borderRadius:'10px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px',textAlign:'center'}}>
            <div>
              <div style={{fontSize:'0.58rem',color:'#334155',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'3px'}}>RISK</div>
              <div style={{fontWeight:'800',color:'#ff3366',fontSize:'0.88rem',fontVariantNumeric:'tabular-nums'}}>{fmtINR(riskAmt)}</div>
            </div>
            <div style={{borderLeft:'1px solid rgba(255,255,255,0.05)',borderRight:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{fontSize:'0.58rem',color:'#334155',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'3px'}}>R:R RATIO</div>
              <div style={{fontWeight:'900',color:rrColor,fontSize:'1.1rem'}}>1:{rrRatio}</div>
            </div>
            <div>
              <div style={{fontSize:'0.58rem',color:'#334155',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'3px'}}>REWARD</div>
              <div style={{fontWeight:'800',color:'#00ff88',fontSize:'0.88rem',fontVariantNumeric:'tabular-nums'}}>{fmtINR(rewardAmt)}</div>
            </div>
          </div>
          <div style={{marginTop:'8px',fontSize:'0.65rem',color:parseFloat(rrRatio)>=2?'#00ff88':parseFloat(rrRatio)>=1?'#f59e0b':'#ff3366',textAlign:'center'}}>
            {parseFloat(rrRatio)>=2?'✅ Good trade setup (R:R ≥ 2)':parseFloat(rrRatio)>=1?'⚠️ Acceptable but aim for 1:2+':'❌ Poor setup — reward too small for the risk'}
          </div>
        </div>
      )}

      {/* Risk % position sizer — shows when SL is set */}
      {price>0&&slValid&&(
        <div style={{padding:'12px',background:'rgba(139,92,246,0.05)',border:'1px solid rgba(139,92,246,0.2)',borderRadius:'12px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
            <div style={{fontSize:'0.7rem',color:'#a78bfa',fontWeight:'800'}}>💰 Position Sizer</div>
            <div style={{fontSize:'0.6rem',color:'#64748b'}}>How much of capital to risk?</div>
          </div>
          {/* One line explanation */}
          <div style={{fontSize:'0.62rem',color:'#475569',marginBottom:'8px',padding:'5px 8px',background:'rgba(0,0,0,0.2)',borderRadius:'5px',borderLeft:'2px solid rgba(139,92,246,0.4)'}}>
            Pick a % → it auto-calculates how many shares to {dir==='BUY'?'buy':'short'} so your max loss stays within that amount
          </div>
          {/* % buttons */}
          <div style={{display:'flex',gap:'4px',marginBottom:'10px'}}>
            {[0.5,1,1.5,2,3].map(r=>(
              <button key={r} onClick={()=>{setRiskPct(r);setQty(Math.max(1,Math.floor((balance*r/100)/Math.abs(price-slNum))));}}
                style={{flex:1,padding:'5px 0',borderRadius:'6px',border:`1px solid ${riskPct===r?'rgba(139,92,246,0.5)':'rgba(255,255,255,0.07)'}`,background:riskPct===r?'rgba(139,92,246,0.15)':'rgba(0,0,0,0.3)',color:riskPct===r?'#a78bfa':'#475569',fontSize:'0.72rem',fontWeight:'800',cursor:'pointer'}}>
                {r}%
              </button>
            ))}
          </div>
          {/* Result */}
          {suggestedQty>0&&(()=>{
            const totalCost = suggestedQty * price;
            const affordable = totalCost <= balance;
            const cappedQty = affordable ? suggestedQty : Math.floor(balance / price);
            const actualLoss = Math.abs(price - slNum) * cappedQty;
            return (
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
                  <div style={{padding:'7px',background:'rgba(0,0,0,0.3)',borderRadius:'7px',textAlign:'center'}}>
                    <div style={{fontSize:'0.58rem',color:'#475569',marginBottom:'2px'}}>Shares to {dir==='BUY'?'Buy':'Short'}</div>
                    <div style={{fontWeight:'900',color:'#a78bfa',fontSize:'1rem'}}>{cappedQty}</div>
                    {!affordable&&<div style={{fontSize:'0.55rem',color:'#f59e0b',marginTop:'1px'}}>capped by capital</div>}
                  </div>
                  <div style={{padding:'7px',background:'rgba(0,0,0,0.3)',borderRadius:'7px',textAlign:'center'}}>
                    <div style={{fontSize:'0.58rem',color:'#475569',marginBottom:'2px'}}>Capital Needed</div>
                    <div style={{fontWeight:'800',color:affordable?'#00d4ff':'#ff3366',fontSize:'0.75rem'}}>₹{(cappedQty*price).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                    <div style={{fontSize:'0.55rem',color:affordable?'#334155':'#ff3366',marginTop:'1px'}}>{affordable?'✓ affordable':'! over budget'}</div>
                  </div>
                  <div style={{padding:'7px',background:'rgba(0,0,0,0.3)',borderRadius:'7px',textAlign:'center'}}>
                    <div style={{fontSize:'0.58rem',color:'#475569',marginBottom:'2px'}}>Max Loss</div>
                    <div style={{fontWeight:'800',color:'#ff3366',fontSize:'0.75rem'}}>₹{actualLoss.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                    <div style={{fontSize:'0.55rem',color:'#334155',marginTop:'1px'}}>{riskPct}% of capital</div>
                  </div>
                </div>
                {/* Apply button */}
                <button onClick={()=>setQty(cappedQty)}
                  style={{width:'100%',padding:'6px',borderRadius:'7px',border:'1px solid rgba(139,92,246,0.3)',background:'rgba(139,92,246,0.1)',color:'#a78bfa',fontSize:'0.72rem',fontWeight:'700',cursor:'pointer'}}>
                  ✓ Apply {cappedQty} shares to quantity
                </button>
              </div>
            );
          })()}
        </div>
      )}
      {price>0&&!slValid&&(
        <div style={{fontSize:'0.65rem',color:'#334155',textAlign:'center',padding:'6px',background:'rgba(139,92,246,0.03)',borderRadius:'8px',border:'1px solid rgba(139,92,246,0.1)'}}>
          💰 Set a Stop Loss above to unlock Position Sizer
        </div>
      )}

      {/* Trade note */}
      <div>
        <div style={{fontSize:'0.62rem',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'6px'}}>TRADE NOTE <span style={{color:'#334155',textTransform:'none',letterSpacing:'0'}}>(optional — setup, reason)</span></div>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Breakout retest, volume surge..."
          style={{width:'100%',padding:'8px 12px',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#94a3b8',fontSize:'0.8rem',boxSizing:'border-box'}}/>
      </div>

      {/* ── Trade Summary Card — appears when trade is ready ── */}
      {price>0&&slValid&&tgtValid&&(
        <div style={{background:'rgba(0,0,0,0.3)',border:`1px solid ${dir==='BUY'?'rgba(0,255,136,0.2)':'rgba(255,51,102,0.2)'}`,borderRadius:'12px',padding:'14px',display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={{fontSize:'0.68rem',fontWeight:'800',color:dir==='BUY'?'#00ff88':'#ff3366',textTransform:'uppercase',letterSpacing:'0.1em'}}>
            {dir==='BUY'?'▲ BUY Trade Summary':'▼ SHORT Trade Summary'}
          </div>

          {/* Level visual */}
          <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
            {(dir==='BUY' ? [
              {label:'🚀 Target',  val:tgtNum, color:'#00ff88', pct:`+${((tgtNum-price)/price*100).toFixed(1)}%`},
              {label:'📍 Entry',   val:price,  color:'#00d4ff', pct:'current'},
              {label:'🛑 Stop Loss',val:slNum,  color:'#ff3366', pct:`-${((price-slNum)/price*100).toFixed(1)}%`},
            ] : [
              {label:'🛑 Stop Loss',val:slNum,  color:'#ff3366', pct:`+${((slNum-price)/price*100).toFixed(1)}%`},
              {label:'📍 Entry',   val:price,  color:'#00d4ff', pct:'current'},
              {label:'🚀 Target',  val:tgtNum, color:'#00ff88', pct:`-${((price-tgtNum)/price*100).toFixed(1)}%`},
            ]).map(({label,val,color,pct})=>(
              <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px',borderLeft:`3px solid ${color}`}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{fontSize:'0.72rem',color:'#64748b'}}>{label}</span>
                  <span style={{fontSize:'0.62rem',color,background:`${color}15`,padding:'1px 6px',borderRadius:'4px',fontWeight:'700'}}>{pct}</span>
                </div>
                <span style={{fontWeight:'800',fontFamily:'monospace',color,fontSize:'0.9rem'}}>₹{val?.toLocaleString('en-IN',{maximumFractionDigits:1})}</span>
              </div>
            ))}
          </div>

          {/* Step by step */}
          <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'10px'}}>
            <div style={{fontSize:'0.62rem',color:'#475569',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'8px'}}>What to do after entering</div>
            {[
              {n:'1',text:`Enter ${dir==='BUY'?'BUY':'SHORT'} @ ₹${price.toLocaleString('en-IN',{maximumFractionDigits:1})} — set SL at ₹${slNum} immediately`,c:'#00d4ff'},
              {n:'2',text:`When price hits ₹${tgtNum} (Target) → exit ${Math.floor(qty/2)} shares, move SL to entry ₹${price.toFixed(1)}`,c:'#00ff88'},
              {n:'3',text:`Trail remaining ${qty-Math.floor(qty/2)} shares with SL 1-2% behind each new ${dir==='BUY'?'high':'low'}`,c:'#00ff88'},
              {n:'!',text:`If price hits ₹${slNum} → EXIT all ${qty} shares immediately. No averaging.`,c:'#ff3366'},
            ].map(({n,text,c})=>(
              <div key={n} style={{display:'flex',gap:'8px',alignItems:'flex-start',marginBottom:'6px'}}>
                <div style={{width:'18px',height:'18px',borderRadius:'50%',background:`${c}18`,border:`1px solid ${c}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem',fontWeight:'900',color:c,flexShrink:0,marginTop:'1px'}}>{n}</div>
                <span style={{fontSize:'0.72rem',color:'#94a3b8',lineHeight:'1.5'}}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Margin info */}
      {price>0&&(
        <div style={{padding:'9px 12px',background:canAfford?'rgba(0,212,255,0.04)':'rgba(255,51,102,0.05)',border:`1px solid ${canAfford?'rgba(0,212,255,0.1)':'rgba(255,51,102,0.2)'}`,borderRadius:'8px',fontSize:'0.7rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'#334155'}}>{isIntraday?`Margin (${leverage}x leverage)`:'Capital required'}</span>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:'800',color:canAfford?'#00d4ff':'#ff3366',fontFamily:'monospace'}}>{fmtINR(actualMarginNeeded)}</div>
            {isIntraday&&<div style={{fontSize:'0.6rem',color:'#475569',marginTop:'1px'}}>Total position: {fmtINR(totalPositionValue)}</div>}
            {!canAfford&&<div style={{fontSize:'0.6rem',color:'#ff3366'}}>Exceeds available ₹{balance.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>}
          </div>
        </div>
      )}

      {/* Message */}
      {msg&&<div style={{padding:'9px 12px',borderRadius:'8px',fontSize:'0.78rem',fontWeight:'600',background:msg.type==='ok'?'rgba(0,255,136,0.08)':'rgba(255,51,102,0.08)',color:msg.type==='ok'?'#00ff88':'#ff3366',border:`1px solid ${msg.type==='ok'?'rgba(0,255,136,0.2)':'rgba(255,51,102,0.2)'}`}}>{msg.text}</div>}

      {/* Execute button */}
      <button onClick={doTrade} disabled={busy||!canAfford||!price}
        style={{padding:'14px',borderRadius:'11px',border:'none',background:!price||!canAfford?'rgba(30,41,59,1)':dir==='BUY'?'linear-gradient(135deg,#00c853,#007a33)':'linear-gradient(135deg,#f50057,#9b0037)',color:!price||!canAfford?'#475569':'white',fontWeight:'900',fontSize:'1rem',cursor:busy||!canAfford||!price?'not-allowed':'pointer',letterSpacing:'0.08em',boxShadow:!price||!canAfford?'none':dir==='BUY'?'0 4px 20px rgba(0,200,83,0.25)':'0 4px 20px rgba(245,0,87,0.25)',transition:'all 0.15s'}}>
        {busy?'...' : !price ? 'Select symbol first' : dir==='BUY' ? `▲ BUY ${qty} shares` : `▼ SHORT ${qty} shares`}
      </button>


    </div>
  );
}

/* ─── Exit Modal ─────────────────────────────────────────────────────────── */
function ExitModal({ trade, onClose, onExit, livePrice }) {
  const [exitPrice, setEP] = useState('');
  const [fetching,  setF]  = useState(false);
  const [ticking,   setTicking] = useState(true);
  const [exitQty,   setExitQty] = useState(trade.qty);
  const [exitMode,  setExitMode] = useState('full'); // 'full' | 'partial'

  // Seed with already-ticking live price immediately
  useEffect(()=>{
    if (livePrice && exitPrice === '') {
      setEP(livePrice.toFixed(2));
    }
  }, [livePrice]);

  // Keep updating exit price with live tick (unless user has manually edited)
  useEffect(()=>{
    if (!ticking) return;
    if (livePrice) setEP(livePrice.toFixed(2));
  }, [livePrice, ticking]);

  const ep  = parseFloat(exitPrice)||0;
  const actualQty = exitMode === 'partial' ? Math.min(exitQty, trade.qty) : trade.qty;
  const pnl = ep ? (trade.direction==='BUY'?(ep-trade.entryPrice)*actualQty:(trade.entryPrice-ep)*actualQty) : 0;
  const pct = ep && trade.entryPrice ? ((Math.abs(ep-trade.entryPrice)/trade.entryPrice)*100).toFixed(2) : 0;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'#0d1626',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'16px',width:'100%',maxWidth:'420px',overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,0.8)'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center',background:trade.direction==='BUY'?'linear-gradient(135deg,rgba(0,255,136,0.06),transparent)':'linear-gradient(135deg,rgba(255,51,102,0.06),transparent)'}}>
          <div>
            <div style={{fontWeight:'800',color:'#f0f6ff',fontSize:'1rem'}}>{trade.symbol} — Close Position</div>
            <div style={{fontSize:'0.7rem',color:'#475569',marginTop:'2px'}}>
              {trade.direction} {trade.qty} shares · Entry ₹{trade.entryPrice?.toLocaleString('en-IN',{maximumFractionDigits:2})}
              {trade.stopLoss&&` · SL ₹${trade.stopLoss}`}
              {trade.target&&` · Target ₹${trade.target}`}
            </div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'#475569',cursor:'pointer'}}><X size={16}/></button>
        </div>
        <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'14px'}}>
          {/* Exit mode selector */}
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            <div style={{fontSize:'0.68rem',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:'700'}}>Exit Type</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
              <button onClick={()=>{setExitMode('full');setExitQty(trade.qty);}}
                style={{padding:'8px',borderRadius:'8px',border:`1px solid ${exitMode==='full'?'rgba(0,212,255,0.4)':'rgba(255,255,255,0.08)'}`,background:exitMode==='full'?'rgba(0,212,255,0.08)':'transparent',color:exitMode==='full'?'#00d4ff':'#64748b',fontWeight:'700',fontSize:'0.78rem',cursor:'pointer'}}>
                🔚 Full Exit<br/><span style={{fontSize:'0.65rem',fontWeight:'400',opacity:0.7}}>Close all {trade.qty} shares</span>
              </button>
              <button onClick={()=>setExitMode('partial')}
                style={{padding:'8px',borderRadius:'8px',border:`1px solid ${exitMode==='partial'?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.08)'}`,background:exitMode==='partial'?'rgba(245,158,11,0.08)':'transparent',color:exitMode==='partial'?'#f59e0b':'#64748b',fontWeight:'700',fontSize:'0.78rem',cursor:'pointer'}}>
                📊 Partial Exit<br/><span style={{fontSize:'0.65rem',fontWeight:'400',opacity:0.7}}>Close some shares</span>
              </button>
            </div>
            {exitMode==='partial'&&(
              <div>
                <div style={{fontSize:'0.68rem',color:'#f59e0b',marginBottom:'6px',fontWeight:'600'}}>How many shares to exit? (max {trade.qty})</div>
                <div style={{display:'flex',gap:'4px',marginBottom:'6px',flexWrap:'wrap'}}>
                  {[
                    {label:'25%',qty:Math.floor(trade.qty*0.25)},
                    {label:'50%',qty:Math.floor(trade.qty*0.5)},
                    {label:'75%',qty:Math.floor(trade.qty*0.75)},
                    {label:'All',qty:trade.qty},
                  ].map(({label,qty})=>(
                    <button key={label} onClick={()=>setExitQty(qty)}
                      style={{padding:'4px 12px',borderRadius:'6px',border:`1px solid ${exitQty===qty?'rgba(245,158,11,0.5)':'rgba(255,255,255,0.08)'}`,background:exitQty===qty?'rgba(245,158,11,0.15)':'rgba(0,0,0,0.3)',color:exitQty===qty?'#f59e0b':'#64748b',fontSize:'0.72rem',fontWeight:'700',cursor:'pointer'}}>
                      {label} ({qty})
                    </button>
                  ))}
                </div>
                <input type="number" value={exitQty} min={1} max={trade.qty}
                  onChange={e=>setExitQty(Math.min(trade.qty,Math.max(1,parseInt(e.target.value)||1)))}
                  style={{width:'100%',padding:'7px 10px',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'7px',color:'#f59e0b',fontSize:'0.9rem',fontFamily:'monospace',fontWeight:'700',boxSizing:'border-box'}}/>
                <div style={{fontSize:'0.65rem',color:'#64748b',marginTop:'4px'}}>
                  After exit: {trade.qty-exitQty} shares remain open · SL and Target still active
                </div>
              </div>
            )}
          </div>

          {trade.direction==='SELL'&&(
            <div style={{padding:'10px 14px',background:'rgba(255,51,102,0.06)',border:'1px solid rgba(255,51,102,0.2)',borderRadius:'8px',fontSize:'0.75rem',color:'#94a3b8',lineHeight:'1.5'}}>
              <span style={{color:'#ff3366',fontWeight:'700'}}>SHORT trade</span> — You profit when price <strong style={{color:'#ff3366'}}>FALLS below ₹{trade.entryPrice}</strong>. You lose when price rises above it.
            </div>
          )}
          <div>
            <label style={{fontSize:'0.68rem',color:'#475569',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.1em'}}>Exit Price ₹ {ticking ? <span style={{color:'#00ff88',fontWeight:'700'}}>● LIVE TICKING</span> : '(manually edited)'}</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'8px'}}>
              <input type="number" value={exitPrice}
                onChange={e=>{setTicking(false);setEP(e.target.value);}}
                placeholder="Current market price"
                style={{padding:'10px 12px',background:ticking?'rgba(0,255,136,0.04)':'rgba(0,0,0,0.4)',border:`1px solid ${ticking?'rgba(0,255,136,0.2)':'rgba(255,255,255,0.1)'}`,borderRadius:'9px',color:'#f0f6ff',fontSize:'1rem',fontFamily:'monospace',fontWeight:'700',width:'100%',boxSizing:'border-box',transition:'all 0.2s'}}/>
              <button onClick={()=>{
                  if(ticking){setTicking(false);}
                  else{setTicking(true);}
                }}
                style={{padding:'10px 12px',background:ticking?'rgba(0,255,136,0.1)':'rgba(59,130,246,0.1)',border:`1px solid ${ticking?'rgba(0,255,136,0.3)':'rgba(59,130,246,0.3)'}`,borderRadius:'9px',color:ticking?'#00ff88':'#60a5fa',cursor:'pointer',fontSize:'0.75rem',whiteSpace:'nowrap',fontWeight:'700'}}>
                {ticking ? '⚡ Live' : '✏️ Edit'}
              </button>
            </div>
          </div>

          {ep>0&&(
            <div style={{padding:'16px',background:pnl>=0?'rgba(0,255,136,0.06)':'rgba(255,51,102,0.06)',border:`1px solid ${pnl>=0?'rgba(0,255,136,0.2)':'rgba(255,51,102,0.2)'}`,borderRadius:'12px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'12px'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.58rem',color:'#475569',textTransform:'uppercase',marginBottom:'3px'}}>Entry</div>
                  <div style={{fontWeight:'700',color:'#94a3b8',fontFamily:'monospace',fontSize:'0.88rem'}}>₹{trade.entryPrice?.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
                </div>
                <div style={{textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.05)',borderRight:'1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{fontSize:'0.58rem',color:'#475569',textTransform:'uppercase',marginBottom:'3px'}}>Exit</div>
                  <div style={{fontWeight:'700',color:'#f0f6ff',fontFamily:'monospace',fontSize:'0.88rem'}}>₹{ep.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.58rem',color:'#475569',textTransform:'uppercase',marginBottom:'3px'}}>Price Move</div>
                  <div style={{fontWeight:'700',fontFamily:'monospace',fontSize:'0.88rem',color:(ep-trade.entryPrice)>=0?'#10b981':'#ef4444'}}>
                    {(ep-trade.entryPrice)>=0?'+':''}{(ep-trade.entryPrice).toFixed(2)}
                  </div>
                  <div style={{fontSize:'0.6rem',color:'#475569',marginTop:'2px'}}>{trade.direction==='BUY'?'↑ good for BUY':'↓ good for SHORT'}</div>
                </div>
              </div>
              <div style={{textAlign:'center',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:'0.62rem',color:'#475569',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.1em'}}>REALISED P&L</div>
                <div style={{fontSize:'2rem',fontWeight:'900',color:pnl>=0?'#00ff88':'#ff3366',fontVariantNumeric:'tabular-nums'}}>{fmtS(pnl)}</div>
                <div style={{fontSize:'0.82rem',color:pnl>=0?'#00ff88':'#ff3366',fontWeight:'700'}}>{fmtPct(pct)}</div>
                <div style={{fontSize:'0.65rem',color:'#475569',marginTop:'6px',lineHeight:'1.5',textAlign:'center'}}>
                  {trade.direction==='BUY'
                    ? ep>trade.entryPrice
                      ? `Price rose ₹${(ep-trade.entryPrice).toFixed(2)} × ${trade.qty} shares = profit`
                      : `Price fell ₹${(trade.entryPrice-ep).toFixed(2)} × ${trade.qty} shares = loss`
                    : ep<trade.entryPrice
                      ? `Price fell ₹${(trade.entryPrice-ep).toFixed(2)} × ${trade.qty} shares = profit (SHORT wins when price falls)`
                      : `Price rose ₹${(ep-trade.entryPrice).toFixed(2)} × ${trade.qty} shares = loss (SHORT loses when price rises)`
                  }
                </div>
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:'10px'}}>
            <button onClick={()=>ep>0&&onExit(ep, exitMode==='partial'?actualQty:null)} disabled={!ep||ep<=0}
              style={{flex:1,padding:'12px',background:ep>0?(pnl>=0?'linear-gradient(135deg,#00c853,#007a33)':'linear-gradient(135deg,#f50057,#9b0037)'):'#1e293b',border:'none',borderRadius:'10px',color:ep>0?'white':'#475569',fontWeight:'800',cursor:ep>0?'pointer':'not-allowed',fontSize:'0.9rem',letterSpacing:'0.03em'}}>
              {ep>0?(pnl>=0
                ? `✅ Book Profit ${fmtS(pnl)}${exitMode==='partial'?' ('+actualQty+' shares)':''}`
                : `❌ Cut Loss ${fmtS(pnl)}${exitMode==='partial'?' ('+actualQty+' shares)':''}`)
                :'Enter exit price'}
            </button>
            <button onClick={onClose} style={{padding:'12px 18px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'#475569',cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */

/* ─── Live Ticker Tape ───────────────────────────────────────────────────── */
function TickerTape({ trades, liveP, flash }) {
  const items = trades.filter(t=>t.status==='OPEN').map(t => {
    const lp = liveP[t.symbol] || t.entryPrice;
    const pnl = calcPnl(t, lp);
    const pct = calcPct(t, lp);
    const f = flash[t.symbol];
    return { ...t, lp, pnl, pct, flash: f };
  });
  if (!items.length) return null;

  const doubled = [...items, ...items]; // duplicate for seamless loop

  return (
    <div style={{ overflow:'hidden', background:'rgba(0,0,0,0.5)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'7px 0', marginBottom:'14px', borderRadius:'8px' }}>
      <div style={{ display:'flex', gap:'32px', animation:'tickerScroll 20s linear infinite', width:'max-content' }}>
        {doubled.map((t, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', whiteSpace:'nowrap', padding:'0 8px' }}>
            <span style={{ fontWeight:'800', fontFamily:'monospace', fontSize:'0.8rem', color:'#f0f6ff' }}>{t.symbol}</span>
            <span style={{
              fontFamily:'monospace', fontWeight:'700', fontSize:'0.85rem',
              color: t.flash==='up'
                ? (t.direction==='BUY' ? '#00ff88' : '#ff3366')
                : t.flash==='down'
                  ? (t.direction==='BUY' ? '#ff3366' : '#00ff88')
                  : '#00d4ff',
              transition: 'color 0.3s',
              textShadow: t.flash==='up' ? '0 0 8px rgba(0,255,136,0.6)' : t.flash==='down' ? '0 0 8px rgba(255,51,102,0.6)' : 'none',
            }}>
              ₹{t.lp.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </span>
            <span style={{ fontSize:'0.72rem', fontWeight:'700', color: t.flash==='up'?'#00ff88': t.flash==='down'?'#ff3366': t.pnl>=0?'#00ff88':'#ff3366' }}>
              {t.pnl>=0?'+':''}{t.pct.toFixed(2)}%
            </span>
            <span style={{ fontSize:'0.65rem', color:'#1e293b' }}>|</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaperTrading({ user }) {
  const userId = user?.id || user?.email || null;
  const KEYS = getKeys(userId);
  const TRADES_KEY = KEYS.trades;
  const BALANCE_KEY = KEYS.balance;
  const [tradeMode, setTradeMode] = useState('swing'); // 'intraday' | 'swing'
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trades,   setTrades]  = useState(()=>loadJ(TRADES_KEY,[]));
  const [balance,  setBalance] = useState(()=>loadJ(BALANCE_KEY,INITIAL_CAP));
  const [liveP,    setLiveP]   = useState({});
  const [prevP,    setPrevP]   = useState({});
  const [flash,    setFlash]   = useState({});
  const [refreshing,setRef]    = useState(false);
  const [tab,      setTab]     = useState('open');
  const [exiting,  setExit]    = useState(null);
  const tickRef = useRef(null);
  const apiRef  = useRef(null);
  const basePriceRef = useRef({});

  /* Auto-refresh live prices + check SL/Target */
  const refreshPrices = useCallback(async () => {
    const open = trades.filter(t=>t.status==='OPEN');
    if (!open.length) return;
    setRef(true);
    const results = {};
    await Promise.all([...new Set(open.map(t=>t.symbol))].map(async(sym)=>{
      try { const r=await api.get(`/market/quote/${sym}.NS`); if(r.data?.price) results[sym]=r.data.price; } catch {}
    }));
    setLiveP(prev=>({...prev,...results}));
    setRef(false);

    // Auto-close trades that hit SL or Target
    setTrades(prev=>{
      let changed=false;
      const updated=prev.map(t=>{
        if(t.status!=='OPEN') return t;
        const lp=results[t.symbol];
        if(!lp) return t;
        // Check SL
        if(t.stopLoss){ const hitSL=t.direction==='BUY'?lp<=t.stopLoss:lp>=t.stopLoss; if(hitSL){ changed=true; const pnl=calcPnl(t,lp); return{...t,status:'CLOSED',exitPrice:lp,pnl,exitedAt:new Date().toISOString(),closedBy:'SL'}; }}
        // Check Target
        if(t.target){ const hitTgt=t.direction==='BUY'?lp>=t.target:lp<=t.target; if(hitTgt){ changed=true; const pnl=calcPnl(t,lp); return{...t,status:'CLOSED',exitPrice:lp,pnl,exitedAt:new Date().toISOString(),closedBy:'TARGET'}; }}
        return t;
      });
      if(changed){
        saveJ(TRADES_KEY,updated);
        // Recalculate balance for auto-closed trades
        let nb=loadJ(BALANCE_KEY,INITIAL_CAP);
        updated.forEach((t,i)=>{
          const old=prev[i];
          if(t.status==='CLOSED'&&old.status==='OPEN'){
            nb+=t.entryPrice*t.qty + (t.pnl||0);
          }
        });
        setBalance(nb); saveJ(BALANCE_KEY,nb);
        return updated;
      }
      return prev;
    });
  },[trades]);

  useEffect(()=>{ refreshPrices(); },[trades.length]);
  useEffect(()=>{ const t=setInterval(()=>setCurrentTime(new Date()),30000); return()=>clearInterval(t); },[]);

  // ── Real-time tick simulation (every 1s) ────────────────────────────────
  useEffect(()=>{
    const tick = () => {
      setLiveP(prev => {
        const open = trades.filter(t=>t.status==='OPEN');
        if (!open.length) return prev;
        const syms = [...new Set(open.map(t=>t.symbol))];
        const next = {...prev};
        const flashes = {};
        syms.forEach(sym => {
          const base = basePriceRef.current[sym] || prev[sym] || 0;
          if (!base) return;
          // Simulate realistic tick: ±0.01% to ±0.08% per second
          const volatility = 0.0008;
          const drift = (Math.random() - 0.49) * volatility; // slight upward bias
          const newPrice = parseFloat((base * (1 + drift)).toFixed(2));
          basePriceRef.current[sym] = newPrice;
          if (prev[sym] !== undefined) {
            flashes[sym] = newPrice >= (prev[sym] || newPrice) ? 'up' : 'down';
          }
          next[sym] = newPrice;
        });
        // Apply flash
        if (Object.keys(flashes).length) {
          setFlash(flashes);
          setTimeout(() => setFlash({}), 400);
        }
        return next;
      });

      // Auto-check SL/Target on each tick
      setTrades(prev => {
        let changed = false;
        const updated = prev.map(t => {
          if (t.status !== 'OPEN') return t;
          const lp = basePriceRef.current[t.symbol];
          if (!lp) return t;
          if (t.stopLoss) { const hit = t.direction==='BUY'?lp<=t.stopLoss:lp>=t.stopLoss; if(hit){ changed=true; const pnl=calcPnl(t,lp); return{...t,status:'CLOSED',exitPrice:lp,pnl,exitedAt:new Date().toISOString(),closedBy:'SL'}; }}
          if (t.target)   { const hit = t.direction==='BUY'?lp>=t.target:lp<=t.target;   if(hit){ changed=true; const pnl=calcPnl(t,lp); return{...t,status:'CLOSED',exitPrice:lp,pnl,exitedAt:new Date().toISOString(),closedBy:'TARGET'}; }}
          return t;
        });
        if (changed) {
          saveJ(TRADES_KEY, updated);
          let nb = loadJ(BALANCE_KEY, INITIAL_CAP);
          updated.forEach((t,i) => { if(t.status==='CLOSED'&&prev[i].status==='OPEN') nb+=t.entryPrice*t.qty+(t.pnl||0); });
          setBalance(nb); saveJ(BALANCE_KEY, nb);
          return updated;
        }
        return prev;
      });
    };

    tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
  }, [trades]);

  // ── Real API sync every 15s to anchor simulated prices to reality ────────
  useEffect(()=>{
    const sync = async () => {
      const open = trades.filter(t=>t.status==='OPEN');
      if (!open.length) return;
      const syms = [...new Set(open.map(t=>t.symbol))];
      await Promise.all(syms.map(async sym => {
        try {
          const r = await api.get(`/market/quote/${sym}.NS`);
          if (r.data?.price) {
            basePriceRef.current[sym] = r.data.price;
            setLiveP(prev => ({...prev, [sym]: r.data.price}));
          }
        } catch {}
      }));
    };
    sync(); // initial load
    apiRef.current = setInterval(sync, 15000);
    return () => clearInterval(apiRef.current);
  }, [trades.length]);

  const openTrade=(trade,fullPositionValue)=>{
    const actualDeduction = trade.leverage && trade.leverage > 1 ? fullPositionValue / trade.leverage : fullPositionValue;
    const nb=balance-actualDeduction;
    const nt=[trade,...trades];
    setTrades(nt); saveJ(TRADES_KEY,nt);
    setBalance(nb); saveJ(BALANCE_KEY,nb);
  };

  const closeTrade=(id,ep,partialQty=null)=>{
    const t=trades.find(x=>x.id===id); if(!t) return;
    const exitQty = partialQty && partialQty < t.qty ? partialQty : t.qty;
    const isPartial = exitQty < t.qty;
    const pnl = t.direction==='BUY' ? (ep-t.entryPrice)*exitQty : (t.entryPrice-ep)*exitQty;
    // Return only the margin actually paid (not full leveraged position value)
    const lev = t.leverage && t.leverage > 1 ? t.leverage : 1;
    const capitalReturned = (t.entryPrice * exitQty) / lev;
    const nb = balance + capitalReturned + pnl;

    let nt;
    if (isPartial) {
      // Split trade: reduce qty of original, add a closed record
      const remainingQty = t.qty - exitQty;
      const closedPart = {...t, id:uid(), qty:exitQty, status:'CLOSED', exitPrice:ep, pnl, exitedAt:new Date().toISOString(), note:(t.note?t.note+' ':'')+`Partial exit (${exitQty}/${t.qty})` };
      nt = trades.map(x=>x.id!==id?x:{...x, qty:remainingQty, originalQty:t.originalQty||t.qty, entryPrice:t.entryPrice});
      nt = [...nt, closedPart];
    } else {
      const pnlFull=calcPnl(t,ep);
      nt=trades.map(x=>x.id!==id?x:{...x,status:'CLOSED',exitPrice:ep,pnl:pnlFull,exitedAt:new Date().toISOString()});
    }
    setTrades(nt); saveJ(TRADES_KEY,nt);
    setBalance(nb); saveJ(BALANCE_KEY,nb);
    setExit(null);
  };

  const deleteTrade=(id)=>{
    const t=trades.find(x=>x.id===id); if(!t) return;
    let nb=balance;
    if(t.status==='OPEN') {
      const lev = t.leverage && t.leverage > 1 ? t.leverage : 1;
      nb += (t.entryPrice * t.qty) / lev; // return only the margin paid
    }
    const nt=trades.filter(x=>x.id!==id);
    setTrades(nt); saveJ(TRADES_KEY,nt);
    setBalance(nb); saveJ(BALANCE_KEY,nb);
  };

  const reset=()=>{ if(!window.confirm('Reset all trades and restore ₹10L?')) return; setTrades([]); saveJ(TRADES_KEY,[]); setBalance(INITIAL_CAP); saveJ(BALANCE_KEY,INITIAL_CAP); setLiveP({}); };

  // Stats
  // Filter by current trade mode — intraday sees intraday, swing sees swing
  const modeFilter = t => {
    if (tradeMode === 'intraday') return t.tradeMode === 'intraday';
    if (tradeMode === 'swing')    return t.tradeMode === 'swing' || !t.tradeMode; // old trades default to swing
    return true;
  };
  const openTrades   = trades.filter(t=>t.status==='OPEN' && modeFilter(t));
  const closedTrades = trades.filter(t=>t.status==='CLOSED' && modeFilter(t));
  const allOpenTrades = trades.filter(t=>t.status==='OPEN'); // for ticker tape
  const openPnL      = openTrades.reduce((s,t)=>s+calcPnl(t,liveP[t.symbol]||t.entryPrice),0);
  const realisedPnL  = closedTrades.reduce((s,t)=>s+(t.pnl||0),0);
  const wins         = closedTrades.filter(t=>(t.pnl||0)>0);
  const losses       = closedTrades.filter(t=>(t.pnl||0)<=0);
  const winRate      = closedTrades.length?((wins.length/closedTrades.length)*100).toFixed(0):'—';
  const avgWin       = wins.length?wins.reduce((s,t)=>s+t.pnl,0)/wins.length:0;
  const avgLoss      = losses.length?losses.reduce((s,t)=>s+t.pnl,0)/losses.length:0;
  const rr           = avgLoss?Math.abs(avgWin/avgLoss).toFixed(2):'—';

  // P&L chart
  const chartData = useMemo(()=>[...closedTrades].reverse().map((t,i,arr)=>({
    trade:i+1, cumPnl:arr.slice(0,i+1).reduce((s,x)=>s+(x.pnl||0),0), pnl:t.pnl||0, sym:t.symbol
  })),[closedTrades]);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',paddingBottom:'14px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#00d4ff',boxShadow:'0 0 8px #00d4ff'}}/>
          <div>
            <div style={{fontSize:'1rem',fontWeight:'900',color:'#f0f6ff',letterSpacing:'-0.3px'}}>PAPER TERMINAL <span style={{fontSize:'0.6rem',color:'#00d4ff',letterSpacing:'0.2em',marginLeft:'6px'}}>SIM</span></div>
            <div style={{fontSize:'0.7rem',color:'#334155'}}>Enter & exit trades · BUY long or SHORT · Virtual ₹10L · Real NSE prices</div>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={refreshPrices} disabled={refreshing} style={{padding:'6px 14px',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#64748b',fontSize:'0.75rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
            <RefreshCw size={12} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/> Refresh
          </button>
          <button onClick={reset} style={{padding:'6px 14px',background:'rgba(255,51,102,0.06)',border:'1px solid rgba(255,51,102,0.2)',borderRadius:'8px',color:'#ff3366',fontSize:'0.75rem',cursor:'pointer'}}>Reset</button>
        </div>
      </div>

      {/* ── Intraday / Swing Mode Switcher ── */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px',padding:'12px 16px',background:'rgba(0,0,0,0.3)',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.06)',flexWrap:'wrap'}}>
        <span style={{fontSize:'0.72rem',color:'#64748b',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em'}}>Trade Mode:</span>
        <div style={{display:'flex',gap:'4px',background:'rgba(0,0,0,0.4)',borderRadius:'8px',padding:'3px'}}>
          {[
            {id:'intraday',label:'⚡ Intraday',desc:'Same day · Leverage 3-5x',color:'#f59e0b'},
            {id:'swing',   label:'🔄 Swing',   desc:'2–7 days · No leverage', color:'#3b82f6'},
          ].map(({id,label,desc,color})=>(
            <button key={id} onClick={()=>setTradeMode(id)}
              style={{padding:'7px 16px',borderRadius:'6px',border:'none',background:tradeMode===id?`${color}20`:'transparent',color:tradeMode===id?color:'#64748b',fontWeight:'700',fontSize:'0.78rem',cursor:'pointer',transition:'all 0.15s'}}>
              {label}
            </button>
          ))}
        </div>
        {tradeMode==='intraday'&&(
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'auto',flexWrap:'wrap',gap:'8px'}}>
            <div style={{fontSize:'0.72rem',color:'#f59e0b',fontWeight:'600'}}>
              {currentTime.getHours()>=15&&currentTime.getMinutes()>=15
                ? '⛔ Market closed — intraday positions auto-squared'
                : currentTime.getHours()===15&&currentTime.getMinutes()>=0
                  ? '⚠️ Auto square-off in '+(15-currentTime.getMinutes())+'min — exit before 3:15 PM!'
                  : '⚡ Intraday — must exit all positions by 3:15 PM today'}
            </div>
          </div>
        )}
        {tradeMode==='swing'&&(
          <div style={{fontSize:'0.72rem',color:'#3b82f6',marginLeft:'auto'}}>
            🔄 Swing — positions held overnight · No time pressure
          </div>
        )}
      </div>

      {/* Live Ticker Tape */}
      <TickerTape trades={allOpenTrades} liveP={liveP} flash={flash} />

      {/* Stats strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'1px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',overflow:'hidden',marginBottom:'16px'}}>
        {(()=>{
          const totalRiskExposed = openTrades.reduce((s,t)=>s+(t.stopLoss?Math.abs(t.entryPrice-t.stopLoss)*t.qty:(t.entryPrice*t.qty*0.02)),0);
          const riskPct = (totalRiskExposed/INITIAL_CAP*100).toFixed(1);
          const cumPnls = [];let cum=0;[...closedTrades].reverse().forEach(t=>{cum+=(t.pnl||0);cumPnls.push(cum);});
          const maxDD = cumPnls.length?Math.min(0,...cumPnls.map((v,i)=>v-Math.max(...cumPnls.slice(0,i+1)))):0;
          return [
            {label:'CAPITAL',      value:`₹${balance.toLocaleString('en-IN',{maximumFractionDigits:0})}`, color:'#00d4ff', sub:'Available'},
            {label:'OPEN P&L',    value:fmtS(openPnL),    color:openPnL>=0?'#00ff88':'#ff3366',    sub:`${openTrades.length} open`},
            {label:'REALISED P&L',value:fmtS(realisedPnL), color:realisedPnL>=0?'#00ff88':'#ff3366', sub:`${closedTrades.length} closed`},
            {label:'WIN RATE',    value:winRate==='—'?'—':`${winRate}%`,   color:parseInt(winRate)>=50?'#00ff88':'#f59e0b', sub:`${wins.length}W / ${losses.length}L`},
            {label:'RISK EXPOSED', value:openTrades.length?`${riskPct}%`:'—', color:parseFloat(riskPct)>5?'#ff3366':parseFloat(riskPct)>2?'#f59e0b':'#00ff88', sub:`₹${totalRiskExposed.toLocaleString('en-IN',{maximumFractionDigits:0})} at risk`},
            {label:'MAX DRAWDOWN', value:maxDD<0?fmtS(maxDD):'—', color:'#f59e0b', sub:'Worst losing streak'},
          ];
        })().map(s=>(
          <div key={s.label} style={{padding:'12px 14px',background:'rgba(0,0,0,0.5)'}}>
            <div style={{fontSize:'0.58rem',color:'#334155',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'5px'}}>{s.label}</div>
            <div style={{fontSize:'0.95rem',fontWeight:'900',color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
            <div style={{fontSize:'0.6rem',color:'#334155',marginTop:'2px'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:'16px',alignItems:'start'}}>

        {/* Left panel */}
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

          {/* Tabs */}
          <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(0,0,0,0.3)'}}>
              {[{id:'open',label:`OPEN POSITIONS (${openTrades.length})`},{id:'closed',label:`TRADE HISTORY (${closedTrades.length})`}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'12px',background:'transparent',border:'none',borderBottom:`2px solid ${tab===t.id?'#00d4ff':'transparent'}`,color:tab===t.id?'#f0f6ff':'#334155',fontSize:'0.65rem',fontWeight:'700',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.12em',transition:'all 0.15s'}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Open positions */}
            {tab==='open'&&(
              openTrades.length===0
                ? <div style={{padding:'56px',textAlign:'center',color:'#1e293b'}}>
                    <div style={{fontSize:'2rem',marginBottom:'10px',opacity:0.3}}>📊</div>
                    <div style={{fontSize:'0.85rem',fontWeight:'600',color:'#334155',marginBottom:'4px'}}>No open positions</div>
                    <div style={{fontSize:'0.72rem'}}>Enter a BUY or SHORT trade from the panel →</div>
                  </div>
                : <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                    <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(0,0,0,0.2)'}}>
                      {['SYMBOL','DIR','QTY','ENTRY','SL','TARGET','LIVE','P&L','%','ACTION'].map(h=>(
                        <th key={h} style={{padding:'9px 10px',textAlign:h==='SYMBOL'||h==='DIR'?'left':'right',fontSize:'0.55rem',color:'#1e293b',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:'700'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {openTrades.map((t,i)=>{
                        const lp=liveP[t.symbol]||t.entryPrice;
                        const pnl=calcPnl(t,lp);
                        const pct=calcPct(t,lp);
                        const live=!!liveP[t.symbol];
                        return (
                          <tr key={t.id} style={{borderBottom:'1px solid rgba(255,255,255,0.03)',
                            background:flash[t.symbol]==='up'
                              ? (t.direction==='BUY' ? 'rgba(0,255,136,0.04)' : 'rgba(255,51,102,0.04)')
                              : flash[t.symbol]==='down'
                                ? (t.direction==='BUY' ? 'rgba(255,51,102,0.04)' : 'rgba(0,255,136,0.04)')
                                : i%2===0?'transparent':'rgba(0,0,0,0.1)',
                            transition:'background 0.3s'}}>
                            <td style={{padding:'10px 10px'}}>
                              <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                                <div style={{width:'3px',height:'26px',borderRadius:'2px',background:pnl>=0?'#00ff88':'#ff3366'}}/>
                                <div>
                                  <span style={{fontWeight:'800',fontFamily:'monospace',color:'#f0f6ff',fontSize:'0.88rem'}}>{t.symbol}</span>
                                  <div style={{display:'flex',gap:'4px',marginTop:'2px',flexWrap:'wrap'}}>
                                    {t.tradeMode&&<span style={{fontSize:'0.6rem',padding:'1px 5px',borderRadius:'4px',background:t.tradeMode==='intraday'?'rgba(245,158,11,0.12)':'rgba(59,130,246,0.12)',color:t.tradeMode==='intraday'?'#f59e0b':'#60a5fa',fontWeight:'700'}}>{t.tradeMode==='intraday'?'⚡ Intraday':'🔄 Swing'}</span>}
                                    {t.enteredAt&&<span style={{fontSize:'0.6rem',color:'#475569'}}>Day {Math.max(1,Math.floor((Date.now()-new Date(t.enteredAt).getTime())/(1000*60*60*24))+1)}</span>}
                                    {t.note&&<span style={{fontSize:'0.6rem',color:'#475569',maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.note}>📝 {t.note}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{padding:'10px 10px'}}>
                              <span style={{padding:'2px 7px',borderRadius:'4px',fontSize:'0.68rem',fontWeight:'800',background:t.direction==='BUY'?'rgba(0,255,136,0.12)':'rgba(255,51,102,0.12)',color:t.direction==='BUY'?'#00ff88':'#ff3366'}}>
                                {t.direction==='BUY'?'▲ BUY':'▼ SHORT'}
                              </span>
                            </td>
                            <td style={{padding:'10px 10px',textAlign:'right',color:'#94a3b8'}}>{t.qty}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',color:'#475569',fontSize:'0.78rem'}}>₹{t.entryPrice?.toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',fontSize:'0.75rem',color:'#ff3366'}}>{t.stopLoss?`₹${t.stopLoss}`:'—'}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',fontSize:'0.75rem',color:'#00ff88'}}>{t.target?`₹${t.target}`:'—'}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:'700',fontSize:'0.85rem',
                              color: flash[t.symbol]==='up'
                                ? (t.direction==='BUY' ? '#00ff88' : '#ff3366')
                                : flash[t.symbol]==='down'
                                  ? (t.direction==='BUY' ? '#ff3366' : '#00ff88')
                                  : live?'#00d4ff':'#475569',
                              textShadow: flash[t.symbol]==='up'
                                ? (t.direction==='BUY' ? '0 0 8px rgba(0,255,136,0.5)' : '0 0 8px rgba(255,51,102,0.5)')
                                : flash[t.symbol]==='down'
                                  ? (t.direction==='BUY' ? '0 0 8px rgba(255,51,102,0.5)' : '0 0 8px rgba(0,255,136,0.5)')
                                  : 'none',
                              transition:'color 0.3s, text-shadow 0.3s',
                            }}>
                              {live?`₹${lp.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}
                            </td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontWeight:'800',fontFamily:'monospace',color:pnl>=0?'#00ff88':'#ff3366'}}>{fmtS(pnl)}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontSize:'0.78rem',fontWeight:'700',color:pct>=0?'#00ff88':'#ff3366'}}>{fmtPct(pct)}</td>
                            <td style={{padding:'10px 10px',textAlign:'right'}}>
                              <div style={{display:'flex',gap:'4px',justifyContent:'flex-end'}}>
                                <button onClick={()=>setExit(t)} style={{padding:'4px 9px',background:pnl>=0?'rgba(0,255,136,0.1)':'rgba(255,51,102,0.1)',border:`1px solid ${pnl>=0?'rgba(0,255,136,0.3)':'rgba(255,51,102,0.3)'}`,borderRadius:'6px',color:pnl>=0?'#00ff88':'#ff3366',fontSize:'0.68rem',fontWeight:'700',cursor:'pointer'}}>EXIT</button>
                                <button onClick={()=>deleteTrade(t.id)} style={{padding:'4px 7px',background:'transparent',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'6px',color:'#334155',cursor:'pointer',fontSize:'0.72rem'}}>✕</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr style={{borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.2)'}}>
                      <td colSpan={7} style={{padding:'10px 10px',fontSize:'0.6rem',color:'#1e293b',textTransform:'uppercase',letterSpacing:'0.1em'}}>TOTAL OPEN P&L</td>
                      <td style={{padding:'10px 10px',textAlign:'right',fontWeight:'900',fontFamily:'monospace',color:openPnL>=0?'#00ff88':'#ff3366'}}>{fmtS(openPnL)}</td>
                      <td colSpan={2}/>
                    </tr></tfoot>
                  </table>
            )}

            {/* Closed history */}
            {tab==='closed'&&(
              closedTrades.length===0
                ? <div style={{padding:'48px',textAlign:'center',color:'#1e293b',fontSize:'0.82rem'}}>No closed trades yet — exit a position to see history</div>
                : <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                    <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(0,0,0,0.2)'}}>
                      {['SYMBOL','DIR','QTY','ENTRY','EXIT','P&L','%','CLOSED BY',''].map(h=>(
                        <th key={h} style={{padding:'9px 10px',textAlign:h==='SYMBOL'||h==='DIR'||h==='CLOSED BY'?'left':'right',fontSize:'0.55rem',color:'#1e293b',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:'700'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {closedTrades.map((t,i)=>{
                        const pnl=t.pnl||0;
                        const pct=t.exitPrice&&t.entryPrice?calcPct(t,t.exitPrice):0;
                        const closedByColor=t.closedBy==='TARGET'?'#00ff88':t.closedBy==='SL'?'#ff3366':'#64748b';
                        return (
                          <tr key={t.id} style={{borderBottom:'1px solid rgba(255,255,255,0.03)',background:i%2===0?'transparent':'rgba(0,0,0,0.1)'}}>
                            <td style={{padding:'10px 10px',fontWeight:'800',fontFamily:'monospace',color:'#f0f6ff'}}>
                              {t.symbol}
                              {t.note&&<div style={{fontSize:'0.62rem',color:'#475569',fontWeight:'400',fontFamily:'sans-serif',marginTop:'1px'}} title={t.note}>📝 {t.note}</div>}
                            </td>
                            <td style={{padding:'10px 10px'}}>
                              <span style={{padding:'2px 7px',borderRadius:'4px',fontSize:'0.68rem',fontWeight:'800',background:t.direction==='BUY'?'rgba(0,255,136,0.1)':'rgba(255,51,102,0.1)',color:t.direction==='BUY'?'#00ff88':'#ff3366'}}>{t.direction==='BUY'?'▲ BUY':'▼ SHORT'}</span>
                            </td>
                            <td style={{padding:'10px 10px',textAlign:'right',color:'#64748b'}}>{t.qty}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',color:'#475569',fontSize:'0.78rem'}}>₹{t.entryPrice?.toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',color:'#475569',fontSize:'0.78rem'}}>₹{t.exitPrice?.toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontWeight:'900',fontFamily:'monospace',color:pnl>=0?'#00ff88':'#ff3366'}}>{fmtS(pnl)}</td>
                            <td style={{padding:'10px 10px',textAlign:'right',fontSize:'0.78rem',fontWeight:'700',color:pct>=0?'#00ff88':'#ff3366'}}>{fmtPct(pct)}</td>
                            <td style={{padding:'10px 10px'}}>
                              {t.closedBy&&<span style={{padding:'2px 8px',borderRadius:'4px',fontSize:'0.65rem',fontWeight:'700',background:`${closedByColor}12`,color:closedByColor,border:`1px solid ${closedByColor}25`}}>{t.closedBy==='TARGET'?'🎯 Target Hit':t.closedBy==='SL'?'🛑 SL Hit':'Manual'}</span>}
                            </td>
                            <td style={{padding:'10px 10px',textAlign:'right'}}>
                              <button onClick={()=>deleteTrade(t.id)} style={{padding:'4px 7px',background:'transparent',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'5px',color:'#334155',cursor:'pointer',fontSize:'0.7rem'}}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr style={{borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.2)'}}>
                      <td colSpan={4} style={{padding:'10px 10px',fontSize:'0.6rem',color:'#1e293b',textTransform:'uppercase',letterSpacing:'0.1em'}}>TOTAL REALISED</td>
                      <td/><td style={{padding:'10px 10px',textAlign:'right',fontWeight:'900',fontFamily:'monospace',color:realisedPnL>=0?'#00ff88':'#ff3366'}}>{fmtS(realisedPnL)}</td>
                      <td colSpan={3}/>
                    </tr></tfoot>
                  </table>
            )}
          </div>

          {/* P&L Chart */}
          {chartData.length>=2&&(
            <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'16px 18px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                <div style={{fontSize:'0.62rem',color:'#475569',textTransform:'uppercase',letterSpacing:'0.15em',fontWeight:'700'}}>📈 CUMULATIVE P&L CURVE</div>
                <div style={{display:'flex',gap:'16px',fontSize:'0.65rem'}}>
                  <span style={{color:'#00ff88'}}>Best: {wins.length?fmtS(Math.max(...wins.map(t=>t.pnl))):'—'}</span>
                  <span style={{color:'#ff3366'}}>Worst: {losses.length?fmtS(Math.min(...losses.map(t=>t.pnl))):'—'}</span>
                  <span style={{color:'#a78bfa'}}>Trades: {closedTrades.length}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <XAxis dataKey="trade" tick={{fontSize:9,fill:'#334155'}} label={{value:'Trade #',position:'insideBottom',fill:'#334155',fontSize:9,dy:8}}/>
                  <YAxis tick={{fontSize:9,fill:'#334155'}} tickFormatter={v=>`${v>=0?'':'-'}₹${Math.abs(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v)=>[`${v>=0?'+':''}₹${Math.abs(v).toLocaleString('en-IN',{maximumFractionDigits:0})}`,'Cum. P&L']} contentStyle={{background:'#0a0f1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',fontSize:'0.78rem'}}/>
                  <Line type="monotone" dataKey="cumPnl" stroke={realisedPnL>=0?'#00ff88':'#ff3366'} strokeWidth={2.5} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Order entry */}
        <OrderPanel balance={balance} onTrade={openTrade} currentTradeMode={tradeMode}/>
      </div>

      {exiting&&<ExitModal trade={exiting} onClose={()=>setExit(null)} onExit={(ep,partialQty)=>closeTrade(exiting.id,ep,partialQty)} livePrice={liveP[exiting.symbol]||basePriceRef.current[exiting.symbol]||exiting.entryPrice}/>}
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes flashUp{0%,100%{background:transparent}50%{background:rgba(0,255,136,0.08)}}
        @keyframes flashDown{0%,100%{background:transparent}50%{background:rgba(255,51,102,0.08)}}
      `}</style>
    </div>
  );
}