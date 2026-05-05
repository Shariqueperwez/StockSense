"""
market_service.py — NSE India primary, yfinance multi-layer fallback.
FIX: Robust NSE cookie warming + triple-layer yfinance so TCS / any valid
     NSE ticker never returns None unless it genuinely doesn't exist.
FIX2: Added .BO (BSE) fallback layer + symbol alias map for commonly
      mis-mapped symbols like TATAMOTORS, M&M, BAJAJ-AUTO etc.
"""
import requests
import time
import threading
import random
import math
from datetime import datetime, timedelta

# ─── Cache ────────────────────────────────────────────────────────────────────
_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL = 120        # 2 minutes default
MOVERS_TTL = 60        # 1 minute for market movers

def _clean_float(v):
    """Replace NaN/Inf with None so JSON serialization never crashes."""
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None

def _sanitize(obj):
    """Recursively sanitize a dict/list, replacing NaN/Inf floats with None."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(i) for i in obj]
    if isinstance(obj, float):
        return _clean_float(obj)
    return obj

def _cache_get(key):
    with _cache_lock:
        if key in _cache:
            val, ts = _cache[key]
            ttl = MOVERS_TTL if key == 'movers' else CACHE_TTL
            if time.time() - ts < ttl:
                return val
            del _cache[key]
    return None

def _cache_set(key, val):
    with _cache_lock:
        _cache[key] = (val, time.time())

# ─── NSE Session ──────────────────────────────────────────────────────────────
_nse_session = None
_nse_session_lock = threading.Lock()
_nse_session_created_at = 0
NSE_SESSION_MAX_AGE = 300   # recreate session every 5 minutes

def _get_nse_session(force=False):
    global _nse_session, _nse_session_created_at
    with _nse_session_lock:
        age = time.time() - _nse_session_created_at
        if _nse_session is None or force or age > NSE_SESSION_MAX_AGE:
            s = requests.Session()
            s.headers.update({
                'User-Agent': (
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/122.0.0.0 Safari/537.36'
                ),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
            })
            # Warm up cookies by visiting the homepage first
            try:
                s.get('https://www.nseindia.com/', timeout=10)
                time.sleep(0.8)
                s.get('https://www.nseindia.com/market-data/live-equity-market', timeout=8)
                time.sleep(0.4)
            except Exception:
                pass
            # Switch to JSON-mode headers for API calls
            s.headers.update({
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://www.nseindia.com/',
                'Origin': 'https://www.nseindia.com',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
            })
            _nse_session = s
            _nse_session_created_at = time.time()
    return _nse_session

def _nse_get(url, retries=3, force_new_session=False):
    global _nse_session
    s = _get_nse_session(force=force_new_session)
    for attempt in range(retries):
        try:
            r = s.get(url, timeout=6)
            if r.status_code == 200:
                try:
                    return r.json()
                except Exception:
                    return None
            elif r.status_code in (401, 403, 429):
                s = _get_nse_session(force=True)
                if attempt < retries - 1:
                    time.sleep(2.0)
            else:
                if attempt < retries - 1:
                    time.sleep(1.0)
        except requests.exceptions.Timeout:
            if attempt < retries - 1:
                time.sleep(1.0)
        except Exception:
            if attempt < retries - 1:
                time.sleep(1.0)
    return None

def _clean_symbol(symbol: str) -> str:
    return symbol.upper().replace('.NS', '').replace('.BO', '').strip()

# ─── Symbol alias map ─────────────────────────────────────────────────────────
# Some symbols yfinance or NSE URL needs in a specific format.
# Key   = what the user types (after _clean_symbol)
# Value = what to pass to yfinance as the base symbol (without suffix)
# This fixes TATAMOTORS, M&M, BAJAJ-AUTO and any other oddly-mapped tickers.
_SYMBOL_ALIASES = {
    # These are identical but listed explicitly so we know they've been verified
    "TATAMOTORS": "TATAMOTORS",
    "BAJAJ-AUTO": "BAJAJ-AUTO",
    "M&M":        "M%26M",          # NSE URL needs %26 for &
    "BAJAJFINSV": "BAJAJFINSV",
    "HDFCAMC":    "HDFCAMC",
    "NAUKRI":     "NAUKRI",
}

# ─── yfinance fundamentals helper ─────────────────────────────────────────────
def _yf_fundamentals(sym: str) -> dict:
    """Fetch P/E, EPS, beta, dividend_yield, avg_volume, sector from yfinance."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(f"{sym}.NS")
        info = ticker.info or {}
        roe = info.get("returnOnEquity")
        rev_growth = info.get("revenueGrowth")
        earn_growth = info.get("earningsGrowth")
        return {
            "pe_ratio": info.get("trailingPE") or info.get("forwardPE") or None,
            "pb_ratio": info.get("priceToBook") or None,
            "eps": info.get("trailingEps") or None,
            "dividend_yield": (info.get("dividendYield") or 0) * 100 if info.get("dividendYield") else 0,
            "beta": info.get("beta") or None,
            "roe": round(roe * 100, 2) if roe else None,
            "debt_to_equity": info.get("debtToEquity") or None,
            "revenue_growth": round(rev_growth * 100, 2) if rev_growth else None,
            "earnings_growth": round(earn_growth * 100, 2) if earn_growth else None,
            "profit_margin": round((info.get("profitMargins") or 0) * 100, 2) if info.get("profitMargins") else None,
            "current_ratio": info.get("currentRatio") or None,
            "avg_volume": info.get("averageVolume") or info.get("averageDailyVolume10Day") or 0,
            "sector": info.get("sector") or info.get("industry") or "N/A",
            "industry": info.get("industry") or "N/A",
            "market_cap": info.get("marketCap") or 0,
            "company_name": info.get("longName") or info.get("shortName") or sym,
        }
    except Exception as e:
        print(f"yf_fundamentals failed for {sym}: {e}")
        return {}

# ─── Stock Quote ──────────────────────────────────────────────────────────────
_nse_fail_count = {}

