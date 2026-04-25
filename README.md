# 📊 StockSense — Smart Trading & Investing Platform

A full-stack Indian stock market platform for **Traders** and **Investors**, powered by AI.

---

## ✨ What's New in v5

### 🔄 Dual Mode System (Trader / Investor)
- **Trader Mode**: Shows Paper Trading, Trade Journal, Heatmap, AI Copilot — everything a short-term trader needs
- **Investor Mode**: Shows Portfolio, Allocator, SIP Calculator, Events Calendar, AI Copilot — everything a long-term investor needs
- Navigation bar changes dynamically based on your selected mode

### ⚡ New Pages
| Page | Mode | Description |
|------|------|-------------|
| **Trade Journal** | Trader | Log every trade, track P&L, analyze setups, emotion tracking |
| **SIP Calculator** | Investor | Compound wealth calculator with step-up SIP and goal planning |
| **Economic Calendar** | Investor | RBI meetings, earnings, F&O expiry, US Fed events |

### 🤖 Upgraded AI (StockSense AI Copilot)
- **Plain English thesis** — no jargon, beginner-friendly explanations
- **Mode-aware quick prompts** — different suggested questions for Traders vs Investors
- **Better Buy/Sell signals** — Entry zone, Stop Loss, Target, Risk:Reward ratio
- **Investor thesis** — Fair value range, Bull/Bear case, Valuation verdict
- Renamed from "Jarvis" to **StockSense AI**

### 🎨 Branding
- Renamed from "StockSense India" → **StockSense**
- Mode-aware color theming throughout (Blue = Trader, Green = Investor)
- Mode badge in portfolio header

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- A free [Groq API key](https://console.groq.com/) (for AI features)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Copy the env template and add your GROQ_API_KEY
cp .env.example .env
# Edit .env and set GROQ_API_KEY=your_key_here
python main.py
# OR: uvicorn main:app --reload --port 8000
# Runs on http://localhost:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### One-click scripts
- **Windows**: `start_backend.bat` + `start_frontend.bat`
- **Linux/Mac**: `start_backend.sh` + `start_frontend.sh`

---

## 🗂️ Features Overview

### 📈 Trader Mode Features
| Feature | Description |
|---------|-------------|
| **Dashboard** | Stock search with live technical indicators (RSI, MACD, BB), options flow, entry/SL/target |
| **Paper Trading** | Buy/sell NSE stocks with ₹10L virtual money. Live P&L tracking |
| **Trade Journal** | Log every trade, analyze by setup type & emotion, cumulative P&L curve |
| **Heatmap** | Nifty 50 sector performance heatmap |
| **StockSense AI** | Chat for trading strategies, technical analysis, stock screener |

### 💼 Investor Mode Features
| Feature | Description |
|---------|-------------|
| **Dashboard** | Stock search with fundamentals, P/E valuation, 52W range, AI investment thesis |
| **Portfolio** | Build practice long-term portfolio, track holdings & diversification |
| **Allocator** | AI-powered portfolio allocation based on risk profile and horizon |
| **SIP Calculator** | Monthly SIP + lumpsum + step-up projector. Wealth goal planning |
| **Events Calendar** | RBI meetings, earnings season, F&O expiry, US Fed, GST council |
| **StockSense AI** | Chat for fundamental analysis, beginner investing guidance |

---

## 🏗️ Tech Stack

**Backend**: FastAPI · SQLAlchemy · SQLite · yFinance · Groq AI  
**Frontend**: React 18 · Vite · Recharts · Lucide Icons

---

## ⚠️ Disclaimer
StockSense is for **educational and paper-trading purposes only**. Not SEBI-registered. Not financial advice. Always do your own research before investing real money.
