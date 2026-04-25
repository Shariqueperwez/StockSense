import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, Bot, TrendingUp, Bell, LogOut, Zap, BookOpen,
  PieChart, X, Activity, Calculator, Calendar, BookMarked
} from 'lucide-react';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PaperTrading from './pages/PaperTrading';
import InvestorPortfolio from './pages/InvestorPortfolio';
import Copilot from './pages/Copilot';
import Heatmap from './pages/Heatmap';
import Allocator from './pages/Allocator';
import TradeJournal from './pages/TradeJournal';
import SIPCalculator from './pages/SIPCalculator';
import EconomicCalendar from './pages/EconomicCalendar';
import { ModeProvider, useMode } from './context/ModeContext';
import api from './api';

// ── Mode Toggle — switches mode AND redirects to dashboard ────────────────────
const ModeToggle = () => {
  const { mode, setMode } = useMode();
  const navigate = useNavigate();

  const switchMode = (newMode) => {
    setMode(newMode);
    navigate('/');   // always land on Dashboard of the chosen mode
  };

  return (
    <div style={{ display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'3px',gap:'2px' }}>
      <button onClick={() => switchMode('trader')} style={{ display:'flex',alignItems:'center',gap:'6px',padding:'6px 14px',borderRadius:'7px',border:'none',cursor:'pointer',fontSize:'0.8rem',fontWeight:'600',transition:'all 0.2s',background:mode==='trader'?'linear-gradient(135deg,#3b82f6,#1d4ed8)':'transparent',color:mode==='trader'?'white':'#64748b',boxShadow:mode==='trader'?'0 2px 10px rgba(59,130,246,0.4)':'none' }}>
        <Zap size={13}/> Trading
      </button>
      <button onClick={() => switchMode('investor')} style={{ display:'flex',alignItems:'center',gap:'6px',padding:'6px 14px',borderRadius:'7px',border:'none',cursor:'pointer',fontSize:'0.8rem',fontWeight:'600',transition:'all 0.2s',background:mode==='investor'?'linear-gradient(135deg,#10b981,#059669)':'transparent',color:mode==='investor'?'white':'#64748b',boxShadow:mode==='investor'?'0 2px 10px rgba(16,185,129,0.4)':'none' }}>
        <BookOpen size={13}/> Investment
      </button>
    </div>
  );
};