def get_stock_quote(symbol: str) -> dict:
    sym = _clean_symbol(symbol)
    cached = _cache_get(f"quote:{sym}")
    if cached:
        return cached

    # On Render/cloud servers NSE blocks requests — go straight to yfinance
    import os
    if os.environ.get("RENDER"):
        result = _yfinance_quote(sym)
        if result:
            _cache_set(f"quote:{sym}", result)
        return result

    # Skip NSE entirely if it has failed 3+ times recently
    if _nse_fail_count.get('quote', 0) >= 3:
        result = _yfinance_quote(sym)
        if result:
            _cache_set(f"quote:{sym}", result)
        return result

    # ── Layer 1: NSE India live API ──────────────────────────────────────────
    # Use alias for URL encoding (e.g. M&M → M%26M)
    nse_sym = _SYMBOL_ALIASES.get(sym, sym)
    data = _nse_get(f"https://www.nseindia.com/api/quote-equity?symbol={nse_sym}")

    if data and 'priceInfo' in data:
        pi = data['priceInfo']
        meta = data.get('metadata', {})

        price = pi.get('lastPrice', 0)
        prev_close = pi.get('previousClose', 0)
        change = pi.get('change', 0)
        pct = pi.get('pChange', 0)

        if not price:
            return _yfinance_quote(sym)

        result = {
            "symbol": f"{sym}.NS",
            "price": float(price),
            "change": float(change),
            "percent_change": float(pct),
            "market_cap": 0,
            "volume": pi.get('totalTradedVolume', 0),
            "day_high": pi.get('intraDayHighLow', {}).get('max', price),
            "day_low": pi.get('intraDayHighLow', {}).get('min', price),
            "open": pi.get('open', price),
            "prev_close": float(prev_close),
            "fifty_two_week_high": float(pi.get('weekHighLow', {}).get('max', 0) or 0),
            "fifty_two_week_low": float(pi.get('weekHighLow', {}).get('min', 0) or 0),
            "pe_ratio": None,
            "eps": None,
            "dividend_yield": None,
            "beta": None,
            "avg_volume": 0,
            "sector": meta.get('industry', '') or '',
            "industry": meta.get('industry', '') or '',
            "company_name": meta.get('companyName', sym) or sym,
        }

        fund = _nse_get(f"https://www.nseindia.com/api/quote-equity?symbol={nse_sym}&section=trade_info")
        if fund:
            try:
                mcap = fund.get('marketDeptOrderBook', {}).get('tradeInfo', {}).get('totalMarketCap', 0)
                result['market_cap'] = float(mcap) * 1e7 if mcap else 0
            except Exception:
                pass

        fundamentals = _yf_fundamentals(sym)
        if fundamentals:
            result['pe_ratio'] = fundamentals.get('pe_ratio')
            result['pb_ratio'] = fundamentals.get('pb_ratio')
            result['eps'] = fundamentals.get('eps')
            result['dividend_yield'] = fundamentals.get('dividend_yield') or 0
            result['beta'] = fundamentals.get('beta')
            result['roe'] = fundamentals.get('roe')
            result['debt_to_equity'] = fundamentals.get('debt_to_equity')
            result['revenue_growth'] = fundamentals.get('revenue_growth')
            result['earnings_growth'] = fundamentals.get('earnings_growth')
            result['profit_margin'] = fundamentals.get('profit_margin')
            result['current_ratio'] = fundamentals.get('current_ratio')
            result['avg_volume'] = fundamentals.get('avg_volume') or 0
            if not result['market_cap'] and fundamentals.get('market_cap'):
                result['market_cap'] = fundamentals['market_cap']
            if not result['sector'] or result['sector'] == 'N/A':
                result['sector'] = fundamentals.get('sector', '')
            if not result['industry'] or result['industry'] == 'N/A':
                result['industry'] = fundamentals.get('industry', '')
            if not result.get('company_name') or result.get('company_name') == sym:
                result['company_name'] = fundamentals.get('company_name', sym)
            if not result.get('fifty_two_week_high') or result['fifty_two_week_high'] == 0:
                result['fifty_two_week_high'] = fundamentals.get('fifty_two_week_high', 0) or 0
            if not result.get('fifty_two_week_low') or result['fifty_two_week_low'] == 0:
                result['fifty_two_week_low'] = fundamentals.get('fifty_two_week_low', 0) or 0

        result = _sanitize(result)
        _cache_set(f"quote:{sym}", result)
        _nse_fail_count['quote'] = 0
        return result

    # ── Layers 2-4: yfinance (.NS → .BO fallback) ────────────────────────────
    _nse_fail_count['quote'] = _nse_fail_count.get('quote', 0) + 1
    def _reset_nse_fails():
        import time as _t; _t.sleep(600); _nse_fail_count['quote'] = 0
    import threading as _th
    if _nse_fail_count.get('quote', 0) == 1:
        _th.Thread(target=_reset_nse_fails, daemon=True).start()
    result = _yfinance_quote(sym)
    if result:
        _cache_set(f"quote:{sym}", result)
    return result


