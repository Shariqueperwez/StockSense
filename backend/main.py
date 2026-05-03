from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
import models
from routes import auth, market, ai, portfolio, watchlist
import threading
import os

try:
    models.Base.metadata.create_all(bind=engine)
    print("[StockSense] Database tables created/verified successfully.")
except Exception as e:
    print(f"[StockSense] FATAL: Could not connect to database: {e}")
    raise

def _prewarm():
    try:
        from services.market_service import get_market_movers, get_heatmap_data
        get_market_movers()
        get_heatmap_data()
        print("[StockSense] Market data pre-warmed successfully.")
    except Exception as e:
        print(f"[StockSense] Pre-warm error (non-fatal): {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=_prewarm, daemon=True)
    thread.start()
    yield

app = FastAPI(title="StockSense — AI Stock Platform", lifespan=lifespan)

_raw = os.environ.get("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in _raw.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["watchlist"])

@app.get("/")
def read_root():
    return {"message": "StockSense API — Running"}

@app.get("/ping")
def ping():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
