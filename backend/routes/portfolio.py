from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from routes.auth import get_current_user
from services.market_service import get_stock_quote

router = APIRouter()

@router.get("/", response_model=list[schemas.Portfolio])
def get_portfolio(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return current_user.portfolios

@router.post("/buy")
def buy_stock(symbol: str, quantity: float, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    
    cost = quote['price'] * quantity
    if current_user.balance < cost:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    
    # Update balance
    current_user.balance -= cost
    
    # Update portfolio
    portfolio_item = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id,
        models.Portfolio.symbol == symbol
    ).first()
    
    if portfolio_item:
        total_cost = (portfolio_item.quantity * portfolio_item.average_price) + cost
        portfolio_item.quantity += quantity
        portfolio_item.average_price = total_cost / portfolio_item.quantity
    else:
        new_item = models.Portfolio(symbol=symbol, quantity=quantity, average_price=quote['price'], owner_id=current_user.id)
        db.add(new_item)
        
    # Record transaction
    transaction = models.Transaction(symbol=symbol, type="BUY", quantity=quantity, price=quote['price'], owner_id=current_user.id)
    db.add(transaction)
    
    db.commit()
    return {"message": "Purchase successful", "balance": current_user.balance}

@router.post("/sell")
def sell_stock(symbol: str, quantity: float, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio_item = db.query(models.Portfolio).filter(
        models.Portfolio.owner_id == current_user.id,
        models.Portfolio.symbol == symbol
    ).first()
    
    if not portfolio_item or portfolio_item.quantity < quantity:
        raise HTTPException(status_code=400, detail="Insufficient shares")
        
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=400, detail="Invalid symbol for current price")
        
    revenue = quote['price'] * quantity
    current_user.balance += revenue
    
    portfolio_item.quantity -= quantity
    if portfolio_item.quantity <= 0:
        db.delete(portfolio_item)
        
    transaction = models.Transaction(symbol=symbol, type="SELL", quantity=quantity, price=quote['price'], owner_id=current_user.id)
    db.add(transaction)
    
    db.commit()
    return {"message": "Sale successful", "balance": current_user.balance}

@router.get("/transactions", response_model=list[schemas.Transaction])
def get_transactions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return current_user.transactions

import yfinance as yf
import math

@router.get("/stress-test")
def stress_test(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
            try:
                beta = yf.Ticker(item.symbol).info.get('beta')
                if beta is None: beta = 1.1
                beta = round(float(beta), 2)
            except:
                beta = 1.1
            holdings_beta_sum += beta * value
            holdings_data.append({
                "symbol": item.symbol.replace('.NS','').replace('.BO',''),
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

    risk_score = "Very High" if portfolio_beta >= 1.8 else "High" if portfolio_beta >= 1.3 else "Medium" if portfolio_beta >= 0.8 else "Low"

    # Portfolio grade: A=low beta + diversified, D=high beta + concentrated
    num_stocks = len(holdings_data)
    concentration_penalty = max_weight > 50
    grade = "D" if (portfolio_beta >= 1.8 or (concentration_penalty and num_stocks <= 2)) else \
            "C" if (portfolio_beta >= 1.3 or concentration_penalty) else \
            "B" if (portfolio_beta >= 0.8 or num_stocks < 4) else "A"

    # Recovery time helper: months to recover from a % loss at 12% annual return
    def recovery_months(loss_pct):
        if loss_pct >= 100: return 999
        monthly_return = 0.12 / 12
        try:
            return math.ceil(math.log(1 / (1 - abs(loss_pct) / 100)) / math.log(1 + monthly_return))
        except:
            return 999

    SCENARIOS = [
        {"name": "Nifty Market Crash",     "emoji": "💥", "desc": "Severe bear market / FII selloff",    "pct": -10},
        {"name": "RBI Rate Hike Shock",    "emoji": "🏦", "desc": "Surprise 50bps rate hike",            "pct": -5},
        {"name": "Global Recession",       "emoji": "🌐", "desc": "US recession spills into India",      "pct": -20},
        {"name": "COVID-style Crash",      "emoji": "📉", "desc": "Black swan event, panic selling",     "pct": -35},
        {"name": "FII Buying Rally",       "emoji": "🚀", "desc": "Foreign inflows surge post rate cut", "pct": +10},
        {"name": "Budget Rally",           "emoji": "🎯", "desc": "Pro-growth union budget",             "pct": +8},
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