from fastapi import APIRouter, HTTPException
from services.market_service import (
    get_stock_quote, get_stock_history, get_stock_news,
    get_options_data, get_heatmap_data, get_insider_activity,
    get_market_movers, get_technical_indicators
)

router = APIRouter()

@router.get("/quote/{symbol}")
def quote(symbol: str):
    # market_service._clean_symbol handles stripping .NS/.BO
    data = get_stock_quote(symbol)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for '{symbol}'. NSE may be closed or symbol is invalid."
        )
    return data

@router.get("/history/{symbol}")
def history(symbol: str, period: str = "1mo"):
    data = get_stock_history(symbol, period)
    if not data:
        raise HTTPException(status_code=404, detail="History not found")
    return {"history": data}

@router.get("/news/{symbol}")
def news(symbol: str):
    data = get_stock_news(symbol)
    return {"news": data}

@router.get("/options/{symbol}")
def options(symbol: str):
    data = get_options_data(symbol)
    return data

@router.get("/heatmap")
def heatmap():
    data = get_heatmap_data()
    return {"heatmap": data}

@router.get("/insider-activity")
def insider_activity():
    data = get_insider_activity()
    return {"activity": data}

@router.get("/movers")
def movers():
    return get_market_movers()

@router.get("/technicals/{symbol}")
def technicals(symbol: str):
    data = get_technical_indicators(symbol)
    return {"technicals": data}

@router.get("/news-sentiment")
def news_sentiment(symbols: str = "RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,SBIN,BHARTIARTL,BAJFINANCE,MARUTI,ZOMATO"):
    from services.market_service import get_stock_news
    from services.groq_service import score_news_sentiment
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:10]
    results = []
    for sym in sym_list:
        news = get_stock_news(sym)
        if not news:
            continue
        headlines = [n['headline'] for n in news[:5]]
        scored = score_news_sentiment(sym, headlines)
        results.append(scored)
    return {"sentiment": results}