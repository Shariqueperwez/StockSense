from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Priority:
# 1. DATABASE_URL env var (Supabase / any PostgreSQL on Render)
# 2. SQLite locally for development
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Supabase gives a postgres:// URL — SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL:
    # PostgreSQL — no check_same_thread needed
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    # Local SQLite fallback
    _DB_DIR = os.path.dirname(os.path.abspath(__file__))
    _DB_PATH = os.path.join(_DB_DIR, "trading_platform.db")
    engine = create_engine(
        f"sqlite:///{_DB_PATH}",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