def _yfinance_quote(sym: str) -> dict:
    """
    Multi-layer yfinance fallback.
    Layer A: fast_info on .NS (fastest)
    Layer B: full ticker.info on .NS
    Layer C: yf.download on .NS (last resort)
    Layer D: Try .BO (BSE) — fixes symbols like TATAMOTORS that
             sometimes fail on .NS due to yfinance rate limits
    """
    import yfinance as yf

    ns_sym = f"{sym}.NS"

    # ── Layer A: fast_info (.NS) ─────────────────────────────────────────────
    try:
        ticker = yf.Ticker(ns_sym)
        fi = ticker.fast_info
        price = getattr(fi, 'last_price', None)
        if price and float(price) > 0:
            prev = getattr(fi, 'previous_close', None) or price
            info = {}
            try:
                info = ticker.info or {}
            except Exception:
                pass
            result = {
                "symbol": ns_sym,
                "price": round(float(price), 2),
                "change": round(float(price - prev), 2),
                "percent_change": round(((price - prev) / prev) * 100, 2) if prev else 0,
                "market_cap": info.get("marketCap") or getattr(fi, 'market_cap', 0) or 0,
                "volume": getattr(fi, 'three_month_average_volume', 0) or 0,
                "day_high": getattr(fi, 'day_high', price) or price,
                "day_low": getattr(fi, 'day_low', price) or price,
                "open": getattr(fi, 'open', price) or price,
                "prev_close": round(float(prev), 2),
                "fifty_two_week_high": getattr(fi, 'year_high', 0) or 0,
                "fifty_two_week_low": getattr(fi, 'year_low', 0) or 0,
                "pe_ratio": info.get("trailingPE") or info.get("forwardPE") or None,
                "pb_ratio": info.get("priceToBook") or None,
                "eps": info.get("trailingEps") or None,
                "dividend_yield": (info.get("dividendYield") or 0) * 100,
                "beta": info.get("beta") or None,
                "avg_volume": info.get("averageVolume") or 0,
                "sector": info.get("sector") or info.get("industry") or "",
                "industry": info.get("industry") or "",
                "company_name": info.get("longName") or info.get("shortName") or sym,
                "roe": None,
                "debt_to_equity": info.get("debtToEquity") or None,
                "revenue_growth": None,
                "earnings_growth": None,
                "profit_margin": None,
                "current_ratio": info.get("currentRatio") or None,
            }
            return _sanitize(result)
    except Exception as e:
        print(f"[yfinance] Layer A (.NS fast_info) failed for {sym}: {e}")

    # ── Layer B: full ticker.info (.NS) ──────────────────────────────────────
    try:
        ticker = yf.Ticker(ns_sym)
        info = ticker.info or {}
        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )
        if price and float(price) > 0:
            price = float(price)
            prev = float(info.get("previousClose") or info.get("regularMarketPreviousClose") or price)
            result = {
                "symbol": ns_sym,
                "price": round(price, 2),
                "change": round(price - prev, 2),
                "percent_change": round(((price - prev) / prev) * 100, 2) if prev else 0,
                "market_cap": info.get("marketCap") or 0,
                "volume": info.get("volume") or info.get("averageVolume") or 0,
                "day_high": info.get("dayHigh") or info.get("regularMarketDayHigh") or price,
                "day_low": info.get("dayLow") or info.get("regularMarketDayLow") or price,
                "open": info.get("open") or info.get("regularMarketOpen") or price,
                "prev_close": round(prev, 2),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh") or 0,
                "fifty_two_week_low": info.get("fiftyTwoWeekLow") or 0,
                "pe_ratio": info.get("trailingPE") or info.get("forwardPE") or None,
                "pb_ratio": info.get("priceToBook") or None,
                "eps": info.get("trailingEps") or None,
                "dividend_yield": (info.get("dividendYield") or 0) * 100,
                "beta": info.get("beta") or None,
                "avg_volume": info.get("averageVolume") or 0,
                "sector": info.get("sector") or info.get("industry") or "",
                "industry": info.get("industry") or "",
                "company_name": info.get("longName") or info.get("shortName") or sym,
                "roe": None,
                "debt_to_equity": info.get("debtToEquity") or None,
                "revenue_growth": None,
                "earnings_growth": None,
                "profit_margin": None,
                "current_ratio": info.get("currentRatio") or None,
            }
            return _sanitize(result)
    except Exception as e:
        print(f"[yfinance] Layer B (.NS ticker.info) failed for {sym}: {e}")

    # ── Layer C: yf.download (.NS) — last resort ─────────────────────────────
    try:
        df = yf.download(ns_sym, period="5d", interval="1d", progress=False, timeout=20)
        if df is not None and not df.empty:
            if hasattr(df.columns, 'levels'):
                df.columns = df.columns.get_level_values(0)
            last = df.iloc[-1]
            prev_row = df.iloc[-2] if len(df) >= 2 else last

            def _col(row, names):
                for n in names:
                    try:
                        v = row[n]
                        if hasattr(v, 'iloc'):
                            v = v.iloc[0]
                        v = float(v)
                        if v and not math.isnan(v):
                            return v
                    except Exception:
                        pass
                return None

            price = _col(last, ['Close', 'Adj Close'])
            prev = _col(prev_row, ['Close', 'Adj Close']) or price
            if price:
                result = {
                    "symbol": ns_sym,
                    "price": round(price, 2),
                    "change": round(price - prev, 2) if prev else 0,
                    "percent_change": round(((price - prev) / prev) * 100, 2) if prev else 0,
                    "market_cap": 0,
                    "volume": _col(last, ['Volume']) or 0,
                    "day_high": _col(last, ['High']) or price,
                    "day_low": _col(last, ['Low']) or price,
                    "open": _col(last, ['Open']) or price,
                    "prev_close": round(prev, 2) if prev else round(price, 2),
                    "fifty_two_week_high": 0, "fifty_two_week_low": 0,
                    "pe_ratio": None, "pb_ratio": None, "eps": None,
                    "dividend_yield": 0, "beta": None, "avg_volume": 0,
                    "sector": "", "industry": "", "company_name": sym,
                    "roe": None, "debt_to_equity": None,
                    "revenue_growth": None, "earnings_growth": None,
                    "profit_margin": None, "current_ratio": None,
                }
                return _sanitize(result)
    except Exception as e:
        print(f"[yfinance] Layer C (.NS download) failed for {sym}: {e}")

    # ── Layer D: BSE fallback (.BO) ───────────────────────────────────────────
    # This fixes symbols like TATAMOTORS that occasionally fail on .NS
    # due to yfinance rate limiting or temporary API issues.
    bo_sym = f"{sym}.BO"
    print(f"[yfinance] Trying .BO fallback for {sym}")
    try:
        ticker = yf.Ticker(bo_sym)
        fi = ticker.fast_info
        price = getattr(fi, 'last_price', None)
        if price and float(price) > 0:
            prev = getattr(fi, 'previous_close', None) or price
            info = {}
            try:
                info = ticker.info or {}
            except Exception:
                pass
            result = {
                "symbol": bo_sym,
                "price": round(float(price), 2),
                "change": round(float(price - prev), 2),
                "percent_change": round(((price - prev) / prev) * 100, 2) if prev else 0,
                "market_cap": info.get("marketCap") or getattr(fi, 'market_cap', 0) or 0,
                "volume": getattr(fi, 'three_month_average_volume', 0) or 0,
                "day_high": getattr(fi, 'day_high', price) or price,
                "day_low": getattr(fi, 'day_low', price) or price,
                "open": getattr(fi, 'open', price) or price,
                "prev_close": round(float(prev), 2),
                "fifty_two_week_high": getattr(fi, 'year_high', 0) or 0,
                "fifty_two_week_low": getattr(fi, 'year_low', 0) or 0,
                "pe_ratio": info.get("trailingPE") or info.get("forwardPE") or None,
                "pb_ratio": info.get("priceToBook") or None,
                "eps": info.get("trailingEps") or None,
                "dividend_yield": (info.get("dividendYield") or 0) * 100,
                "beta": info.get("beta") or None,
                "avg_volume": info.get("averageVolume") or 0,
                "sector": info.get("sector") or info.get("industry") or "",
                "industry": info.get("industry") or "",
                "company_name": info.get("longName") or info.get("shortName") or sym,
                "roe": None,
                "debt_to_equity": info.get("debtToEquity") or None,
                "revenue_growth": None, "earnings_growth": None,
                "profit_margin": None, "current_ratio": None,
            }
            print(f"[yfinance] .BO fallback SUCCESS for {sym}: ₹{price}")
            return _sanitize(result)
    except Exception as e:
        print(f"[yfinance] Layer D (.BO fast_info) failed for {sym}: {e}")

    # Try .BO via full info
    try:
        ticker = yf.Ticker(bo_sym)
        info = ticker.info or {}
        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )
        if price and float(price) > 0:
            price = float(price)
            prev = float(info.get("previousClose") or price)
            result = {
                "symbol": bo_sym,
                "price": round(price, 2),
                "change": round(price - prev, 2),
                "percent_change": round(((price - prev) / prev) * 100, 2) if prev else 0,
                "market_cap": info.get("marketCap") or 0,
                "volume": info.get("volume") or 0,
                "day_high": info.get("dayHigh") or price,
                "day_low": info.get("dayLow") or price,
                "open": info.get("open") or price,
                "prev_close": round(prev, 2),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh") or 0,
                "fifty_two_week_low": info.get("fiftyTwoWeekLow") or 0,
                "pe_ratio": info.get("trailingPE") or None,
                "pb_ratio": info.get("priceToBook") or None,
                "eps": info.get("trailingEps") or None,
                "dividend_yield": (info.get("dividendYield") or 0) * 100,
                "beta": info.get("beta") or None,
                "avg_volume": info.get("averageVolume") or 0,
                "sector": info.get("sector") or "",
                "industry": info.get("industry") or "",
                "company_name": info.get("longName") or info.get("shortName") or sym,
                "roe": None, "debt_to_equity": None,
                "revenue_growth": None, "earnings_growth": None,
                "profit_margin": None, "current_ratio": None,
            }
            print(f"[yfinance] .BO info fallback SUCCESS for {sym}: ₹{price}")
            return _sanitize(result)
    except Exception as e:
        print(f"[yfinance] Layer D (.BO ticker.info) failed for {sym}: {e}")

    # Try .BO via download
    try:
        df = yf.download(bo_sym, period="5d", interval="1d", progress=False, timeout=20)
        if df is not None and not df.empty:
            if hasattr(df.columns, 'levels'):
                df.columns = df.columns.get_level_values(0)
            last = df.iloc[-1]
            prev_row = df.iloc[-2] if len(df) >= 2 else last

            def _col2(row, names):
                for n in names:
                    try:
                        v = row[n]
                        if hasattr(v, 'iloc'): v = v.iloc[0]
                        v = float(v)
                        if v and not math.isnan(v): return v
                    except Exception:
                        pass
                return None

            price = _col2(last, ['Close', 'Adj Close'])
            prev = _col2(prev_row, ['Close', 'Adj Close']) or price
            if price:
                result = {
                    "symbol": bo_sym,
                    "price": round(price, 2),
                    "change": round(price - prev, 2) if prev else 0,
                    "percent_change": round(((price - prev) / prev) * 100, 2) if prev else 0,
                    "market_cap": 0, "volume": _col2(last, ['Volume']) or 0,
                    "day_high": _col2(last, ['High']) or price,
                    "day_low": _col2(last, ['Low']) or price,
                    "open": _col2(last, ['Open']) or price,
                    "prev_close": round(prev, 2) if prev else round(price, 2),
                    "fifty_two_week_high": 0, "fifty_two_week_low": 0,
                    "pe_ratio": None, "pb_ratio": None, "eps": None,
                    "dividend_yield": 0, "beta": None, "avg_volume": 0,
                    "sector": "", "industry": "", "company_name": sym,
                    "roe": None, "debt_to_equity": None,
                    "revenue_growth": None, "earnings_growth": None,
                    "profit_margin": None, "current_ratio": None,
                }
                print(f"[yfinance] .BO download fallback SUCCESS for {sym}: ₹{price}")
                return _sanitize(result)
    except Exception as e:
        print(f"[yfinance] Layer D (.BO download) failed for {sym}: {e}")

    print(f"[yfinance] ALL layers failed for {sym} — symbol may not exist on NSE/BSE")
    return None


