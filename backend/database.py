from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# On Render free tier, use /tmp so the app does not crash on startup
# Locally, store next to this file
if os.environ.get("RENDER"):
    _DB_PATH = os.environ.get("DB_PATH", "/tmp/trading_platform.db")
else:
    _DB_DIR = os.path.dirname(os.path.abspath(__file__))
    _DB_PATH = os.path.join(_DB_DIR, "trading_platform.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
