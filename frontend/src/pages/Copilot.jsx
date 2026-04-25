import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../api';
import { useMode } from '../context/ModeContext';

const QUICK_PROMPTS_TRADER = [
  { icon: '⚡', label: 'Best breakout stocks today', prompt: 'Which NSE stocks are showing strong breakout patterns today with high volume?' },
  { icon: '🛑', label: 'Explain stop loss placement', prompt: 'Explain how to place a stop loss for a breakout trade. Give me a simple example.' },
  { icon: '📊', label: 'How to read RSI', prompt: 'How should I use RSI to decide when to buy and sell? Explain it simply.' },
  { icon: '💰', label: 'Position sizing basics', prompt: 'How do I decide how many shares to buy per trade? Explain position sizing simply.' },
  { icon: '📈', label: 'Find momentum stocks', prompt: 'Find momentum stocks with high volume breakout in NSE right now.' },
  { icon: '🕐', label: 'Best time to trade', prompt: 'What are the best times of day to trade NSE stocks and why?' },
];

const QUICK_PROMPTS_INVESTOR = [
  { icon: '🏆', label: 'Top long-term picks', prompt: 'Find top quality NSE stocks suitable for a 5-10 year investment horizon with strong fundamentals.' },
  { icon: '💼', label: 'How to start investing', prompt: 'I am a complete beginner. How should I start investing in the Indian stock market with ₹10,000?' },
  { icon: '📊', label: 'P/E ratio explained', prompt: 'What is P/E ratio and how do I use it to decide if a stock is cheap or expensive? Give a simple example.' },
  { icon: '🛡️', label: 'Diversification guide', prompt: 'How should I diversify my portfolio across sectors? Give me a simple beginner-friendly strategy.' },
  { icon: '💰', label: 'SIP vs lumpsum', prompt: 'Should I invest via SIP or lumpsum in mutual funds and stocks? Which is better for a long-term investor?' },
  { icon: '🔍', label: 'Find undervalued stocks', prompt: 'Find fundamentally strong undervalued stocks with low PE and high ROE on NSE.' },
];