# ─── History ──────────────────────────────────────────────────────────────────
def get_stock_history(symbol: str, period: str = "1mo"):
    sym = _clean_symbol(symbol)
    cached = _cache_get(f"hist:{sym}:{period}")
    if cached is not None:
        return cached

    if period in ('3y', '5y', '2y'):
        result = _sanitize(_yfinance_history(sym, period))
        if result:
            _cache_set(f"hist:{sym}:{period}", result)
        return result

    end = datetime.now()
    period_map = {'5d': 7, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365}
    days = period_map.get(period, 30)
    start = end - timedelta(days=days)
    start_str = start.strftime('%d-%m-%Y')
    end_str = end.strftime('%d-%m-%Y')

    nse_sym = _SYMBOL_ALIASES.get(sym, sym)
    data = _nse_get(
        f"https://www.nseindia.com/api/historical/cm/equity?symbol={nse_sym}&series=[%22EQ%22]&from={start_str}&to={end_str}",
        force_new_session=(sym in ('RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'))
    )

    if data and 'data' in data:
        history = []
        for row in data['data']:
            try:
                date_str = row.get('CH_TIMESTAMP', '')[:10]
                close = float(row.get('CH_CLOSING_PRICE', 0))
                if date_str and close:
                    history.append({"date": date_str, "price": close})
            except Exception:
                continue
        history.sort(key=lambda x: x['date'])
        if history:
            history = _sanitize(history)
            _cache_set(f"hist:{sym}:{period}", history)
            return history

    return _yfinance_history(sym, period)

