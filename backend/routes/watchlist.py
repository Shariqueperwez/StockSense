from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from routes.auth import get_current_user

router = APIRouter()

@router.get("/")
def get_watchlist(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return {"watchlist": [{"id": w.id, "symbol": w.symbol, "name": w.name} for w in current_user.watchlist]}

@router.post("/add")
def add_to_watchlist(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    symbol = payload.get("symbol", "").upper().strip()
    name = payload.get("name", "")
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol required")
    exists = db.query(models.Watchlist).filter_by(owner_id=current_user.id, symbol=symbol).first()
    if exists:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    item = models.Watchlist(symbol=symbol, name=name, owner_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "symbol": item.symbol, "name": item.name}

@router.delete("/remove/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.Watchlist).filter_by(owner_id=current_user.id, symbol=symbol.upper()).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not in watchlist")
    db.delete(item)
    db.commit()
    return {"removed": symbol}