function ThesisCard({ thesis }) {
  if (!thesis) return null;
  const lines = thesis.split('\n');
  return (
    <div style={{ lineHeight: '1.7', fontSize: '0.87rem' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ') || line.startsWith('# ')) {
          return <div key={i} style={{ fontWeight: '800', fontSize: '0.95rem', color: '#60a5fa', marginTop: i > 0 ? '16px' : '0', marginBottom: '6px', borderBottom: '1px solid rgba(96,165,250,0.2)', paddingBottom: '4px' }}>{line.replace(/^#+\s/, '')}</div>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '5px', paddingLeft: '4px' }}><span style={{ color: '#60a5fa', flexShrink: 0 }}>•</span><span>{line.replace(/^[-•]\s/, '')}</span></div>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={i} style={{ fontWeight: '700', color: '#f0f6ff', marginBottom: '4px' }}>{line.replace(/\*\*/g, '')}</div>;
        }
        if (line.includes('**')) {
          return <div key={i} style={{ marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#f0f6ff">$1</strong>') }} />;
        }
        if (line.trim() === '') return <div key={i} style={{ height: '4px' }} />;
        return <div key={i} style={{ marginBottom: '4px', color: '#d0daea' }}>{line}</div>;
      })}
    </div>
  );
}

function StockCards({ stocks, intro }) {
  return (
    <div>
      <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#d0daea' }}>{intro}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stocks.map((s, idx) => (
          <div key={idx} style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '0.9rem' }}>{s.symbol?.replace('.NS', '')}</div>
              <div style={{ fontSize: '0.7rem', color: '#8899b4' }}>{s.company_name || ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700' }}>₹{Number(s.price).toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.75rem', color: s.percent_change >= 0 ? '#10b981' : '#ef4444', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                {s.percent_change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {s.percent_change >= 0 ? '+' : ''}{s.percent_change?.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Convert messages array into a plain-text history string for the AI
function buildHistoryContext(messages) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => {
      if (m.role === 'user') return `User: ${m.content}`;
      if (m.type === 'screener') {
        const symbols = m.stocks?.map(s => s.symbol?.replace('.NS', '')).join(', ') || '';
        return `Assistant: Showed stock results for — ${symbols}. Intro: "${m.intro}"`;
      }
      return `Assistant: ${m.content}`;
    })
    .join('\n');
}

export default function Copilot() {
  const { mode } = useMode();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const modeColor = mode === 'investor' ? '#10b981' : '#3b82f6';
  const quickPrompts = mode === 'trader' ? QUICK_PROMPTS_TRADER : QUICK_PROMPTS_INVESTOR;

  const welcomeMessage = mode === 'trader'
    ? `👋 Hey! I'm your **StockSense AI Copilot**, powered by Groq Llama 3.\n\nI'm here to help you:\n- 🎯 Find trading setups and signals\n- 📊 Understand technical indicators (RSI, MACD, Bollinger Bands)\n- 🛑 Plan stop losses and position sizing\n- ⚡ Find momentum & breakout stocks\n- 📋 Analyze any NSE/BSE stock\n\nJust type anything — I'll automatically search for stocks or answer your question!`
    : `👋 Hello! I'm your **StockSense AI Copilot**, powered by Groq Llama 3.\n\nI'm here to help you:\n- 💼 Find fundamentally strong stocks to invest in\n- 📊 Understand valuations (P/E, P/B, ROE)\n- 🏆 Build a long-term wealth-creating portfolio\n- 💰 Plan SIPs and investment goals\n- 🛡️ Understand risk and diversification\n\nJust type anything — I'll automatically find stocks or answer your question!`;

  useEffect(() => {
    setMessages([{ role: 'assistant', type: 'chat', content: welcomeMessage }]);
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', type: 'chat', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    // Build conversation history to send with the request
    const history = buildHistoryContext(newMessages);

    try {
      const res = await api.post('/ai/chat', { message: msg, context: history });
      const data = res.data;
      if (data.type === 'screener') {
        setMessages(prev => [...prev, { role: 'assistant', type: 'screener', stocks: data.stocks, intro: data.intro }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', type: 'chat', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', type: 'chat', content: '⚠️ Connection error. Please check your Groq API key in the backend .env file and ensure the backend is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', type: 'chat', content: 'Chat cleared! Ask me anything about stocks, trading, or investing.' }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>

      {/* Header */}
      <div className="glass-panel" style={{ padding: '14px 20px', borderTop: `3px solid ${modeColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: `linear-gradient(135deg, ${modeColor}, #8b5cf6)`, borderRadius: '50%', padding: '8px', display: 'flex' }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1rem' }}>StockSense AI Copilot</div>
            <div style={{ fontSize: '0.72rem', color: '#8899b4' }}>
              Powered by Groq Llama 3.3 70B · {mode === 'trader' ? '📈 Trader Mode' : '💼 Investor Mode'}
              <span style={{ marginLeft: '8px', padding: '1px 7px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', color: '#a78bfa', fontSize: '0.68rem' }}>
                ✨ Remembers conversation
              </span>
            </div>
          </div>
        </div>
        <button onClick={clearChat} title="Clear chat" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', color: '#8899b4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}>
          <RefreshCw size={13} /> Clear
        </button>
      </div>

      {/* Quick Prompts */}
      <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', display: 'flex', gap: '8px', flexShrink: 0 }}>
        {quickPrompts.map((p, i) => (
          <button key={i} onClick={() => sendMessage(p.prompt)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#d0daea', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
            onMouseOver={e => { e.currentTarget.style.borderColor = modeColor; e.currentTarget.style.color = modeColor; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#d0daea'; }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.1)' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg, ${modeColor}, #8b5cf6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
                <Bot size={14} color="white" />
              </div>
            )}
            <div style={{
              maxWidth: '75%', padding: '14px 18px', borderRadius: '16px',
              borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
              borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
              background: msg.role === 'user'
                ? `linear-gradient(135deg, ${modeColor}, ${mode === 'trader' ? '#1d4ed8' : '#059669'})`
                : 'rgba(15, 23, 42, 0.9)',
              border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              {msg.type === 'screener'
                ? <StockCards stocks={msg.stocks} intro={msg.intro} />
                : <ThesisCard thesis={msg.content} />
              }
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg, ${modeColor}, #8b5cf6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={14} color="white" />
            </div>
            <div style={{ padding: '14px 20px', borderRadius: '16px', borderBottomLeftRadius: '4px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: '8px', height: '8px', background: modeColor, borderRadius: '50%', animation: 'pulse 1s infinite', animationDelay: `${d * 0.2}s`, opacity: 0.7 }} />
              ))}
              <span style={{ fontSize: '0.78rem', color: '#8899b4', marginLeft: '6px' }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ marginBottom: '8px', fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '16px' }}>
          <span>💬 <strong style={{ color: '#8899b4' }}>Chat:</strong> "What is P/E ratio?" or "Why these stocks?"</span>
          <span>🔍 <strong style={{ color: '#8b5cf6' }}>Find stocks:</strong> "Find low PE IT stocks" or "Best dividend stocks"</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={mode === 'trader'
              ? 'Ask anything or say "find momentum stocks with high volume"...'
              : 'Ask anything or say "find undervalued stocks with low PE"...'}
            style={{ flex: 1, padding: '13px 16px', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f6ff', fontSize: '0.88rem' }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ padding: '0 20px', borderRadius: '12px', background: `linear-gradient(135deg, ${modeColor}, ${mode === 'trader' ? '#1d4ed8' : '#059669'})`, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={18} color="white" />
          </button>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#8899b4', marginTop: '6px', textAlign: 'center' }}>
          Press Enter to send · StockSense AI is for educational purposes only, not financial advice
        </div>
      </div>
    </div>
  );
}