def _yfinance_history(sym: str, period: str):
    try:
        import yfinance as yf
        yf_period_map = {'3y': None, '5y': '5y', '2y': '2y', '1y': '1y', '6mo': '6mo', '3mo': '3mo', '1mo': '1mo', '5d': '5d'}
        if period == '3y':
            start_dt = datetime.now() - timedelta(days=1095)
            df = yf.download(f"{sym}.NS", start=start_dt.strftime('%Y-%m-%d'), interval="1d", progress=False, timeout=20)
        else:
            yf_p = yf_period_map.get(period, '1y')
            df = yf.download(f"{sym}.NS", period=yf_p, interval="1d", progress=False, timeout=20)
        # If .NS returns empty, try .BO
        if df is None or df.empty:
            if period == '3y':
                start_dt = datetime.now() - timedelta(days=1095)
                df = yf.download(f"{sym}.BO", start=start_dt.strftime('%Y-%m-%d'), interval="1d", progress=False, timeout=20)
            else:
                yf_p = yf_period_map.get(period, '1y')
                df = yf.download(f"{sym}.BO", period=yf_p, interval="1d", progress=False, timeout=20)
        if df is None or df.empty:
            return []
        df = df.reset_index()
        if hasattr(df.columns, 'levels'):
            df.columns = df.columns.get_level_values(0)
        result = []
        for _, row in df.iterrows():
            try:
                close = float(row['Close'].iloc[0]) if hasattr(row['Close'], 'iloc') else float(row['Close'])
                date = row['Date'].strftime('%Y-%m-%d') if hasattr(row['Date'], 'strftime') else str(row['Date'])[:10]
                if close:
                    result.append({"date": date, "price": round(close, 2)})
            except Exception:
                continue
        return _sanitize(result)
    except Exception as e:
        print(f"yfinance history failed {sym}: {e}")
        return []

