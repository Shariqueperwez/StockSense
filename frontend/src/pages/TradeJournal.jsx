import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Trash2, Plus, TrendingUp, TrendingDown, Target, Zap, Brain, BookOpen, Award, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

/* ─── Storage ────────────────────────────────────────────────────────────── */
const KEY = 'ss_trade_journal_v2';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SETUPS  = ['Breakout','Pullback','Reversal','Gap Up','Gap Down','Support Bounce','Resistance Break','MA Cross','News Play','Opening Range','VWAP Bounce','Flag Pattern','Other'];
const EMOTIONS = ['Disciplined','Confident','Patient','Neutral','Nervous','FOMO','Greedy','Impulsive','Fearful','Overconfident'];
const EMOTION_COLOR = { Disciplined:'#10b981',Confident:'#3b82f6',Patient:'#10b981',Neutral:'#64748b',Nervous:'#f59e0b',FOMO:'#f97316',Greedy:'#f97316',Impulsive:'#f43f5e',Fearful:'#f43f5e',Overconfident:'#f43f5e' };
const GRADES = ['A — Followed my plan exactly','B — Minor deviation','C — Broke rules but got lucky','D — Broke rules and paid for it','F — Should never have taken this trade'];

const fmt = (n) => `₹${Number(Math.abs(n)||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtSigned = (n) => `${n>=0?'+':'-'}${fmt(n)}`;

function calcPnl(e) {
  if (!e.entry||!e.exit||!e.qty) return null;
  const sign = e.direction==='BUY' ? 1 : -1;
  return sign*(parseFloat(e.exit)-parseFloat(e.entry))*parseFloat(e.qty);
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
function EmptyJournal({ onLog }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px', gap:'20px', textAlign:'center' }}>
      <div style={{ width:'80px', height:'80px', borderRadius:'20px', background:'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.1))', border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem' }}>📓</div>
      <div>
        <div style={{ fontSize:'1.2rem', fontWeight:'800', color:'#f0f6ff', marginBottom:'8px' }}>Your trading edge starts here</div>
        <div style={{ fontSize:'0.85rem', color:'#64748b', maxWidth:'420px', lineHeight:'1.7' }}>
          Log every trade — real money or paper. The journal shows you which setups work, which emotions cost you money, and how to improve your win rate over time.
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', width:'100%', maxWidth:'480px' }}>
        {[{icon:'📊',title:'Track Setups',desc:'See which patterns make you money'},{icon:'🧠',title:'Emotion Analysis',desc:'Know when to trust yourself'},{icon:'📈',title:'P&L Curve',desc:'Visualize your consistency'}].map(c=>(
          <div key={c.title} style={{ padding:'14px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px' }}>
            <div style={{ fontSize:'1.4rem', marginBottom:'6px' }}>{c.icon}</div>
            <div style={{ fontSize:'0.75rem', fontWeight:'700', color:'#d0daea', marginBottom:'3px' }}>{c.title}</div>
            <div style={{ fontSize:'0.66rem', color:'#475569' }}>{c.desc}</div>
          </div>
        ))}
      </div>
      <button onClick={onLog} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 32px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none', borderRadius:'12px', color:'white', fontWeight:'800', fontSize:'0.9rem', cursor:'pointer', boxShadow:'0 4px 20px rgba(59,130,246,0.3)' }}>
        <Plus size={16}/> Log Your First Trade
      </button>
    </div>
  );
}

/* ─── Log Form ───────────────────────────────────────────────────────────── */
function LogForm({ onSave, onCancel, existing }) {
  const today = new Date().toISOString().slice(0,10);
  const [f, setF] = useState(existing || { symbol:'', date:today, direction:'BUY', qty:'', entry:'', exit:'', setup:'Breakout', emotion:'Disciplined', grade:'B — Minor deviation', notes:'', tags:'' });
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const pnl = calcPnl(f);
  const pnlPct = f.entry&&f.qty ? ((pnl/(parseFloat(f.entry)*parseFloat(f.qty)))*100) : null;

  const valid = f.symbol && f.entry && f.exit && f.qty;

  return (
    <div style={{ background:'rgba(0,0,0,0.5)', position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#0d1626', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'18px', width:'100%', maxWidth:'680px', maxHeight:'90vh', overflow:'auto', boxShadow:'0 30px 80px rgba(0,0,0,0.8)' }}>

        <div style={{ padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,rgba(59,130,246,0.08),transparent)', position:'sticky', top:0, backdropFilter:'blur(10px)', zIndex:1 }}>
          <div>
            <div style={{ fontWeight:'800', fontSize:'1rem', color:'#f0f6ff' }}>📓 {existing ? 'Edit Trade' : 'Log New Trade'}</div>
            <div style={{ fontSize:'0.7rem', color:'#475569', marginTop:'2px' }}>Document your real or paper trade — be honest</div>
          </div>
          <button onClick={onCancel} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'6px 12px', color:'#64748b', cursor:'pointer', fontSize:'0.8rem' }}>✕ Cancel</button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Row 1: Symbol, Date, Direction */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'12px' }}>
            <div>
              <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>Symbol *</label>
              <input value={f.symbol} onChange={e=>set('symbol',e.target.value.toUpperCase())} placeholder="e.g. TCS, RELIANCE"
                style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'1rem', fontFamily:'monospace', fontWeight:'800', boxSizing:'border-box', letterSpacing:'0.05em' }}/>
            </div>
            <div>
              <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>Date *</label>
              <input type="date" value={f.date} onChange={e=>set('date',e.target.value)}
                style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'0.85rem', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>Direction</label>
              <div style={{ display:'flex', gap:'6px' }}>
                {['BUY','SELL'].map(d=>(
                  <button key={d} onClick={()=>set('direction',d)} style={{ flex:1, padding:'10px', borderRadius:'9px', border:'none', fontWeight:'800', cursor:'pointer', fontSize:'0.85rem', background:f.direction===d?(d==='BUY'?'rgba(16,185,129,0.2)':'rgba(244,63,94,0.2)'):'rgba(0,0,0,0.3)', color:f.direction===d?(d==='BUY'?'#10b981':'#f43f5e'):'#475569', transition:'all 0.15s' }}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Entry, Exit, Qty */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
            {[{label:'Entry Price ₹ *',k:'entry',ph:'2500'},{label:'Exit Price ₹ *',k:'exit',ph:'2600'},{label:'Quantity *',k:'qty',ph:'100'}].map(({label,k,ph})=>(
              <div key={k}>
                <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>{label}</label>
                <input type="number" value={f[k]} onChange={e=>set(k,e.target.value)} placeholder={ph}
                  style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'0.9rem', fontFamily:'monospace', boxSizing:'border-box' }}/>
              </div>
            ))}
          </div>

          {/* P&L preview */}
          {pnl !== null && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
              {[
                {label:'P&L',value:fmtSigned(pnl),color:pnl>=0?'#10b981':'#f43f5e'},
                {label:'Return %',value:`${pnl>=0?'+':''}${pnlPct?.toFixed(2)||0}%`,color:pnl>=0?'#10b981':'#f43f5e'},
                {label:'Total Value',value:fmt(parseFloat(f.entry)*parseFloat(f.qty)||0),color:'#94a3b8'},
              ].map(s=>(
                <div key={s.label} style={{ padding:'10px 14px', background:`${s.color}08`, border:`1px solid ${s.color}20`, borderRadius:'9px', textAlign:'center' }}>
                  <div style={{ fontSize:'0.6rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px' }}>{s.label}</div>
                  <div style={{ fontSize:'1.1rem', fontWeight:'900', color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Row 3: Setup, Emotion */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>Trade Setup</label>
              <select value={f.setup} onChange={e=>set('setup',e.target.value)} style={{ width:'100%', padding:'10px 12px', background:'#0d1626', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'0.88rem', boxSizing:'border-box' }}>
                {SETUPS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>Emotion / Mindset</label>
              <select value={f.emotion} onChange={e=>set('emotion',e.target.value)} style={{ width:'100%', padding:'10px 12px', background:'#0d1626', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'0.88rem', boxSizing:'border-box' }}>
                {EMOTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Trade grade */}
          <div>
            <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>Trade Execution Grade</label>
            <select value={f.grade} onChange={e=>set('grade',e.target.value)} style={{ width:'100%', padding:'10px 12px', background:'#0d1626', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'0.85rem', boxSizing:'border-box' }}>
              {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
            <div style={{ fontSize:'0.65rem', color:'#334155', marginTop:'4px' }}>Grade the quality of your decision — separate from whether it was profitable</div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'6px' }}>What happened? Lessons learned?</label>
            <textarea value={f.notes} onChange={e=>set('notes',e.target.value)} rows={3}
              placeholder="Why did you enter? Did you follow your plan? What would you do differently next time?"
              style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'0.84rem', resize:'vertical', boxSizing:'border-box', lineHeight:'1.6' }}/>
          </div>

          {/* Buttons */}
          <button onClick={() => { if(!valid) return; onSave({...f, id:existing?.id||Date.now(), pnl:calcPnl(f)||0}); }} disabled={!valid}
            style={{ padding:'13px', background:valid?'linear-gradient(135deg,#3b82f6,#1d4ed8)':'#1e293b', border:'none', borderRadius:'12px', color:valid?'white':'#475569', fontWeight:'800', fontSize:'0.95rem', cursor:valid?'pointer':'not-allowed', letterSpacing:'0.03em', boxShadow:valid?'0 4px 20px rgba(59,130,246,0.3)':'none' }}>
            💾 Save Trade
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Trade Card ─────────────────────────────────────────────────────────── */
function TradeCard({ e, onDelete }) {
  const [open, setOpen] = useState(false);
  const pnl = e.pnl || 0;
  const isWin = pnl > 0;
  const gradeChar = e.grade?.[0] || 'B';
  const gradeColor = {A:'#10b981',B:'#3b82f6',C:'#f59e0b',D:'#f97316',F:'#f43f5e'}[gradeChar] || '#64748b';
  const emotionColor = EMOTION_COLOR[e.emotion] || '#64748b';

  return (
    <div style={{ background:'rgba(0,0,0,0.28)', border:`1px solid ${isWin?'rgba(16,185,129,0.12)':'rgba(244,63,94,0.1)'}`, borderRadius:'14px', overflow:'hidden', transition:'all 0.15s' }}>
      {/* Main row */}
      <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr auto auto', gap:'8px', alignItems:'center', padding:'14px 18px', cursor:'pointer' }} onClick={()=>setOpen(v=>!v)}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'4px', height:'36px', borderRadius:'2px', background:isWin?'#10b981':'#f43f5e', flexShrink:0 }}/>
          <div>
            <div style={{ fontWeight:'800', fontFamily:'monospace', fontSize:'0.95rem', color:'#f0f6ff', letterSpacing:'0.05em' }}>{e.symbol}</div>
            <div style={{ fontSize:'0.68rem', color:'#475569', display:'flex', gap:'8px', marginTop:'2px' }}>
              <span>{e.date}</span>
              <span>·</span>
              <span style={{ color:'#64748b' }}>{e.setup}</span>
            </div>
          </div>
        </div>
        <div>
          <span style={{ padding:'2px 8px', borderRadius:'5px', fontSize:'0.7rem', fontWeight:'800', background:e.direction==='BUY'?'rgba(16,185,129,0.15)':'rgba(244,63,94,0.15)', color:e.direction==='BUY'?'#10b981':'#f43f5e' }}>{e.direction}</span>
          <div style={{ fontSize:'0.65rem', color:'#475569', marginTop:'3px' }}>{e.qty} shares</div>
        </div>
        <div style={{ fontSize:'0.82rem' }}>
          <div style={{ color:'#64748b' }}>₹{parseFloat(e.entry).toLocaleString('en-IN',{maximumFractionDigits:1})}</div>
          <div style={{ color:'#64748b' }}>₹{parseFloat(e.exit).toLocaleString('en-IN',{maximumFractionDigits:1})}</div>
        </div>
        <div style={{ fontSize:'1.05rem', fontWeight:'900', color:isWin?'#10b981':'#f43f5e', fontVariantNumeric:'tabular-nums' }}>
          {fmtSigned(pnl)}
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          <span style={{ padding:'2px 7px', borderRadius:'4px', fontSize:'0.68rem', fontWeight:'800', background:`${gradeColor}15`, color:gradeColor, border:`1px solid ${gradeColor}25` }}>{gradeChar}</span>
          <span style={{ padding:'2px 7px', borderRadius:'4px', fontSize:'0.66rem', fontWeight:'700', background:`${emotionColor}12`, color:emotionColor }}>{e.emotion}</span>
        </div>
        <div style={{ cursor:'pointer', color:'#334155', padding:'4px' }} onClick={ev=>{ev.stopPropagation();onDelete(e.id);}}>
          <Trash2 size={13}/>
        </div>
        <div style={{ color:'#334155' }}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</div>
      </div>

      {/* Expanded notes */}
      {open && e.notes && (
        <div style={{ padding:'12px 18px 16px 32px', borderTop:'1px solid rgba(255,255,255,0.04)', background:'rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize:'0.62rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>NOTES & LESSONS</div>
          <div style={{ fontSize:'0.8rem', color:'#8899b4', lineHeight:'1.7' }}>{e.notes}</div>
          {e.grade && <div style={{ marginTop:'8px', fontSize:'0.72rem', color:gradeColor }}>Execution: {e.grade}</div>}
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function TradeJournal() {
  const [entries, setEntries] = useState(load);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('log');

  const addEntry = (e) => {
    const updated = [e, ...entries.filter(x=>x.id!==e.id)];
    setEntries(updated); save(updated); setShowForm(false);
  };
  const removeEntry = (id) => {
    const updated = entries.filter(e=>e.id!==id);
    setEntries(updated); save(updated);
  };

  /* Stats */
  const stats = useMemo(() => {
    const wins = entries.filter(e=>e.pnl>0);
    const losses = entries.filter(e=>e.pnl<=0);
    const totalPnl = entries.reduce((s,e)=>s+(e.pnl||0),0);
    const avgWin = wins.length ? wins.reduce((s,e)=>s+e.pnl,0)/wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s,e)=>s+e.pnl,0)/losses.length : 0;
    const rr = avgLoss!==0 ? (Math.abs(avgWin/avgLoss)).toFixed(2) : '—';
    const streak = (() => {
      let cur=0,max=0;
      for(const e of entries){if(e.pnl>0){cur++;max=Math.max(max,cur);}else cur=0;}
      return max;
    })();

    // Cumulative P&L chart
    const cumChart = [...entries].reverse().map((e,i,arr)=>({
      trade:i+1,
      cumPnl:arr.slice(0,i+1).reduce((s,x)=>s+(x.pnl||0),0),
      pnl:e.pnl||0, sym:e.symbol
    }));

    // Setup breakdown
    const setupMap = {};
    entries.forEach(e=>{
      if(!setupMap[e.setup]) setupMap[e.setup]={count:0,pnl:0,wins:0};
      setupMap[e.setup].count++;
      setupMap[e.setup].pnl+=e.pnl||0;
      if(e.pnl>0) setupMap[e.setup].wins++;
    });
    const setups = Object.entries(setupMap).map(([s,v])=>({setup:s,...v,wr:((v.wins/v.count)*100).toFixed(0)})).sort((a,b)=>b.pnl-a.pnl);

    // Emotion breakdown
    const emoMap = {};
    entries.forEach(e=>{
      if(!emoMap[e.emotion]) emoMap[e.emotion]={count:0,pnl:0,wins:0};
      emoMap[e.emotion].count++;
      emoMap[e.emotion].pnl+=e.pnl||0;
      if(e.pnl>0) emoMap[e.emotion].wins++;
    });
    const emotions = Object.entries(emoMap).map(([em,v])=>({em,...v,wr:((v.wins/v.count)*100).toFixed(0)})).sort((a,b)=>b.pnl-a.pnl);

    // Day of week
    const dayMap = {};
    entries.forEach(e=>{
      const d=new Date(e.date).toLocaleDateString('en-IN',{weekday:'short'});
      if(!dayMap[d]) dayMap[d]={day:d,pnl:0,count:0};
      dayMap[d].pnl+=e.pnl||0; dayMap[d].count++;
    });

    return {wins,losses,totalPnl,avgWin,avgLoss,rr,streak,cumChart,setups,emotions,dayMap};
  }, [entries]);

  const pnlColor = stats.totalPnl>=0?'#10b981':'#f43f5e';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0', maxWidth:'1100px', margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', paddingBottom:'16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.1))', border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>📓</div>
          <div>
            <div style={{ fontSize:'1.1rem', fontWeight:'900', color:'#f0f6ff', letterSpacing:'-0.3px' }}>Trade Journal</div>
            <div style={{ fontSize:'0.7rem', color:'#334155' }}>Log real & paper trades · Track psychology · Find your edge</div>
          </div>
        </div>
        <button onClick={()=>setShowForm(true)} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none', borderRadius:'12px', color:'white', fontWeight:'800', fontSize:'0.85rem', cursor:'pointer', boxShadow:'0 4px 15px rgba(59,130,246,0.3)' }}>
          <Plus size={15}/> Log Trade
        </button>
      </div>

      {/* ── Stat strip ── */}
      {entries.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'1px', background:'rgba(255,255,255,0.04)', borderRadius:'12px', overflow:'hidden', marginBottom:'16px' }}>
          {[
            {label:'Total P&L',value:fmtSigned(stats.totalPnl),color:pnlColor,sub:`${entries.length} trades`},
            {label:'Win Rate',value:`${entries.length?((stats.wins.length/entries.length)*100).toFixed(1):0}%`,color:parseFloat(stats.wins.length/entries.length*100)>=50?'#10b981':'#f59e0b',sub:`${stats.wins.length}W / ${stats.losses.length}L`},
            {label:'Risk:Reward',value:`1:${stats.rr}`,color:'#3b82f6',sub:'Avg win / avg loss'},
            {label:'Best Streak',value:`${stats.streak}W`,color:'#a78bfa',sub:'consecutive wins'},
            {label:'Best Trade',value:stats.wins.length?fmtSigned(Math.max(...stats.wins.map(e=>e.pnl))):'—',color:'#10b981',sub:stats.wins.length?stats.wins.reduce((m,e)=>e.pnl>m.pnl?e:m,stats.wins[0]).symbol:''},
          ].map(s=>(
            <div key={s.label} style={{ padding:'14px 16px', background:'rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize:'0.6rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'5px' }}>{s.label}</div>
              <div style={{ fontSize:'1.2rem', fontWeight:'900', color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize:'0.66rem', color:'#334155', marginTop:'2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:'0', background:'rgba(0,0,0,0.25)', borderRadius:'10px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)', marginBottom:'16px' }}>
        {[['log','📋 Trade Log'],['stats','📊 Analytics'],['mindset','🧠 Mindset']].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{ flex:1, padding:'11px', border:'none', background:tab===key?'rgba(59,130,246,0.15)':'transparent', borderBottom:`2px solid ${tab===key?'#3b82f6':'transparent'}`, color:tab===key?'#f0f6ff':'#475569', fontSize:'0.8rem', fontWeight:tab===key?'700':'500', cursor:'pointer', transition:'all 0.15s', letterSpacing:'0.03em' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Trade Log Tab ── */}
      {tab==='log' && (
        entries.length===0
          ? <EmptyJournal onLog={()=>setShowForm(true)}/>
          : <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr auto auto', gap:'8px', padding:'8px 18px', fontSize:'0.58rem', color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                <span>TRADE</span><span>SIDE</span><span>ENTRY / EXIT</span><span>P&L</span><span>GRADE · EMOTION</span><span></span><span></span>
              </div>
              {entries.map(e=><TradeCard key={e.id} e={e} onDelete={removeEntry}/>)}
            </div>
      )}

      {/* ── Analytics Tab ── */}
      {tab==='stats' && (
        entries.length < 2
          ? <div style={{ padding:'48px', textAlign:'center', color:'#334155', fontSize:'0.85rem' }}>Log at least 2 trades to see analytics</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* Cumulative P&L */}
              <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'14px', padding:'18px 20px' }}>
                <div style={{ fontSize:'0.72rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'14px', fontWeight:'700' }}>📈 CUMULATIVE P&L CURVE</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stats.cumChart}>
                    <XAxis dataKey="trade" tick={{fontSize:10,fill:'#334155'}} label={{value:'Trade #',position:'insideBottom',fill:'#334155',fontSize:10,dy:8}}/>
                    <YAxis tick={{fontSize:10,fill:'#334155'}} tickFormatter={v=>`₹${v>=0?'':'-'}${Math.abs(v/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={(v)=>[`${v>=0?'+':''}₹${Math.abs(v).toLocaleString('en-IN',{maximumFractionDigits:0})}`,'Cum. P&L']} contentStyle={{background:'#0a0f1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',fontSize:'0.78rem'}}/>
                    <Line type="monotone" dataKey="cumPnl" stroke={stats.totalPnl>=0?'#10b981':'#f43f5e'} strokeWidth={2.5} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Setup + Emotion side by side */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

                {/* Setup breakdown */}
                <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'14px', padding:'18px 20px' }}>
                  <div style={{ fontSize:'0.72rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'14px', fontWeight:'700' }}>🎯 P&L BY SETUP</div>
                  {stats.setups.map(s=>{
                    const maxAbs = Math.max(...stats.setups.map(x=>Math.abs(x.pnl)));
                    return (
                      <div key={s.setup} style={{ marginBottom:'10px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'4px' }}>
                          <span style={{ color:'#94a3b8', fontWeight:'600' }}>{s.setup}</span>
                          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                            <span style={{ fontSize:'0.65rem', color:'#475569' }}>{s.wr}% WR</span>
                            <span style={{ fontWeight:'800', color:s.pnl>=0?'#10b981':'#f43f5e' }}>{fmtSigned(s.pnl)}</span>
                          </div>
                        </div>
                        <div style={{ height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${(Math.abs(s.pnl)/maxAbs)*100}%`, background:s.pnl>=0?'#10b981':'#f43f5e', borderRadius:'3px', transition:'width 0.6s ease' }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Per-trade bar chart */}
                <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'14px', padding:'18px 20px' }}>
                  <div style={{ fontSize:'0.72rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'14px', fontWeight:'700' }}>💹 INDIVIDUAL TRADES</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.cumChart} barSize={16}>
                      <XAxis dataKey="trade" tick={{fontSize:9,fill:'#334155'}}/>
                      <YAxis tick={{fontSize:9,fill:'#334155'}} tickFormatter={v=>`${v>=0?'':'-'}₹${Math.abs(v/1000).toFixed(0)}k`}/>
                      <Tooltip formatter={(v)=>[`${v>=0?'+':''}₹${Math.abs(v).toLocaleString('en-IN',{maximumFractionDigits:0})}`,'P&L']} contentStyle={{background:'#0a0f1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',fontSize:'0.78rem'}}/>
                      <Bar dataKey="pnl" radius={[4,4,0,0]}>
                        {stats.cumChart.map((c,i)=><Cell key={i} fill={c.pnl>=0?'#10b981':'#f43f5e'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
      )}

      {/* ── Mindset Tab ── */}
      {tab==='mindset' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Emotion impact */}
          {stats.emotions.length > 0 && (
            <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'14px', padding:'18px 20px' }}>
              <div style={{ fontSize:'0.72rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'4px', fontWeight:'700' }}>🧠 EMOTION → PERFORMANCE</div>
              <div style={{ fontSize:'0.72rem', color:'#334155', marginBottom:'14px' }}>Which emotional state makes you the most money?</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'10px' }}>
                {stats.emotions.map(({em,pnl,count,wr})=>{
                  const c=EMOTION_COLOR[em]||'#64748b';
                  return (
                    <div key={em} style={{ padding:'12px 14px', background:`${c}08`, border:`1px solid ${c}20`, borderRadius:'12px' }}>
                      <div style={{ fontSize:'0.72rem', fontWeight:'800', color:c, marginBottom:'2px' }}>{em}</div>
                      <div style={{ fontSize:'0.62rem', color:'#475569', marginBottom:'8px' }}>{count} trade{count!==1?'s':''} · {wr}% WR</div>
                      <div style={{ fontSize:'1rem', fontWeight:'900', color:pnl>=0?'#10b981':'#f43f5e', fontVariantNumeric:'tabular-nums' }}>{fmtSigned(pnl)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lessons from notes */}
          <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'14px', padding:'18px 20px' }}>
            <div style={{ fontSize:'0.72rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'14px', fontWeight:'700' }}>📝 YOUR TRADE NOTES</div>
            {entries.filter(e=>e.notes).length===0
              ? <div style={{ color:'#334155', fontSize:'0.82rem' }}>No notes yet. Add notes when logging trades — they become your personal trading playbook.</div>
              : entries.filter(e=>e.notes).slice(0,8).map(e=>(
                  <div key={e.id} style={{ marginBottom:'10px', padding:'12px 16px', background:'rgba(0,0,0,0.25)', borderRadius:'10px', borderLeft:`3px solid ${e.pnl>=0?'#10b981':'#f43f5e'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ fontWeight:'800', fontFamily:'monospace', color:'#f0f6ff' }}>{e.symbol}</span>
                      <div style={{ display:'flex', gap:'8px', fontSize:'0.65rem', color:'#475569' }}>
                        <span>{e.date}</span>
                        <span style={{ color:e.pnl>=0?'#10b981':'#f43f5e', fontWeight:'700' }}>{fmtSigned(e.pnl)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:'0.78rem', color:'#8899b4', lineHeight:'1.6' }}>{e.notes}</div>
                  </div>
                ))
            }
          </div>

          {/* Golden rules */}
          <div style={{ background:'linear-gradient(135deg,rgba(59,130,246,0.06),rgba(139,92,246,0.04))', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'14px', padding:'18px 20px' }}>
            <div style={{ fontSize:'0.72rem', color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'14px', fontWeight:'700' }}>📏 GOLDEN RULES FOR TRADERS</div>
            {[
              {icon:'🛑',rule:'Always use a Stop Loss',desc:'Never enter a trade without knowing your exit. Losses without stops can be devastating.',color:'#f43f5e'},
              {icon:'⚖️',rule:'Risk only 1-2% per trade',desc:'Even 10 consecutive losses should not wipe your account. Position sizing is everything.',color:'#f59e0b'},
              {icon:'🧘',rule:'Control your emotions',desc:'Fear and greed are your worst enemies. Stick to your system, not your feelings.',color:'#a78bfa'},
              {icon:'📓',rule:'Journal every trade',desc:'Winners review their trades. Your journal is your most valuable trading tool.',color:'#3b82f6'},
              {icon:'📊',rule:'Trade with the trend',desc:'The trend is your friend. Going against strong momentum is a common beginner mistake.',color:'#10b981'},
              {icon:'🎯',rule:'Grade your execution',desc:'A winning trade with bad execution is a lucky mistake. A losing trade with perfect execution is good trading.',color:'#f59e0b'},
            ].map(({icon,rule,desc,color})=>(
              <div key={rule} style={{ display:'flex', gap:'12px', padding:'12px 14px', background:'rgba(0,0,0,0.2)', borderRadius:'10px', marginBottom:'8px', border:`1px solid ${color}10` }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight:'700', fontSize:'0.83rem', color:'#d0daea', marginBottom:'3px' }}>{rule}</div>
                  <div style={{ fontSize:'0.74rem', color:'#475569', lineHeight:'1.5' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && <LogForm onSave={addEntry} onCancel={()=>setShowForm(false)}/>}
    </div>
  );
}