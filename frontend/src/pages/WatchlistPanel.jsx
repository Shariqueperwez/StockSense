import React, { useState, useEffect } from 'react';
import { Star, X, Plus, TrendingUp, TrendingDown, Loader } from 'lucide-react';
import api from '../api';

export default function WatchlistPanel({ onSelectStock, currentSymbol, inline = false }) {
  const [items, setItems] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchWatchlist = async () => {
    try {
      const res = await api.get('/watchlist/');
      setItems(res.data.watchlist || []);
      res.data.watchlist?.forEach(async (item) => {
        try {
          const sym = item.symbol.replace(/\.NS$/i,'').replace(/\.BO$/i,'');
          const q = await api.get(`/market/quote/${sym}`);
          setPrices(prev => ({ ...prev, [item.symbol]: q.data }));
        } catch {}
      });
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWatchlist(); }, []);

  const addCurrent = async () => {
    if (!currentSymbol) return;
    const sym = currentSymbol.replace('.NS', '').replace('.BO', '');
    setAdding(true);
    try {
      await api.post('/watchlist/add', { symbol: sym, name: '' });
      await fetchWatchlist();
    } catch (e) {
      if (e.response?.data?.detail === 'Already in watchlist') alert('Already in watchlist!');
    } finally { setAdding(false); }
  };

  const remove = async (symbol) => {
    try {
      await api.delete(`/watchlist/remove/${symbol}`);
      setItems(prev => prev.filter(i => i.symbol !== symbol));
      setPrices(prev => { const n = { ...prev }; delete n[symbol]; return n; });
    } catch {}
  };

  if (inline) {
    // Inline grid mode for bottom of dashboard
    return (
      <div>
        {currentSymbol && (
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={addCurrent} disabled={adding}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: '600', cursor: adding ? 'not-allowed' : 'pointer' }}>
              {adding ? <Loader size={12} /> : <Plus size={12} />} Add {currentSymbol.replace('.NS','')} to Watchlist
            </button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{items.length} stocks tracked</span>
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px', fontSize: '0.82rem' }}>
            <Loader size={16} style={{ margin: '0 auto 6px', display: 'block' }} /> Loading...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '16px' }}>
            <Star size={24} color="#f59e0b" style={{ opacity: 0.3, marginBottom: '6px' }} />
            <div>No stocks in watchlist. Search a stock and add it above.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {items.map((item) => {
              const q = prices[item.symbol];
              const change = q?.percent_change;
              const isPositive = change >= 0;
              const isActive = currentSymbol?.replace('.NS','').replace('.BO','') === item.symbol;
              return (
                <div key={item.id} onClick={() => onSelectStock(item.symbol)}
                  style={{
                    padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                    border: `1px solid ${isActive ? '#f59e0b' : 'var(--border-color)'}`,
                    background: isActive ? 'rgba(245,158,11,0.06)' : 'rgba(0,0,0,0.2)',
                    transition: 'all 0.15s', position: 'relative',
                  }}
                  onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}>
                  <button onClick={e => { e.stopPropagation(); remove(item.symbol); }}
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.4 }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                    onMouseOut={e => e.currentTarget.style.opacity = 0.4}>
                    <X size={12} />
                  </button>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', fontFamily: 'monospace', marginBottom: '4px' }}>{item.symbol}</div>
                  {q ? (
                    <>
                      <div style={{ fontSize: '0.84rem', fontWeight: '600', marginBottom: '2px' }}>₹{Number(q.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: '600', color: isPositive ? 'var(--accent-teal)' : 'var(--accent-red)' }}>
                        {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isPositive ? '+' : ''}{change?.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Loading...</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Original sidebar mode (kept for compatibility)
  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={15} color="#f59e0b" fill="#f59e0b" />
          <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>Watchlist</span>
          <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: '700', padding: '1px 7px', borderRadius: '10px' }}>{items.length}</span>
        </div>
        {currentSymbol && (
          <button onClick={addCurrent} disabled={adding}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600', cursor: adding ? 'not-allowed' : 'pointer' }}>
            {adding ? <Loader size={11} /> : <Plus size={11} />} Add
          </button>
        )}
      </div>
      <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <Loader size={16} style={{ margin: '0 auto 6px', display: 'block' }} /> Loading...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px 18px', textAlign: 'center' }}>
            <Star size={28} color="#f59e0b" style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              No stocks yet.<br />Search a stock & click <strong style={{ color: '#f59e0b' }}>Add</strong> to save it.
            </div>
          </div>
        ) : (
          items.map((item) => {
            const q = prices[item.symbol];
            const change = q?.percent_change;
            const isPositive = change >= 0;
            const isActive = currentSymbol?.replace('.NS','').replace('.BO','') === item.symbol;
            return (
              <div key={item.id} onClick={() => onSelectStock(item.symbol)}
                style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isActive ? 'rgba(245,158,11,0.06)' : 'transparent', borderLeft: isActive ? '3px solid #f59e0b' : '3px solid transparent', transition: 'background 0.15s' }}
                onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', fontFamily: 'monospace' }}>{item.symbol}</div>
                  {q ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      ₹{Number(q.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  ) : <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Loading...</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {q && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: '600', color: isPositive ? 'var(--accent-teal)' : 'var(--accent-red)' }}>
                      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isPositive ? '+' : ''}{change?.toFixed(2)}%
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); remove(item.symbol); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                    onMouseOut={e => e.currentTarget.style.opacity = 0.5}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