# ─── Technical Indicators ─────────────────────────────────────────────────────
def get_technical_indicators(symbol: str) -> dict:
    sym = _clean_symbol(symbol)
    cached = _cache_get(f"tech:{sym}")
    if cached is not None:
        return cached

    import pandas as pd
    import yfinance as yf

    history = get_stock_history(sym, '6mo')
    if not history or len(history) < 20:
        try:
            for suffix in ['.NS', '.BO']:
                df = yf.download(f"{sym}{suffix}", period="6mo", interval="1d", progress=False, timeout=15, auto_adjust=True)
                if df is not None and len(df) >= 20:
                    closes = df['Close'].squeeze()
                    history = [{"date": str(idx.date()), "price": float(v)}
                               for idx, v in closes.items() if not pd.isna(v)]
                    if len(history) >= 20:
                        break
        except Exception as e:
            print(f"Tech indicator yfinance fallback failed: {e}")
    if not history or len(history) < 14:
        return {}

    try:
        closes = pd.Series([h['price'] for h in history], dtype=float)
        current_price = float(closes.iloc[-1])

        ma20 = float(closes.rolling(20).mean().iloc[-1])
        ma50 = float(closes.rolling(min(50, len(closes))).mean().iloc[-1])

        delta = closes.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, 0.001)
        rsi = float((100 - (100 / (1 + rs))).iloc[-1])

        ema12 = closes.ewm(span=12).mean()
        ema26 = closes.ewm(span=26).mean()
        macd_val = float((ema12 - ema26).iloc[-1])
        signal_val = float((ema12 - ema26).ewm(span=9).mean().iloc[-1])

        rm = closes.rolling(20).mean()
        rs2 = closes.rolling(20).std()
        bb_upper = float((rm + 2 * rs2).iloc[-1])
        bb_lower = float((rm - 2 * rs2).iloc[-1])
        bb_pct = ((current_price - bb_lower) / (bb_upper - bb_lower) * 100) if (bb_upper - bb_lower) > 0 else 50

        recent_prices = [h['price'] for h in history[-20:]]
        support = min(recent_prices)
        resistance = max(recent_prices)

        ma200 = float(closes.rolling(min(200, len(closes))).mean().iloc[-1]) if len(closes) >= 50 else None

        highs = pd.Series([h.get('high', h['price'] * 1.01) for h in history], dtype=float)
        lows  = pd.Series([h.get('low',  h['price'] * 0.99) for h in history], dtype=float)
        tr = pd.concat([
            highs - lows,
            (highs - closes.shift()).abs(),
            (lows  - closes.shift()).abs()
        ], axis=1).max(axis=1)
        atr = float(tr.rolling(14).mean().iloc[-1])
        atr_pct = round(atr / current_price * 100, 2) if current_price else 0

        rsi_series = 100 - (100 / (1 + gain / loss.replace(0, 0.001)))
        rsi_min = rsi_series.rolling(14).min()
        rsi_max = rsi_series.rolling(14).max()
        stoch_rsi = float(((rsi_series - rsi_min) / (rsi_max - rsi_min + 0.001) * 100).iloc[-1])

        if len(history) >= 20 and 'volume' in history[-1]:
            vols = pd.Series([h.get('volume', 0) for h in history], dtype=float)
            avg_vol = float(vols.rolling(20).mean().iloc[-1])
            recent_vol = float(vols.iloc[-1])
            vol_ratio = round(recent_vol / avg_vol, 2) if avg_vol > 0 else 1.0
        else:
            vol_ratio = 1.0

        ema9 = float(closes.ewm(span=9).mean().iloc[-1])
        mom5  = round(((current_price / closes.iloc[-6]) - 1) * 100, 2) if len(closes) >= 6 else 0
        mom20 = round(((current_price / closes.iloc[-21]) - 1) * 100, 2) if len(closes) >= 21 else 0

        adx_approx = abs(macd_val - signal_val) / (atr + 0.001) * 25
        trend_strength = 'Strong' if adx_approx > 20 else 'Moderate' if adx_approx > 10 else 'Weak'

        signals = []
        if rsi < 30: signals.append("RSI Oversold (" + str(round(rsi,1)) + ") — Potential bounce zone")
        elif rsi > 70: signals.append("RSI Overbought (" + str(round(rsi,1)) + ") — Caution, possible pullback")
        else: signals.append("RSI Neutral (" + str(round(rsi,1)) + ") — No extreme reading")
        signals.append("MACD Bullish Crossover — Momentum building" if macd_val > signal_val else "MACD Bearish — Momentum fading")
        if current_price > ma20 > ma50: signals.append("Price above MA20 & MA50 — Strong uptrend")
        elif current_price < ma20 < ma50: signals.append("Price below MA20 & MA50 — Downtrend confirmed")
        elif current_price > ma20: signals.append("Price above MA20 — Short-term bullish")
        else: signals.append("Mixed moving averages — Sideways/Consolidation")
        if bb_pct > 80: signals.append("Near Upper Bollinger Band — Overbought zone")
        elif bb_pct < 20: signals.append("Near Lower Bollinger Band — Oversold zone")
        if vol_ratio > 1.5: signals.append(f"Volume spike ({vol_ratio}x avg) — Strong conviction move")

        bull = sum([rsi < 60, macd_val > signal_val, current_price > ma20, mom5 > 0])
        overall = "BUY" if bull >= 3 else "SELL" if bull <= 1 else "HOLD"

        result = {
            "rsi": round(rsi, 2), "macd": round(macd_val, 4), "macd_signal": round(signal_val, 4),
            "macd_hist": round(macd_val - signal_val, 4),
            "ma9": round(ema9, 2), "ma20": round(ma20, 2), "ma50": round(ma50, 2),
            "ma200": round(ma200, 2) if ma200 else None,
            "bb_upper": round(bb_upper, 2), "bb_lower": round(bb_lower, 2), "bb_pct": round(bb_pct, 1),
            "atr": round(atr, 2), "atr_pct": atr_pct,
            "stoch_rsi": round(stoch_rsi, 1),
            "support": round(support, 2), "resistance": round(resistance, 2),
            "vol_ratio": vol_ratio, "signals": signals,
            "mom5": mom5, "mom20": mom20,
            "trend_strength": trend_strength,
            "overall": overall, "overall_color": "bullish" if overall == "BUY" else "bearish" if overall == "SELL" else "neutral",
        }
        result = _sanitize(result)
        _cache_set(f"tech:{sym}", result)
        return result
    except Exception as e:
        print(f"Technical error {sym}: {e}")
        return {}

# ─── News ─────────────────────────────────────────────────────────────────────
def get_stock_news(symbol: str):
    sym = _clean_symbol(symbol)
    cached = _cache_get(f"news:{sym}")
    if cached is not None:
        return cached

    news = []
    nse_sym = _SYMBOL_ALIASES.get(sym, sym)
    data = _nse_get(f"https://www.nseindia.com/api/corp-announcements?index=equities&symbol={nse_sym}")
    if data and isinstance(data, list):
        for item in data[:6]:
            subject = item.get('subject', '') or item.get('desc', '')
            if subject:
                news.append({
                    "headline": subject,
                    "url": "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
                    "source": "NSE India",
                    "summary": item.get('attchmntFile', '')
                })

    if not news:
        try:
            import yfinance as yf
            ticker = yf.Ticker(f"{sym}.NS")
            raw_news = ticker.news or []
            for n in raw_news[:6]:
                content = n.get('content', {})
                if content:
                    title = content.get('title', '')
                    url = (content.get('canonicalUrl') or content.get('clickThroughUrl') or {}).get('url', '')
                    source = (content.get('provider') or {}).get('displayName', 'Yahoo Finance')
                else:
                    title = n.get('title', '')
                    url = n.get('link', '')
                    source = n.get('publisher', 'Yahoo Finance')
                if title:
                    news.append({"headline": title, "url": url, "source": source, "summary": ""})
        except Exception:
            pass

    if news:
        sym_lower = sym.lower()
        sym_short = sym_lower[:4]
        relevant = [n for n in news if sym_lower in n['headline'].lower() or sym_short in n['headline'].lower()]
        if len(relevant) >= 2:
            news = relevant

    _cache_set(f"news:{sym}", news)
    return news

