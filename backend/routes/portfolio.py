from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from database import get_db
import models, schemas
from routes.auth import get_current_user
from services.market_service import get_stock_quote
import yfinance as yf
import math
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request body schemas (fixes trade data leaking into URL/logs) ─────────────

class TradeRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20, description="NSE stock symbol e.g. TCS")
    quantity: float = Field(..., gt=0, description="Must be a positive number")


# ── Portfolio routes ──────────────────────────────────────────────────────────

@router.get("/", response_model=list[schemas.Portfolio])
def get_portfolio(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return current_user.portfolios


@router.post("/buy")
def buy_stock(
    trade: TradeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Buy a stock and add it to the user's portfolio.

    Fixes applied vs original:
    1. quantity is validated > 0 via Pydantic (negative quantity was a free-money exploit)
    2. symbol + quantity come from request body, not URL query params (prevents logging sensitive trade data)
    3. Full try/except with db.rollback() — if the DB commit fails mid-way, the
       user's balance is NOT permanently deducted without the shares being added.
    """
    symbol = trade.symbol.upper().strip()
    quantity = trade.quantity

    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=400, detail=f"Invalid symbol '{symbol}' or market data unavailable.")

    cost = round(quote['price'] * quantity, 2)
    if current_user.balance < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient funds. Required ₹{cost:,.2f}, available ₹{current_user.balance:,.2f}."
        )

    try:
        # 1. Deduct balance
        current_user.balance = round(current_user.balance - cost, 2)

        # 2. Update or create portfolio entry
        portfolio_item = db.query(models.Portfolio).filter(
            models.Portfolio.owner_id == current_user.id,
            models.Portfolio.symbol == symbol
        ).first()

        if portfolio_item:
            total_cost = (portfolio_item.quantity * portfolio_item.average_price) + cost
            portfolio_item.quantity = round(portfolio_item.quantity + quantity, 6)
            portfolio_item.average_price = round(total_cost / portfolio_item.quantity, 2)
        else:
            new_item = models.Portfolio(
                symbol=symbol,
                quantity=quantity,
                average_price=round(quote['price'], 2),
                owner_id=current_user.id
            )
            db.add(new_item)

        # 3. Record transaction
        transaction = models.Transaction(
            symbol=symbol,
            type="BUY",
            quantity=quantity,
            price=round(quote['price'], 2),
            owner_id=current_user.id
        )
        db.add(transaction)

        # 4. Commit everything atomically
        db.commit()
        logger.info(f"[Portfolio] BUY {quantity} x {symbol} @ ₹{quote['price']} for user {current_user.id}")

    except Exception as e:
        # Roll back ALL changes if anything failed — balance, portfolio, transaction
        db.rollback()
        logger.error(f"[Portfolio] BUY failed for user {current_user.id}, symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed. No changes were made. Please try again.")

    return {
        "message": f"Successfully bought {quantity} share(s) of {symbol}.",
        "balance": current_user.balance,
        "bought_at": round(quote['price'], 2),
        "total_cost": cost,
    }


@router.post("/sell")
def sell_stock(
    trade: TradeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Sell a stock from the user's portfolio.

    Fixes applied vs original:
    1. quantity validated > 0 via Pydantic
    2. symbol + quantity come from request body, not URL
    3. Full try/except with db.rollback()
    """
    symbol = trade.symbol.upper().strip()
    quantity = trade.quantity

    portfolio_item = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id,
        models.Portfolio.symbol == symbol
    ).first()

    if not portfolio_item:
        raise HTTPException(status_code=400, detail=f"You don't own any shares of {symbol}.")

    if portfolio_item.quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient shares. You own {portfolio_item.quantity}, tried to sell {quantity}."
        )

    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=400, detail=f"Could not fetch current price for '{symbol}'. Try again.")

    revenue = round(quote['price'] * quantity, 2)

    try:
        # 1. Credit balance
        current_user.balance = round(current_user.balance + revenue, 2)

        # 2. Update or remove portfolio entry
        portfolio_item.quantity = round(portfolio_item.quantity - quantity, 6)
        if portfolio_item.quantity <= 0:
            db.delete(portfolio_item)

        # 3. Record transaction
        transaction = models.Transaction(
            symbol=symbol,
            type="SELL",
            quantity=quantity,
            price=round(quote['price'], 2),
            owner_id=current_user.id
        )
        db.add(transaction)

        # 4. Commit everything atomically
        db.commit()
        logger.info(f"[Portfolio] SELL {quantity} x {symbol} @ ₹{quote['price']} for user {current_user.id}")

    except Exception as e:
        db.rollback()
        logger.error(f"[Portfolio] SELL failed for user {current_user.id}, symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed. No changes were made. Please try again.")

    return {
        "message": f"Successfully sold {quantity} share(s) of {symbol}.",
        "balance": current_user.balance,
        "sold_at": round(quote['price'], 2),
        "total_revenue": revenue,
    }


