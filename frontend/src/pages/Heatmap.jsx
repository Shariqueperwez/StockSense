import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Clock, Newspaper, TrendingUp, TrendingDown, Search } from 'lucide-react';
import api from '../api';

const SECTOR_MAP = {
  RELIANCE:'Energy',ONGC:'Energy',BPCL:'Energy',NTPC:'Energy',POWERGRID:'Energy',TATAPOWER:'Energy',
  TCS:'IT',INFY:'IT',WIPRO:'IT',HCLTECH:'IT',TECHM:'IT',LTIM:'IT',COFORGE:'IT',PERSISTENT:'IT',
  HDFCBANK:'Banking',ICICIBANK:'Banking',SBIN:'Banking',AXISBANK:'Banking',KOTAKBANK:'Banking',INDUSINDBK:'Banking',BANDHANBNK:'Banking',IDFCFIRSTB:'Banking',
  BAJFINANCE:'NBFC',BAJAJFINSV:'NBFC',MUTHOOTFIN:'NBFC',CHOLAFIN:'NBFC',
  MARUTI:'Auto',TATAMOTORS:'Auto',HEROMOTOCO:'Auto',EICHERMOT:'Auto','M&M':'Auto','BAJAJ-AUTO':'Auto',
  SUNPHARMA:'Pharma',DRREDDY:'Pharma',CIPLA:'Pharma',DIVISLAB:'Pharma',APOLLOHOSP:'Pharma',LUPIN:'Pharma',
  HINDUNILVR:'FMCG',ITC:'FMCG',NESTLEIND:'FMCG',DABUR:'FMCG',MARICO:'FMCG',COLPAL:'FMCG',
  LT:'Infra',ADANIPORTS:'Infra',ULTRACEMCO:'Cement',AMBUJACEM:'Cement',
  BHARTIARTL:'Telecom',TATASTEEL:'Metals',JSWSTEEL:'Metals',HINDALCO:'Metals',VEDL:'Metals',
  ZOMATO:'Consumer',TRENT:'Consumer',TITAN:'Consumer',DMART:'Consumer',
};
function getSector(sym) { return SECTOR_MAP[sym] || 'Others'; }

function getCardStyle(score) {
  if (score >= 5)  return { bg:'rgba(16,185,129,0.92)', border:'rgba(16,185,129,0.3)' };
  if (score >= 2)  return { bg:'rgba(16,185,129,0.55)', border:'rgba(16,185,129,0.25)' };
  if (score >= 0)  return { bg:'rgba(16,185,129,0.14)', border:'rgba(16,185,129,0.2)' };
  if (score > -2)  return { bg:'rgba(239,68,68,0.14)',  border:'rgba(239,68,68,0.2)' };
  if (score > -5)  return { bg:'rgba(239,68,68,0.55)',  border:'rgba(239,68,68,0.25)' };
  return             { bg:'rgba(239,68,68,0.92)',        border:'rgba(239,68,68,0.3)' };
}

function ScoreBar({ score, max=10 }) {
  const pct = Math.min(Math.abs(score) / max * 100, 100);
  const color = score >= 0 ? '#10b981' : '#ef4444';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'8px' }}>
      <div style={{ flex:1, height:'4px', background:'rgba(255,255,255,0.15)', borderRadius:'2px', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'2px' }}/>
      </div>
      <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.65)', minWidth:'26px', textAlign:'right' }}>
        {score > 0 ? '+' : ''}{score}
      </span>
    </div>
  );
}

function StockCard({ stock }) {
  const cs = getCardStyle(stock.sentiment_score);
  const isUp = stock.change_percent >= 0;
  return (
    <div style={{ background:cs.bg, border:`1px solid ${cs.border}`, borderRadius:'12px', padding:'16px', color:'#fff', display:'flex', flexDirection:'column', gap:'4px', minHeight:'130px', transition:'transform 0.15s, box-shadow 0.15s', cursor:'default' }}
      onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';}}
      onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontWeight:'800', fontSize:'0.92rem', letterSpacing:'0.02em' }}>{stock.symbol}</div>
          <div style={{ fontSize:'0.62rem', opacity:0.6, marginTop:'1px' }}>{getSector(stock.symbol)}</div>
        </div>
        <div style={{ fontSize:'0.62rem', fontWeight:'700', padding:'3px 7px', borderRadius:'20px', background:'rgba(0,0,0,0.25)', color:stock.status==='Bullish'?'#6ee7b7':stock.status==='Bearish'?'#fca5a5':'#cbd5e1' }}>
          {stock.status==='Bullish'?'▲':stock.status==='Bearish'?'▼':'─'} {stock.status}
        </div>
      </div>
      <div style={{ marginTop:'6px' }}>
        <div style={{ fontSize:'1.25rem', fontWeight:'800', lineHeight:'1' }}>₹{stock.price?.toLocaleString('en-IN')}</div>
        <div style={{ fontSize:'0.8rem', fontWeight:'600', marginTop:'3px', opacity:0.9 }}>{isUp?'▲':'▼'} {Math.abs(stock.change_percent).toFixed(2)}%</div>
      </div>
      <ScoreBar score={stock.sentiment_score} />
    </div>
  );
}

