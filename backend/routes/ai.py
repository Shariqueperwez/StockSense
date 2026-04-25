from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from routes.auth import get_current_user
from services.groq_service import generate_trader_thesis, generate_investor_thesis, copilot_chat, ai_screener, generate_allocation_advice
from services.market_service import get_stock_quote, get_stock_news, get_options_data, get_technical_indicators

router = APIRouter()

# Keywords that indicate the user wants to screen/find stocks
SCREENER_KEYWORDS = [
    "find", "screen", "show me stocks", "which stocks", "list stocks",
    "stocks with", "stocks that", "best stocks", "top stocks", "give me stocks",
    "suggest stocks", "recommend stocks", "search stocks", "filter stocks",
    "low pe", "high roe", "low debt", "high growth", "dividend stocks",
    "midcap", "smallcap", "largecap", "undervalued", "beaten down",
    "momentum stocks", "breakout stocks", "fundamentally strong",
]

# Keywords that clearly indicate a follow-up/conversational question
FOLLOWUP_KEYWORDS = [
    "why", "explain", "what about", "tell me more", "how about",
    "which one", "which is better", "compare", "difference", "what do you think",
    "should i", "can i", "is it", "are they", "how much", "what is",
    "clarify", "elaborate", "more details", "why these", "why those",
]

def _is_screener_query(message: str) -> bool:
    msg = message.lower().strip()
    # If it looks like a follow-up, don't treat it as a screener query
    if any(kw in msg for kw in FOLLOWUP_KEYWORDS):
        return False
    return any(kw in msg for kw in SCREENER_KEYWORDS)


@router.get("/thesis/{symbol}")
def get_thesis(symbol: str, mode: str = Query("trader", enum=["trader", "investor"]), holding_days: int = Query(None)):
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail="Stock data not found")
    news = get_stock_news(symbol)

    if mode == "trader":
        options = get_options_data(symbol)
        try:
            technicals = get_technical_indicators(symbol)
        except Exception:
            technicals = {}
        try:
            thesis = generate_trader_thesis(symbol, quote['price'], news, options, technicals)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")
        return {"thesis": thesis, "mode": "trader"}
    else:
        try:
            thesis = generate_investor_thesis(symbol, quote['price'], news, quote, holding_days=holding_days)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")
        return {"thesis": thesis, "mode": "investor"}


@router.post("/chat")
def chat(request: schemas.ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Smart unified endpoint with conversation memory.
    - Receives the full conversation history in request.context
    - Auto-detects screener vs chat intent
    - Passes history to the AI so follow-up questions work correctly
    Returns: { type: "chat", reply: "..." } or { type: "screener", stocks: [...], intro: "..." }
    """
    # Build portfolio context
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.owner_id == current_user.id).all()
    portfolio_context = f"Balance: ₹{current_user.balance}. Holdings: " + ", ".join(
        [f"{p.quantity} shares of {p.symbol}" for p in portfolios]
    )
    if not portfolios:
        portfolio_context += "None."

    # Include conversation history in portfolio context so AI has full memory
    history = request.context or ""
    if history:
        full_context = f"{portfolio_context}\n\nConversation so far:\n{history}"
    else:
        full_context = portfolio_context

    # Decide: screener or chat
    if _is_screener_query(request.message):
        symbols = ai_screener(request.message)
        results = []
        for sym in symbols:
            quote = get_stock_quote(sym)
            if quote:
                results.append(quote)
        if results:
            return {
                "type": "screener",
                "stocks": results,
                "intro": f"Found {len(results)} stocks matching your criteria:"
            }
        else:
            # Fall through to chat if screener found nothing
            response = copilot_chat(request.message, full_context)
            return {"type": "chat", "reply": response}

    # Regular chat with full history context
    response = copilot_chat(request.message, full_context)
    return {"type": "chat", "reply": response}


@router.post("/screener")
def screener(request: schemas.ChatRequest):
    """Kept for backward compatibility."""
    symbols = ai_screener(request.message)
    results = []
    for sym in symbols:
        quote = get_stock_quote(sym)
        if quote:
            results.append(quote)
    return {"stocks": results}


@router.get("/allocation")
def allocation(amount: float = Query(...), risk: str = Query("moderate"), horizon: str = Query("1-3 years")):
    result = generate_allocation_advice(amount, risk, horizon)
    return result