function NotificationPanel({ onClose, mode }) {
  const [movers, setMovers] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/market/movers').then(r=>setMovers(r.data)).catch(()=>setMovers(null)).finally(()=>setLoading(false));
  }, []);
  const notifications = [];
  if (movers?.gainers?.length>0) notifications.push({ type:'gain',icon:'🚀',title:'Top Gainer Today',body:`${movers.gainers[0].symbol} is up ${movers.gainers[0].percent_change?.toFixed(2)}%`,color:'#10b981' });
  if (movers?.losers?.length>0) notifications.push({ type:'loss',icon:'📉',title:'Top Loser Today',body:`${movers.losers[0].symbol} is down ${Math.abs(movers.losers[0].percent_change)?.toFixed(2)}%`,color:'#f43f5e' });
  if (mode==='trader') {
    notifications.push({ type:'tip',icon:'⚡',title:'Trading Tip',body:'Check your Trade Journal to review past trades and improve your edge.',color:'#3b82f6' });
    notifications.push({ type:'info',icon:'📊',title:'Market Update',body:'Use Paper Trading to test strategies risk-free before going live.',color:'#8b5cf6' });
  } else {
    notifications.push({ type:'tip',icon:'💡',title:'Investment Tip',body:'Use SIP Calculator to plan your monthly investment goals.',color:'#10b981' });
    notifications.push({ type:'info',icon:'📊',title:'Market Update',body:'NSE market data is live. Use Allocator to diversify your portfolio.',color:'#3b82f6' });
  }
  return (
    <div style={{ position:'absolute',top:'48px',right:0,width:'320px',background:'#0d1626',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',boxShadow:'0 20px 60px rgba(0,0,0,0.7)',zIndex:9999,overflow:'hidden' }}>
      <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <span style={{ fontWeight:'700',fontSize:'0.9rem',color:'#f0f6ff' }}>🔔 Notifications</span>
        <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#8899b4',cursor:'pointer',padding:'2px',display:'flex',alignItems:'center' }}><X size={14}/></button>
      </div>
      <div style={{ padding:'8px' }}>
        {loading ? <div style={{ padding:'20px',textAlign:'center',color:'#8899b4',fontSize:'0.82rem' }}>Loading...</div>
          : notifications.map((n,i) => (
            <div key={i} style={{ padding:'10px 12px',borderRadius:'10px',marginBottom:'6px',background:'rgba(0,0,0,0.3)',border:`1px solid ${n.color}18`,display:'flex',gap:'10px',alignItems:'flex-start' }}>
              <span style={{ fontSize:'1.1rem',flexShrink:0 }}>{n.icon}</span>
              <div>
                <div style={{ fontWeight:'600',fontSize:'0.82rem',color:n.color,marginBottom:'2px' }}>{n.title}</div>
                <div style={{ fontSize:'0.76rem',color:'#8899b4',lineHeight:'1.45' }}>{n.body}</div>
              </div>
            </div>
          ))}
      </div>
      <div style={{ padding:'10px 16px',borderTop:'1px solid rgba(255,255,255,0.07)',fontSize:'0.7rem',color:'#8899b4',textAlign:'center' }}>Live data updates every 2 minutes</div>
    </div>
  );
}

const TRADER_NAV = [
  { path:'/',             icon:LayoutDashboard, label:'Dashboard'     },
  { path:'/portfolio',    icon:Wallet,           label:'Paper Trade' },
  { path:'/journal',      icon:BookMarked,       label:'Journal' },
  { path:'/heatmap',      icon:Activity,         label:'Sentiment'     },
  { path:'/copilot',      icon:Bot,              label:'AI Copilot' },
];

const INVESTOR_NAV = [
  { path:'/',          icon:LayoutDashboard, label:'Dashboard'      },
  { path:'/portfolio', icon:Wallet,          label:'Portfolio'      },
  { path:'/allocator', icon:PieChart,        label:'Allocator'      },
  { path:'/sip',       icon:Calculator,      label:'SIP Calc' },
  { path:'/calendar',  icon:Calendar,        label:'Events'         },
  { path:'/copilot',   icon:Bot,             label:'AI Copilot'  },
];

const Navbar = ({ user, onLogout, onLogoClick }) => {
  const { mode } = useMode();
  const location = useLocation();
  const isActive = (path) => location.pathname===path ? 'active text-main' : 'text-muted';
  const initials = user?.full_name ? user.full_name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : 'SS';
  const displayName = user?.full_name || 'User';
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown',h);
    return () => document.removeEventListener('mousedown',h);
  }, []);
  const navItems = mode==='trader' ? TRADER_NAV : INVESTOR_NAV;
  return (
    <nav className="navbar" style={{ borderBottom:mode==='investor'?'2px solid rgba(16,185,129,0.25)':'2px solid rgba(59,130,246,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2" onClick={onLogoClick} style={{ cursor:'pointer' }}
          title="About StockSense">
          <div style={{ padding:'6px',background:mode==='investor'?'rgba(16,185,129,0.1)':'rgba(59,130,246,0.1)',borderRadius:'6px',transition:'all 0.3s' }}>
            <TrendingUp size={20} color={mode==='investor'?'#10b981':'#3b82f6'}/>
          </div>
          <h2 style={{ margin:0,fontSize:'1.1rem',color:'var(--text-main)',fontWeight:'800',letterSpacing:'-0.02em' }}>
            Stock<span style={{ color:mode==='investor'?'#10b981':'#3b82f6' }}>Sense</span>
          </h2>
        </div>
        <ModeToggle/>
        <div className="nav-links">
          {navItems.map(({path,icon:Icon,label}) => (
            <Link key={path+label} to={path} className={isActive(path)}>
              <Icon size={15} style={{ marginRight:'5px',display:'inline-block',verticalAlign:'middle' }}/>{label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div style={{ display:'flex',alignItems:'center',gap:'8px',background:'var(--bg-dark)',padding:'5px 12px',borderRadius:'16px',border:'1px solid var(--border-color)',fontSize:'0.78rem' }}>
          <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:'#10b981',animation:'pulse 2s infinite' }}/>
          NSE Live
        </div>
        <div style={{ position:'relative' }} ref={notifRef}>
          <button onClick={()=>setShowNotif(v=>!v)} title="Notifications"
            style={{ background:showNotif?'rgba(255,255,255,0.08)':'transparent',border:'1px solid '+(showNotif?'rgba(255,255,255,0.15)':'transparent'),borderRadius:'8px',padding:'6px 8px',cursor:'pointer',display:'flex',alignItems:'center',position:'relative',transition:'all 0.15s' }}>
            <Bell size={17} color={showNotif?'#f0f6ff':'#64748b'}/>
            <span style={{ position:'absolute',top:'3px',right:'3px',width:'7px',height:'7px',background:'#f43f5e',borderRadius:'50%',border:'1px solid #0d1626' }}/>
          </button>
          {showNotif && <NotificationPanel onClose={()=>setShowNotif(false)} mode={mode}/>}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:'10px',marginLeft:'16px',paddingLeft:'16px',borderLeft:'1px solid rgba(255,255,255,0.08)' }}>
          {/* Avatar */}
          <div style={{ position:'relative',flexShrink:0 }}>
            <div style={{ width:'36px',height:'36px',borderRadius:'50%',background:mode==='investor'?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:'800',color:'white',letterSpacing:'0.02em',border:'2px solid rgba(255,255,255,0.1)',transition:'all 0.3s' }}>{initials}</div>
            <div style={{ position:'absolute',bottom:'0',right:'0',width:'9px',height:'9px',borderRadius:'50%',background:'#10b981',border:'2px solid #0d1626' }}/>
          </div>
          {/* Name + badge */}
          <div style={{ display:'flex',flexDirection:'column',gap:'3px' }}>
            <div style={{ fontSize:'0.83rem',fontWeight:'700',color:'#f0f6ff',maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:'1' }}>{displayName}</div>
            <div style={{ display:'inline-flex',alignItems:'center',gap:'4px',background:mode==='investor'?'rgba(16,185,129,0.12)':'rgba(59,130,246,0.12)',border:`1px solid ${mode==='investor'?'rgba(16,185,129,0.25)':'rgba(59,130,246,0.25)'}`,borderRadius:'20px',padding:'2px 8px',width:'fit-content' }}>
              <span style={{ fontSize:'0.62rem',fontWeight:'700',color:mode==='investor'?'#10b981':'#3b82f6',letterSpacing:'0.04em',textTransform:'uppercase' }}>{mode==='investor'?'Investor':'Trader'}</span>
              <span style={{ width:'1px',height:'8px',background:'rgba(255,255,255,0.15)' }}/>
              <span style={{ fontSize:'0.62rem',color:'#64748b',fontWeight:'500' }}>Free</span>
            </div>
          </div>
          {/* Logout */}
          <button onClick={onLogout} title="Logout"
            style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'7px',color:'#64748b',cursor:'pointer',display:'flex',alignItems:'center',transition:'all 0.15s',marginLeft:'2px' }}
            onMouseOver={e=>{e.currentTarget.style.background='rgba(244,63,94,0.1)';e.currentTarget.style.color='#f87171';e.currentTarget.style.borderColor='rgba(244,63,94,0.2)'}}
            onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='#64748b';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}}>
            <LogOut size={14}/>
          </button>
        </div>
      </div>
    </nav>
  );
};