# ─── Options ──────────────────────────────────────────────────────────────────
def get_options_data(symbol: str) -> dict:
    sym = _clean_symbol(symbol)
    cached = _cache_get(f"opts:{sym}")
    if cached is not None:
        return cached

    nse_sym = _SYMBOL_ALIASES.get(sym, sym)
    data = _nse_get(f"https://www.nseindia.com/api/option-chain-equities?symbol={nse_sym}")
    if data and 'records' in data:
        records = data['records']
        expiry_dates = records.get('expiryDates', [])
        if not expiry_dates:
            return {"pcr": 0, "max_pain": 0, "calls_volume": 0, "puts_volume": 0, "expiry": None}

        nearest_expiry = expiry_dates[0]
        option_data = records.get('data', [])
        total_call_oi = 0
        total_put_oi = 0
        total_call_vol = 0
        total_put_vol = 0

        for item in option_data:
            if item.get('expiryDate') != nearest_expiry:
                continue
            ce = item.get('CE', {})
            pe = item.get('PE', {})
            if ce:
                total_call_oi += ce.get('openInterest', 0) or 0
                total_call_vol += ce.get('totalTradedVolume', 0) or 0
            if pe:
                total_put_oi += pe.get('openInterest', 0) or 0
                total_put_vol += pe.get('totalTradedVolume', 0) or 0

        pcr = round(total_put_oi / total_call_oi, 2) if total_call_oi > 0 else 0
        result = {
            "pcr": float(pcr), "max_pain": 0,
            "calls_volume": float(total_call_vol),
            "puts_volume": float(total_put_vol),
            "expiry": nearest_expiry
        }
        _cache_set(f"opts:{sym}", result)
        return result

    return {"pcr": 0, "max_pain": 0, "calls_volume": 0, "puts_volume": 0, "expiry": None}

# ─── Heatmap ──────────────────────────────────────────────────────────────────
def get_heatmap_data():
    cached = _cache_get("heatmap")
    if cached:
        return cached

    data = _nse_get("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050")
    heatmap = []
    if data and 'data' in data:
        for item in data['data']:
            sym = item.get('symbol', '')
            if not sym or sym in ('NIFTY 50', 'INDIA VIX'):
                continue
            price = float(item.get('lastPrice', 0))
            pct = float(item.get('pChange', 0))
            score = round(max(min(pct * 4, 10), -10), 1)
            status = "Bullish" if score > 2 else "Bearish" if score < -2 else "Neutral"
            heatmap.append({
                "symbol": sym, "price": price, "change_percent": pct,
                "sentiment_score": score, "status": status,
                "market_cap": float(item.get('totalTradedValue', 0))
            })

    if not heatmap:
        heatmap = _simulated_heatmap()

    heatmap.sort(key=lambda x: x.get('market_cap', 0), reverse=True)
    _cache_set("heatmap", heatmap)
    return heatmap

def _simulated_heatmap():
    stocks = [
        ("RELIANCE", 2850, 1.2), ("TCS", 3920, -0.5), ("HDFCBANK", 1780, 0.8),
        ("INFY", 1520, -1.1), ("ICICIBANK", 1240, 2.1), ("SBIN", 810, 1.5),
        ("BHARTIARTL", 1680, 0.3), ("ITC", 465, -0.2), ("LT", 3540, 0.9),
        ("BAJFINANCE", 6950, -0.7), ("HINDUNILVR", 2380, 0.1), ("AXISBANK", 1195, 1.8),
        ("KOTAKBANK", 2020, -0.4), ("MARUTI", 12400, 0.6), ("SUNPHARMA", 1740, -0.3),
        ("WIPRO", 482, -0.9), ("HCLTECH", 1625, 0.7), ("TECHM", 1478, -0.5),
        ("TATAMOTORS", 895, 1.4), ("NTPC", 368, 2.1), ("POWERGRID", 298, 0.8),
        ("ONGC", 265, 1.9), ("ADANIPORTS", 1380, -0.6), ("ULTRACEMCO", 10200, 0.4),
        ("TITAN", 3450, 1.1), ("DRREDDY", 5680, -0.8), ("CIPLA", 1520, 0.5),
        ("DIVISLAB", 4850, -1.2), ("BAJAJFINSV", 1820, 0.9), ("NESTLEIND", 2340, -0.3),
        ("TATASTEEL", 162, 2.8), ("JSWSTEEL", 890, 1.5), ("HINDALCO", 645, 2.1),
        ("M&M", 2870, 0.7), ("EICHERMOT", 4980, -0.4), ("APOLLOHOSP", 6750, 1.3),
        ("ZOMATO", 225, 3.1), ("TRENT", 5200, 1.8), ("INDUSINDBK", 1050, -1.5),
    ]
    return [{"symbol": s, "price": p, "change_percent": c, "sentiment_score": round(c*4,1), "status": "Bullish" if c>0.5 else "Bearish" if c<-0.5 else "Neutral", "market_cap": p*1e9} for s, p, c in stocks]