function SummaryBar({ data }) {
  const bull = data.filter(s=>s.status==='Bullish').length;
  const bear = data.filter(s=>s.status==='Bearish').length;
  const neut = data.filter(s=>s.status==='Neutral').length;
  const avg = data.length ? (data.reduce((a,s)=>a+s.sentiment_score,0)/data.length).toFixed(1) : 0;
  const top = [...data].sort((a,b)=>b.change_percent-a.change_percent)[0];
  const bot = [...data].sort((a,b)=>a.change_percent-b.change_percent)[0];
  const overall = avg > 1.5 ? 'Bullish' : avg < -1.5 ? 'Bearish' : 'Neutral';
  const sc = overall==='Bullish'?'#10b981':overall==='Bearish'?'#ef4444':'#94a3b8';
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'18px 22px' }}>
      <div>
        <div style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Overall Sentiment</div>
        <div style={{ fontSize:'1.25rem', fontWeight:'800', color:sc }}>{overall}</div>
        <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'2px' }}>Avg score: {avg>0?'+':''}{avg}</div>
      </div>
      <div>
        <div style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Market Breadth</div>
        <div style={{ display:'flex', height:'8px', borderRadius:'4px', overflow:'hidden', gap:'1px', marginBottom:'6px' }}>
          <div style={{ flex:bull, background:'#10b981' }}/><div style={{ flex:neut, background:'#475569' }}/><div style={{ flex:bear, background:'#ef4444' }}/>
        </div>
        <div style={{ display:'flex', gap:'10px', fontSize:'0.7rem' }}>
          <span style={{ color:'#10b981' }}>▲ {bull}</span><span style={{ color:'#94a3b8' }}>─ {neut}</span><span style={{ color:'#ef4444' }}>▼ {bear}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Top Gainer</div>
        {top && <><div style={{ fontWeight:'800', fontSize:'0.9rem', color:'#f0f6ff' }}>{top.symbol}</div><div style={{ fontSize:'0.78rem', color:'#10b981', fontWeight:'700', marginTop:'2px' }}>+{top.change_percent?.toFixed(2)}%</div></>}
      </div>
      <div>
        <div style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Top Loser</div>
        {bot && <><div style={{ fontWeight:'800', fontSize:'0.9rem', color:'#f0f6ff' }}>{bot.symbol}</div><div style={{ fontSize:'0.78rem', color:'#ef4444', fontWeight:'700', marginTop:'2px' }}>{bot.change_percent?.toFixed(2)}%</div></>}
      </div>
      <div>
        <div style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Tracking</div>
        <div style={{ fontSize:'1.25rem', fontWeight:'800', color:'#f0f6ff' }}>{data.length}</div>
        <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'2px' }}>Nifty 50 stocks</div>
      </div>
    </div>
  );
}

// ── NEWS SENTIMENT TAB ─────────────────────────────────────────────────────────
const DEFAULT_SYMBOLS = 'RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,SBIN,BHARTIARTL,BAJFINANCE,MARUTI,ZOMATO';

