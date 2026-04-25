import React, { useState } from 'react';
import { TrendingUp, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle, Zap, Shield, BarChart2, Activity } from 'lucide-react';
import api from '../api';

const FEATURES = [
  { icon: Zap, title: 'Learn Without Losing Money', desc: 'Practice with ₹10 Lakh virtual money — real NSE prices, zero financial risk', color: '#10b981' },
  { icon: BarChart2, title: 'AI Trade Signals', desc: 'Get BUY/SHORT signals with exact Entry, Stop Loss & Target — explained in plain language', color: '#3b82f6' },
  { icon: Shield, title: 'Paper Trading Terminal', desc: 'Intraday & Swing trading practice with leverage simulation. No real money involved.', color: '#8b5cf6' },
  { icon: Activity, title: 'Fundamentals & Portfolio', desc: 'Learn stock analysis, P/E valuation and build a practice portfolio stress-tested for crashes', color: '#f59e0b' },
];

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchTab = (toLogin, keepEmail = false) => {
    setIsLogin(toLogin);
    setError('');
    setSuccess('');
    setFullName('');
    setPassword('');
    setConfirmPassword('');
    if (!keepEmail) setEmail('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isLogin) {
      if (fullName.trim().length < 2) { setError('Please enter your full name (at least 2 characters).'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        // Store the token
        localStorage.setItem('token', res.data.access_token);
        // Notify parent to fetch user & authenticate
        onLogin();
      } else {
        await api.post('/auth/register', { email, password, full_name: fullName.trim() });
        // Show success, then switch to Sign In tab after a short delay
        setSuccess('🎉 Account created successfully! Please sign in to continue.');
        setTimeout(() => {
          switchTab(true, true);
        }, 1800);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail[0]?.msg || 'Validation error');
      else setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '12px 16px 12px 44px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050a14', fontFamily: "'Inter', sans-serif" }}>

      {/* ===== LEFT PANEL ===== */}
      <div style={{
        flex: 1, padding: '48px', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #050a14 0%, #0d1526 50%, #071120 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden'
      }}>
        {/* Glow effects */}
        <div style={{ position:'absolute', top:'-100px', left:'-100px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-50px', right:'-50px', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'64px', position:'relative', zIndex:1 }}>
          <div style={{ padding:'10px', background:'rgba(16,185,129,0.12)', borderRadius:'10px', border:'1px solid rgba(16,185,129,0.2)' }}>
            <TrendingUp size={22} color="#10b981" />
          </div>
          <div>
          <div style={{ fontWeight:'800', fontSize:'1.2rem', color:'#f1f5f9', letterSpacing:'-0.02em' }}>Stock<span style={{color:'#10b981'}}>Sense</span></div>
            <div style={{ fontSize:'0.72rem', color:'#64748b', letterSpacing:'0.05em' }}>NSE · BSE · Real-time Live Data</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'20px', padding:'5px 14px', marginBottom:'24px', width:'fit-content' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', animation:'pulse 2s infinite' }} />
            <span style={{ fontSize:'0.78rem', color:'#10b981', fontWeight:'500' }}>Real Data · AI Analysis · Virtual Trading</span>
          </div>

          <h1 style={{ fontSize:'3rem', lineHeight:'1.15', margin:'0 0 20px 0', fontWeight:'800', letterSpacing:'-1.5px' }}>
            Real market data,<br/>
            <span style={{ background:'linear-gradient(90deg, #10b981, #3b82f6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              smarter trading
            </span>
          </h1>
          <p style={{ fontSize:'1rem', color:'#64748b', lineHeight:'1.7', marginBottom:'48px', maxWidth:'420px' }}>
            Live NSE/BSE prices, real AI-powered signals and professional-grade analysis. Practice trades with virtual ₹10L before going live with real money.
          </p>

          {/* Feature list */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
                <div style={{ padding:'8px', borderRadius:'8px', background:`${color}15`, border:`1px solid ${color}25`, flexShrink:0, marginTop:'2px' }}>
                  <Icon size={16} color={color} />
                </div>
                <div>
                  <div style={{ fontWeight:'600', fontSize:'0.9rem', color:'#e2e8f0', marginBottom:'2px' }}>{title}</div>
                  <div style={{ fontSize:'0.78rem', color:'#64748b', lineHeight:'1.5' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display:'flex', gap:'32px', marginTop:'48px', paddingTop:'32px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            {[{value:'600+', label:'NSE Stocks'},{value:'₹10L', label:'Paper Trading'},{value:'Live', label:'Market Data'}].map(({ value, label }, i) => (
              <div key={i}>
                <div style={{ fontSize:'1.4rem', fontWeight:'800', color:'#f1f5f9', letterSpacing:'-0.5px' }}>{value}</div>
                <div style={{ fontSize:'0.75rem', color:'#64748b', marginTop:'2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize:'0.72rem', color:'#374151', position:'relative', zIndex:1 }}>
          ⚠️ Not SEBI registered. For educational & informational purposes only.
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div style={{ width:'480px', display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 40px', background:'#07101f', flexShrink:0 }}>
        <div style={{ width:'100%', maxWidth:'380px' }}>

          {/* Tab switcher */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', borderRadius:'12px', padding:'4px', marginBottom:'36px', border:'1px solid rgba(255,255,255,0.06)' }}>
            {['Sign In', 'Create Account'].map((label, i) => (
              <button key={label} onClick={() => switchTab(i === 0)}
                style={{ flex:1, padding:'10px', background: (i === 0) === isLogin ? 'rgba(255,255,255,0.07)' : 'transparent', border:'none', borderRadius:'9px', color: (i === 0) === isLogin ? '#f1f5f9' : '#64748b', fontSize:'0.88rem', fontWeight:'600', cursor:'pointer', transition:'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize:'1.5rem', fontWeight:'800', color:'#f1f5f9', marginBottom:'6px' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ fontSize:'0.84rem', color:'#64748b', marginBottom:'28px' }}>
            {isLogin ? 'Sign in to your trading terminal' : 'Start your investment journey today'}
          </p>

          {/* Error / Success */}
          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px', marginBottom:'16px' }}>
              <AlertCircle size={15} color="#f87171" />
              <span style={{ fontSize:'0.84rem', color:'#f87171' }}>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'10px', marginBottom:'16px' }}>
              <CheckCircle size={15} color="#10b981" />
              <span style={{ fontSize:'0.84rem', color:'#10b981' }}>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {/* Full name (register only) */}
            {!isLogin && (
              <div style={{ position:'relative' }}>
                <User size={16} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#64748b' }} />
                <input type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)}
                  required style={inputStyle} onFocus={e => e.target.style.borderColor='#10b981'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
              </div>
            )}

            {/* Email */}
            <div style={{ position:'relative' }}>
              <Mail size={16} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#64748b' }} />
              <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                required style={inputStyle} onFocus={e => e.target.style.borderColor='#10b981'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
            </div>

            {/* Password */}
            <div style={{ position:'relative' }}>
              <Lock size={16} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#64748b' }} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                required style={{ ...inputStyle, paddingRight: '44px' }} onFocus={e => e.target.style.borderColor='#10b981'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center' }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Confirm password (register only) */}
            {!isLogin && (
              <div style={{ position:'relative' }}>
                <Lock size={16} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#64748b' }} />
                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  required style={{ ...inputStyle, paddingRight: '44px' }} onFocus={e => e.target.style.borderColor='#10b981'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'13px', background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981, #059669)', border:'none', borderRadius:'10px', color:'white', fontWeight:'700', fontSize:'0.95rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop:'4px', transition:'all 0.2s', boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.35)' }}>
              {loading ? 'Please wait...' : isLogin ? <><ArrowRight size={17} /> Sign In</> : <><ArrowRight size={17} /> Create Account</>}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:'24px', fontSize:'0.82rem', color:'#64748b' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => switchTab(!isLogin)}
              style={{ background:'none', border:'none', color:'#10b981', fontWeight:'600', cursor:'pointer', fontSize:'0.82rem' }}>
              {isLogin ? 'Register free' : 'Sign in'}
            </button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'6px', justifyContent:'center', marginTop:'24px', fontSize:'0.72rem', color:'#374151' }}>
            🔒 Your data is encrypted & never sold.
          </div>
        </div>
      </div>
    </div>
  );
}