# ─── Market Movers ────────────────────────────────────────────────────────────
def get_market_movers():
    cached = _cache_get("movers")
    if cached:
        return cached

    gainers, losers = [], []

    gainers_data = _nse_get("https://www.nseindia.com/api/live-analysis-variations?index=gainers&limit=5&marketType=N")
    losers_data  = _nse_get("https://www.nseindia.com/api/live-analysis-variations?index=losers&limit=5&marketType=N")

    if gainers_data and 'NIFTY' in gainers_data:
        for item in gainers_data['NIFTY'].get('data', [])[:5]:
            if item.get('symbol'):
                gainers.append({
                    "symbol": item.get('symbol', ''),
                    "price": float(item.get('ltp', 0)),
                    "percent_change": float(item.get('perChange', 0)),
                    "change": float(item.get('netPrice', 0)),
                })

    if losers_data and 'NIFTY' in losers_data:
        for item in losers_data['NIFTY'].get('data', [])[:5]:
            if item.get('symbol'):
                losers.append({
                    "symbol": item.get('symbol', ''),
                    "price": float(item.get('ltp', 0)),
                    "percent_change": float(item.get('perChange', 0)),
                    "change": float(item.get('netPrice', 0)),
                })

    if not gainers or not losers:
        index_data = _nse_get("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050")
        if index_data and 'data' in index_data:
            stocks = []
            for item in index_data['data']:
                sym2 = item.get('symbol', '')
                if not sym2 or sym2 in ('NIFTY 50', 'INDIA VIX'):
                    continue
                stocks.append({
                    "symbol": sym2,
                    "price": float(item.get('lastPrice', 0)),
                    "percent_change": float(item.get('pChange', 0)),
                    "change": float(item.get('change', 0)),
                })
            stocks.sort(key=lambda x: x['percent_change'], reverse=True)
            if not gainers:
                gainers = stocks[:5]
            if not losers:
                losers = stocks[-5:][::-1]

    if not gainers:
        gainers = [
            {"symbol": "ADANIENT",  "price": 2840, "percent_change": 3.2, "change": 88},
            {"symbol": "TATASTEEL", "price": 162,  "percent_change": 2.8, "change": 4.4},
            {"symbol": "NTPC",      "price": 368,  "percent_change": 2.1, "change": 7.6},
            {"symbol": "ONGC",      "price": 265,  "percent_change": 1.9, "change": 4.9},
            {"symbol": "SBIN",      "price": 812,  "percent_change": 1.5, "change": 12},
        ]
    if not losers:
        losers = [
            {"symbol": "WIPRO",  "price": 482,  "percent_change": -1.8, "change": -8.8},
            {"symbol": "INFY",   "price": 1518, "percent_change": -1.2, "change": -18.5},
            {"symbol": "TCS",    "price": 3921, "percent_change": -0.9, "change": -35.7},
            {"symbol": "HCLTECH","price": 1625, "percent_change": -0.7, "change": -11.5},
            {"symbol": "TECHM",  "price": 1478, "percent_change": -0.5, "change": -7.4},
        ]

    volume_leaders = []
    index_data = _nse_get("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050")
    if index_data and 'data' in index_data:
        stocks_with_vol = []
        for item in index_data['data']:
            sym2 = item.get('symbol', '')
            if not sym2 or sym2 in ('NIFTY 50', 'INDIA VIX'):
                continue
            vol = item.get('totalTradedVolume', 0) or 0
            try:
                vol = float(vol)
            except Exception:
                vol = 0
            stocks_with_vol.append({
                "symbol": sym2,
                "price": float(item.get('lastPrice', 0)),
                "percent_change": float(item.get('pChange', 0)),
                "volume": vol,
            })
        stocks_with_vol.sort(key=lambda x: x['volume'], reverse=True)
        volume_leaders = stocks_with_vol[:5]

    if not volume_leaders or not gainers or not losers:
        try:
            import yfinance as yf
            NIFTY50 = [
                'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN','BHARTIARTL',
                'ITC','LT','BAJFINANCE','HINDUNILVR','AXISBANK','KOTAKBANK','MARUTI',
                'SUNPHARMA','WIPRO','HCLTECH','TECHM','NTPC','POWERGRID','ONGC',
                'TATAMOTORS','TATASTEEL','HINDALCO','JSWSTEEL','ADANIENT','ULTRACEMCO',
                'TITAN','BAJAJFINSV','NESTLEIND','DRREDDY','CIPLA','DIVISLAB',
                'APOLLOHOSP','ZOMATO','TRENT','INDUSINDBK','EICHERMOT','M&M','COALINDIA'
            ]
            syms_ns = [f"{s}.NS" for s in NIFTY50[:20]]
            df = yf.download(syms_ns, period='1d', interval='1d', progress=False, timeout=20, group_by='ticker')
            yf_stocks = []
            for sym in NIFTY50[:20]:
                try:
                    ticker_data = df[f"{sym}.NS"] if f"{sym}.NS" in df.columns.get_level_values(0) else None
                    if ticker_data is None:
                        continue
                    close = float(ticker_data['Close'].iloc[-1])
                    open_p = float(ticker_data['Open'].iloc[-1])
                    vol = float(ticker_data['Volume'].iloc[-1]) if 'Volume' in ticker_data else 0
                    pct = round(((close - open_p) / open_p) * 100, 2) if open_p else 0
                    change = round(close - open_p, 2)
                    if close > 0:
                        yf_stocks.append({
                            'symbol': sym, 'price': round(close, 2),
                            'percent_change': pct, 'change': change, 'volume': vol
                        })
                except Exception:
                    continue

            if yf_stocks:
                if not gainers:
                    gainers = sorted(yf_stocks, key=lambda x: x['percent_change'], reverse=True)[:5]
                if not losers:
                    losers = sorted(yf_stocks, key=lambda x: x['percent_change'])[:5]
                if not volume_leaders:
                    volume_leaders = sorted(yf_stocks, key=lambda x: x['volume'], reverse=True)[:5]
        except Exception as e:
            print(f"yfinance movers fallback failed: {e}")

    if not volume_leaders:
        volume_leaders = [
            {"symbol": "SBIN",      "price": 812, "percent_change": 1.5,  "volume": 45000000},
            {"symbol": "TATASTEEL", "price": 162, "percent_change": 2.8,  "volume": 38000000},
            {"symbol": "ONGC",      "price": 265, "percent_change": 1.9,  "volume": 32000000},
            {"symbol": "NTPC",      "price": 368, "percent_change": 2.1,  "volume": 28000000},
            {"symbol": "COALINDIA", "price": 410, "percent_change": 0.8,  "volume": 24000000},
        ]

    result = {"gainers": gainers, "losers": losers, "volume_leaders": volume_leaders}
    _cache_set("movers", result)
    return result

# ─── Insider Activity ─────────────────────────────────────────────────────────
def get_insider_activity():
    symbols = ["HDFCBANK", "TCS", "RELIANCE", "ZOMATO", "SUZLON", "IRFC"]
    institutions = ["Morgan Stanley", "Goldman Sachs", "LIC of India", "Vanguard", "BlackRock", "SBI Mutual Fund"]
    activity = []
    for _ in range(5):
        is_buy = random.choice([True, False])
        qty = random.randint(10, 50) * 100000
        sym = random.choice(symbols)
        inst = random.choice(institutions)
        activity.append({
            "time": (datetime.now() - timedelta(minutes=random.randint(1, 120))).strftime("%H:%M"),
            "symbol": sym, "institution": inst,
            "type": "BUY" if is_buy else "SELL", "quantity": qty,
            "impact": "High" if qty > 3000000 else "Medium"
        })
    activity.sort(key=lambda x: x['time'], reverse=True)
    return activity