function NewsSentimentTab() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [expanded, setExpanded] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  const fetchSentiment = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/market/news-sentiment?symbols=${encodeURIComponent(symbols)}`);
      setResults(res.data.sentiment || []);
      setLastUpdated(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));
    } catch(e) {
      setError('Could not fetch news sentiment. Make sure backend is running.');
    } finally { setLoading(false); }
  };

  const sentColor = s => s==='Bullish'?'#10b981':s==='Bearish'?'#ef4444':'#94a3b8';
  const sentBg    = s => s==='Bullish'?'rgba(16,185,129,0.1)':s==='Bearish'?'rgba(239,68,68,0.1)':'rgba(148,163,184,0.08)';
  const sentBorder= s => s==='Bullish'?'rgba(16,185,129,0.25)':s==='Bearish'?'rgba(239,68,68,0.25)':'rgba(148,163,184,0.15)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* Info banner */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'14px 18px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.18)', borderRadius:'12px' }}>
        <Newspaper size={16} color="#3b82f6" style={{ marginTop:'2px', flexShrink:0 }}/>
        <div>
          <div style={{ fontSize:'0.82rem', fontWeight:'700', color:'#93c5fd', marginBottom:'3px' }}>AI-Powered News Sentiment</div>
          <div style={{ fontSize:'0.76rem', color:'#64748b', lineHeight:'1.55' }}>
            Fetches recent headlines for each stock (NSE filings + Yahoo Finance) and uses Groq AI to score sentiment from −10 (very bearish) to +10 (very bullish). Analyze up to 10 stocks at a time.
          </div>
        </div>
      </div>

      {/* Symbol input + analyze button */}
      <div style={{ display:'flex', gap:'10px', alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:'260px' }}>
          <label style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:'600', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Stocks to analyze (comma-separated, max 10)
          </label>
          <input
            value={symbols}
            onChange={e=>setSymbols(e.target.value)}
            placeholder="e.g. RELIANCE,TCS,INFY,HDFCBANK"
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#f0f6ff', fontSize:'0.85rem', outline:'none', fontFamily:'monospace' }}
          />
        </div>
        <button onClick={fetchSentiment} disabled={loading}
          style={{ marginTop:'24px', display:'flex', alignItems:'center', gap:'7px', padding:'10px 22px', background:loading?'rgba(59,130,246,0.3)':'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none', borderRadius:'9px', color:'white', fontWeight:'700', fontSize:'0.88rem', cursor:loading?'not-allowed':'pointer', whiteSpace:'nowrap', boxShadow:loading?'none':'0 4px 16px rgba(59,130,246,0.35)' }}>
          {loading ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Analyzing...</> : <><Search size={14}/> Analyze News</>}
        </button>
      </div>

      {error && <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', color:'#f87171', fontSize:'0.82rem' }}>{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {[1,2,3,4,5].map(i=>(
            <div key={i} style={{ height:'80px', borderRadius:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>
          ))}
          <div style={{ textAlign:'center', color:'#64748b', fontSize:'0.8rem', marginTop:'8px' }}>
            Fetching news & running AI sentiment analysis... this may take 10–20 seconds
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'0.82rem', color:'#64748b' }}>
              {results.length} stocks analyzed {lastUpdated && `· Updated ${lastUpdated}`}
            </div>
            <div style={{ display:'flex', gap:'8px', fontSize:'0.72rem' }}>
              <span style={{ color:'#10b981' }}>● Bullish: {results.filter(r=>r.sentiment==='Bullish').length}</span>
              <span style={{ color:'#94a3b8' }}>● Neutral: {results.filter(r=>r.sentiment==='Neutral').length}</span>
              <span style={{ color:'#ef4444' }}>● Bearish: {results.filter(r=>r.sentiment==='Bearish').length}</span>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {results.sort((a,b)=>b.score-a.score).map((r,i)=>(
              <div key={i}
                style={{ background:sentBg(r.sentiment), border:`1px solid ${sentBorder(r.sentiment)}`, borderRadius:'12px', overflow:'hidden', transition:'all 0.2s', cursor:'pointer' }}
                onClick={()=>setExpanded(expanded===i?null:i)}>
                {/* Card header */}
                <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:'14px' }}>
                  {/* Symbol */}
                  <div style={{ minWidth:'100px' }}>
                    <div style={{ fontWeight:'800', fontSize:'0.95rem', color:'#f0f6ff' }}>{r.symbol}</div>
                    <div style={{ fontSize:'0.65rem', color:'#64748b', marginTop:'1px' }}>{getSector(r.symbol)}</div>
                  </div>
                  {/* Sentiment badge */}
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', background:sentBg(r.sentiment), border:`1px solid ${sentBorder(r.sentiment)}`, borderRadius:'20px', padding:'4px 12px', minWidth:'90px', justifyContent:'center' }}>
                    <span style={{ fontSize:'0.75rem', fontWeight:'800', color:sentColor(r.sentiment) }}>
                      {r.sentiment==='Bullish'?'▲':r.sentiment==='Bearish'?'▼':'─'} {r.sentiment}
                    </span>
                  </div>
                  {/* Score bar */}
                  <div style={{ flex:1, display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ flex:1, height:'6px', background:'rgba(255,255,255,0.08)', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ width:`${Math.min(Math.abs(r.score)/10*100,100)}%`, height:'100%', background:sentColor(r.sentiment), borderRadius:'3px' }}/>
                    </div>
                    <span style={{ fontSize:'0.8rem', fontWeight:'800', color:sentColor(r.sentiment), minWidth:'30px', textAlign:'right' }}>
                      {r.score>0?'+':''}{r.score}
                    </span>
                  </div>
                  {/* Summary (hidden on small) */}
                  <div style={{ flex:2, fontSize:'0.76rem', color:'#94a3b8', lineHeight:'1.4', display:'none' }} className="news-summary">{r.summary}</div>
                  {/* Keywords */}
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', maxWidth:'200px' }}>
                    {(r.keywords||[]).slice(0,3).map((kw,j)=>(
                      <span key={j} style={{ fontSize:'0.62rem', padding:'2px 7px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#94a3b8', whiteSpace:'nowrap' }}>{kw}</span>
                    ))}
                  </div>
                  {/* Expand hint */}
                  <span style={{ fontSize:'0.7rem', color:'#475569', marginLeft:'8px', flexShrink:0 }}>{expanded===i?'▲':'▼'}</span>
                </div>

                {/* Expanded: summary + headlines */}
                {expanded===i && (
                  <div style={{ padding:'0 18px 16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    {r.summary && (
                      <div style={{ padding:'12px 0 10px', fontSize:'0.82rem', color:'#e2e8f0', lineHeight:'1.6', borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:'12px' }}>
                        <span style={{ fontWeight:'700', color:sentColor(r.sentiment) }}>AI Summary: </span>{r.summary}
                      </div>
                    )}
                    <div style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>
                      Source Headlines ({r.headlines?.length || 0})
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      {(r.headlines||[]).map((h,j)=>(
                        <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color:'#475569', fontSize:'0.7rem', marginTop:'1px', flexShrink:0 }}>#{j+1}</span>
                          <span style={{ fontSize:'0.78rem', color:'#94a3b8', lineHeight:'1.5' }}>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && results.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#64748b' }}>
          <Newspaper size={40} color="#334155" style={{ margin:'0 auto 16px', display:'block' }}/>
          <div style={{ fontSize:'0.9rem', marginBottom:'6px', color:'#e2e8f0' }}>News sentiment not loaded yet</div>
          <div style={{ fontSize:'0.78rem' }}>Enter stock symbols above and click "Analyze News" to get AI sentiment scores based on recent news headlines.</div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
const FILTERS = ['All','Bullish','Neutral','Bearish'];
const SORTS = [
  {value:'market_cap',label:'Market Cap'},{value:'change_desc',label:'Biggest Gain'},
  {value:'change_asc',label:'Biggest Drop'},{value:'score',label:'Sentiment Score'},
];
const LEGEND = [
  {bg:'rgba(16,185,129,0.92)',label:'Strong Bull (≥+5)'},
  {bg:'rgba(16,185,129,0.55)',label:'Bullish (+2 to +5)'},
  {bg:'rgba(16,185,129,0.14)',label:'Mildly Bull'},
  {bg:'rgba(239,68,68,0.14)', label:'Mildly Bear'},
  {bg:'rgba(239,68,68,0.55)', label:'Bearish (−2 to −5)'},
  {bg:'rgba(239,68,68,0.92)', label:'Strong Bear (≤−5)'},
];

export default function Heatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('market_cap');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('heatmap');

  useEffect(() => { fetchHeatmap(); }, []);

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const res = await api.get('/market/heatmap');
      setData(res.data.heatmap);
      setLastUpdated(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = data
    .filter(s=>filter==='All'||s.status===filter)
    .sort((a,b)=>{
      if(sortBy==='market_cap') return (b.market_cap||0)-(a.market_cap||0);
      if(sortBy==='change_desc') return b.change_percent-a.change_percent;
      if(sortBy==='change_asc')  return a.change_percent-b.change_percent;
      if(sortBy==='score')       return b.sentiment_score-a.sentiment_score;
      return 0;
    });

  const TABS = [
    { id:'heatmap', label:'Price Heatmap', icon:Activity },
    { id:'news',    label:'News Sentiment', icon:Newspaper },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Header */}
      <div className="glass-panel" style={{ padding:'20px 26px', borderTop:'3px solid #3b82f6' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
              <div style={{ padding:'7px', background:'rgba(59,130,246,0.12)', borderRadius:'8px', border:'1px solid rgba(59,130,246,0.2)' }}>
                <Activity size={18} color="#3b82f6"/>
              </div>
              <h1 style={{ margin:0, fontSize:'1.15rem', fontWeight:'800', color:'#f0f6ff' }}>Live Market Sentiment</h1>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'20px', padding:'3px 10px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', animation:'pulse 2s infinite' }}/>
                <span style={{ fontSize:'0.68rem', color:'#10b981', fontWeight:'700' }}>NSE LIVE</span>
              </div>
            </div>
            <p style={{ margin:0, fontSize:'0.82rem', color:'#64748b' }}>Price heatmap + AI news sentiment for Nifty 50 stocks</p>
          </div>
          {activeTab==='heatmap' && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              {lastUpdated && <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.72rem', color:'#64748b' }}><Clock size={12}/> {lastUpdated}</div>}
              <button onClick={fetchHeatmap} disabled={loading}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:'8px', color:'#3b82f6', fontWeight:'700', fontSize:'0.82rem', cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1 }}>
                <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }}/>{loading?'Refreshing...':'Refresh'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'4px', gap:'4px', width:'fit-content' }}>
        {TABS.map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 20px', borderRadius:'9px', border:'none', background:activeTab===id?'rgba(59,130,246,0.15)':'transparent', color:activeTab===id?'#3b82f6':'#64748b', fontWeight:activeTab===id?'700':'500', fontSize:'0.84rem', cursor:'pointer', transition:'all 0.18s', borderBottom:activeTab===id?'2px solid #3b82f6':'2px solid transparent' }}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* ── HEATMAP TAB ── */}
      {activeTab==='heatmap' && (
        <>
          {!loading && data.length>0 && <SummaryBar data={data}/>}

          {!loading && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {FILTERS.map(f=>{
                  const active=filter===f;
                  const col=f==='Bullish'?'#10b981':f==='Bearish'?'#ef4444':f==='Neutral'?'#94a3b8':'#3b82f6';
                  const count=f==='All'?data.length:data.filter(s=>s.status===f).length;
                  return (
                    <button key={f} onClick={()=>setFilter(f)}
                      style={{ padding:'6px 14px', borderRadius:'20px', border:`1px solid ${active?col:'rgba(255,255,255,0.08)'}`, background:active?`${col}18`:'transparent', color:active?col:'#64748b', fontSize:'0.78rem', fontWeight:active?'700':'500', cursor:'pointer', transition:'all 0.15s' }}>
                      {f==='Bullish'?'▲ ':f==='Bearish'?'▼ ':f==='Neutral'?'─ ':''}{f} ({count})
                    </button>
                  );
                })}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'0.72rem', color:'#64748b' }}>Sort:</span>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#e2e8f0', padding:'6px 12px', fontSize:'0.78rem', cursor:'pointer', outline:'none' }}>
                  {SORTS.map(s=><option key={s.value} value={s.value} style={{ background:'#0f1623' }}>{s.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <div className="glass-panel" style={{ padding:'60px', textAlign:'center' }}>
              <Activity size={32} color="#3b82f6" style={{ animation:'spin 1s linear infinite', margin:'0 auto 16px', display:'block' }}/>
              <div style={{ color:'#64748b', fontSize:'0.9rem' }}>Fetching live market data & calculating sentiment scores...</div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap', padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em' }}>Legend:</span>
                {LEGEND.map(({bg,label})=>(
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <div style={{ width:'11px', height:'11px', borderRadius:'3px', background:bg, flexShrink:0 }}/>
                    <span style={{ fontSize:'0.67rem', color:'#64748b' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'12px' }}>
                {filtered.map((stock,i)=><StockCard key={i} stock={stock}/>)}
              </div>
              {filtered.length===0 && <div style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>No stocks match the selected filter.</div>}
            </>
          )}
        </>
      )}

      {/* ── NEWS SENTIMENT TAB ── */}
      {activeTab==='news' && <NewsSentimentTab/>}
    </div>
  );
}