// ── Route that picks the right portfolio page based on mode ──────────────────
// Keep Dashboard always mounted — never unmounts so state persists across navigation
function PersistentDashboard({ user }) {
  const location = useLocation();
  const isVisible = location.pathname === '/';
  return (
    <div style={{ display: isVisible ? 'block' : 'none' }}>
      <Dashboard />
    </div>
  );
}

// Keep Portfolio always mounted too — persists investment/trading state
function PersistentPortfolio({ user }) {
  const location = useLocation();
  const { mode } = useMode();
  const isVisible = location.pathname === '/portfolio';
  return (
    <div style={{ display: isVisible ? 'block' : 'none' }}>
      {mode === 'investor' ? <InvestorPortfolio user={user} /> : <PaperTrading user={user} />}
    </div>
  );
}

const PortfolioRoute = ({ user }) => {
  const { mode } = useMode();
  return mode === 'investor' ? <InvestorPortfolio user={user} /> : <PaperTrading user={user} />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
    // Show landing page on fresh visit unless user has seen it this session
    return !sessionStorage.getItem('seen_landing');
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (redirectToDashboard = false) => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setIsAuthenticated(true);
      sessionStorage.setItem('session_active', '1'); // mark session as active
      if (redirectToDashboard) {
        window.location.replace('/');  // hard redirect to dashboard on login
      }
    } catch {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const sessionActive = sessionStorage.getItem('session_active');
    // Only auto-login if user actively logged in this browser session
    // Fresh browser open (new tab/window) always shows login page
    if (token && sessionActive) {
      fetchUser();
    } else {
      // Clear any stale token on fresh open
      if (!sessionActive) localStorage.removeItem('token');
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('session_active');
    setIsAuthenticated(false);
    setUser(null);
    window.location.replace('/');  // always go to root on logout
  };

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg-dark)',color:'var(--text-muted)',fontSize:'0.9rem' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'2rem',marginBottom:'12px',fontWeight:'800' }}>Stock<span style={{ color:'#3b82f6' }}>Sense</span></div>
        <div>Loading your dashboard...</div>
      </div>
    </div>
  );

  return (
    <ModeProvider>
      <Router>
        {showLanding ? (
          <LandingPage onEnter={() => {
            sessionStorage.setItem('seen_landing', '1');
            setShowLanding(false);
          }} />
        ) : !isAuthenticated ? (
          <AuthPage onLogin={() => fetchUser(true)}/>
        ) : (
          <div style={{ background:'var(--bg-dark)',minHeight:'100vh' }}>
            <Navbar user={user} onLogout={handleLogout} onLogoClick={()=>setShowLanding(true)}/>
            <div className="container mt-4">
              <PersistentDashboard user={user} />
              <PersistentPortfolio user={user} />
              <Routes>
                <Route path="/"             element={<></>}/>
                <Route path="/allocator"    element={<Allocator/>}/>
                <Route path="/portfolio"    element={<></>}/>
                <Route path="/copilot"      element={<Copilot/>}/>
                <Route path="/heatmap"      element={<Heatmap/>}/>
                <Route path="/journal"      element={<TradeJournal/>}/>
                <Route path="/sip"          element={<SIPCalculator/>}/>
                <Route path="/calendar"     element={<EconomicCalendar/>}/>
                <Route path="*"             element={<Navigate to="/"/>}/>
              </Routes>
            </div>
          </div>
        )}
      </Router>
    </ModeProvider>
  );
}

export default App;