@router.get("/transactions", response_model=list[schemas.Transaction])
def get_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return current_user.transactions


# ── Stress Test ───────────────────────────────────────────────────────────────

@router.get("/stress-test")
def stress_test(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    portfolios = current_user.portfolios
    if not portfolios:
        return {"beta": 0, "risk_score": "None", "scenarios": [], "total_value": 0, "holdings": [], "grade": "N/A"}

    total_value = 0
    holdings_beta_sum = 0
    holdings_data = []

    for item in portfolios:
        quote = get_stock_quote(item.symbol)
        if quote:
            value = round(quote['price'] * item.quantity, 2)
            total_value += value

            # Fixed: bare except replaced with logged except so real errors are visible
            try:
                beta_raw = yf.Ticker(item.symbol).info.get('beta')
                beta = round(float(beta_raw), 2) if beta_raw is not None else 1.1
            except Exception as e:
                logger.warning(f"[StressTest] Beta fetch failed for {item.symbol}: {e}")
                beta = 1.1

            holdings_beta_sum += beta * value
            holdings_data.append({
                "symbol": item.symbol.replace('.NS', '').replace('.BO', ''),
                "quantity": item.quantity,
                "avg_price": round(item.average_price, 2),
                "live_price": round(quote['price'], 2),
                "value": value,
                "beta": beta,
                "weight": 0,  # filled below
            })

    portfolio_beta = round(holdings_beta_sum / total_value, 2) if total_value > 0 else 1.0

    # Compute weights & concentration
    max_weight = 0
    for h in holdings_data:
        h["weight"] = round((h["value"] / total_value) * 100, 1) if total_value > 0 else 0
        h["contribution"] = round(h["beta"] * h["weight"] / 100, 3)
        if h["weight"] > max_weight:
            max_weight = h["weight"]

    risk_score = (
        "Very High" if portfolio_beta >= 1.8 else
        "High"      if portfolio_beta >= 1.3 else
        "Medium"    if portfolio_beta >= 0.8 else
        "Low"
    )

    num_stocks = len(holdings_data)
    concentration_penalty = max_weight > 50
    grade = (
        "D" if (portfolio_beta >= 1.8 or (concentration_penalty and num_stocks <= 2)) else
        "C" if (portfolio_beta >= 1.3 or concentration_penalty) else
        "B" if (portfolio_beta >= 0.8 or num_stocks < 4) else
        "A"
    )

    def recovery_months(loss_pct):
        if loss_pct >= 100:
            return 999
        monthly_return = 0.12 / 12
        try:
            return math.ceil(math.log(1 / (1 - abs(loss_pct) / 100)) / math.log(1 + monthly_return))
        except Exception:
            return 999

    SCENARIOS = [
        {"name": "Nifty Market Crash",  "emoji": "💥", "desc": "Severe bear market / FII selloff",    "pct": -10},
        {"name": "RBI Rate Hike Shock", "emoji": "🏦", "desc": "Surprise 50bps rate hike",            "pct": -5},
        {"name": "Global Recession",    "emoji": "🌐", "desc": "US recession spills into India",      "pct": -20},
        {"name": "COVID-style Crash",   "emoji": "📉", "desc": "Black swan event, panic selling",     "pct": -35},
        {"name": "FII Buying Rally",    "emoji": "🚀", "desc": "Foreign inflows surge post rate cut", "pct": +10},
        {"name": "Budget Rally",        "emoji": "🎯", "desc": "Pro-growth union budget",             "pct": +8},
    ]

    scenarios = []
    for s in SCENARIOS:
        actual_pct = s["pct"] * portfolio_beta
        impact_val = (actual_pct / 100) * total_value
        loss_pct = actual_pct if actual_pct < 0 else 0
        rec_months = recovery_months(loss_pct) if loss_pct < 0 else 0
        scenarios.append({
            "name": s["name"],
            "emoji": s["emoji"],
            "desc": s["desc"],
            "market_move": s["pct"],
            "impact_percent": round(actual_pct, 2),
            "impact_value": round(impact_val, 2),
            "recovery_months": rec_months,
            "value_after": round(total_value + impact_val, 2),
        })

    return {
        "beta": portfolio_beta,
        "risk_score": risk_score,
        "grade": grade,
        "scenarios": scenarios,
        "total_value": round(total_value, 2),
        "holdings": sorted(holdings_data, key=lambda x: x["weight"], reverse=True),
        "max_concentration": round(max_weight, 1),
        "num_stocks": num_stocks,
    }
