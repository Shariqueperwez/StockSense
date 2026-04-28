# 📈 StockSense — AI-Powered Stock Market Platform

> A full-stack web application for the Indian stock market that gives retail traders and investors access to live market data, AI-generated analysis, paper trading, and portfolio management — all in one place.

---

## 🤔 What is StockSense?

Most retail investors in India face two big problems. First, the tools available to them are either too basic (like Groww or Zerodha Kite which just show prices and charts) or too expensive (like Bloomberg Terminal which professionals use). Second, even when data is available, most beginners don't know how to interpret RSI, MACD, or options data to make a decision.

StockSense solves both problems. It pulls live data from NSE India, computes technical indicators automatically, and then uses a Large Language Model (LLaMA via Groq) to explain what all of it means in plain English — giving the user a clear directional recommendation rather than just raw numbers.

The platform serves two completely different types of users — short-term traders and long-term investors — through a single unified application with a dual-mode interface that adapts its entire navigation and feature set based on which mode the user selects.

---

## 🛠️ Tech Stack

### 🔧 Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | High-performance Python web framework for building REST APIs |
| **SQLAlchemy** | ORM for database models and queries |
| **SQLite** | Lightweight relational database for storing users, portfolios, transactions |
| **python-jose** | JWT token generation and verification for authentication |
| **bcrypt / passlib** | Secure password hashing |
| **yFinance** | Python library to fetch historical and live stock data from Yahoo Finance |
| **Groq SDK** | API client for accessing LLaMA language models at high inference speed |
| **python-dotenv** | Environment variable management |
| **pandas / numpy** | Data processing for technical indicator calculations |
| **requests** | HTTP session management for NSE India data scraping |

### 🎨 Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI component framework |
| **Vite 8** | Fast build tool and development server |
| **React Router 7** | Client-side navigation between pages |
| **Recharts** | Charting library for price charts, P&L curves, and heatmaps |
| **Lucide React** | Icon library |
| **Axios** | HTTP client for API calls with JWT interceptor |

---

## ⚙️ How It Works

### 🏗️ Architecture

```
User (Browser)
      ↓  React 19 SPA
Frontend (Vite)
      ↓  REST API calls (Axios + JWT)
Backend (FastAPI)
      ↓              ↓              ↓
  SQLite DB      Groq API       NSE India
  (users,        (LLaMA AI)     + yFinance
  portfolios)                   (market data)
```

### 📡 Market Data Flow
1. User searches for a stock (e.g. RELIANCE, TCS, INFY)
2. Backend first tries to fetch live data from **NSE India** directly using a warmed browser session
3. If NSE fails (market closed, blocked), it falls back to **yFinance**
4. Data is cached in memory for 2 minutes to avoid hammering external sources
5. Technical indicators (RSI, MACD, Bollinger Bands, SMA20, SMA50, Volume) are computed on the fly
6. All data is returned to the frontend in a single API response

### 🤖 AI Analysis Flow
1. User requests AI analysis for a stock
2. Backend collects: live price, technical indicators, options data (PCR, max pain), recent news headlines
3. Everything is combined into a structured prompt sent to **Groq API (LLaMA 3)**
4. In **Trader Mode**: AI returns a directional call (BUY or SHORT) with Entry, Stop Loss, Target, and Risk:Reward ratio
5. In **Investor Mode**: AI returns a Fair Value range, Bull Case, Bear Case, and Valuation Verdict
6. Response is delivered in plain English — no financial jargon

### 🔐 Authentication Flow
1. User registers with email + password
2. Password is hashed using **bcrypt** before storing in database
3. On login, backend verifies password and returns a **JWT token** valid for 30 days
4. Frontend stores token in localStorage and attaches it to every API request via Authorization header
5. Protected routes verify the token on every request

---

## 🔀 Dual Mode System

StockSense has two completely separate modes with different navigation, features, and AI prompts.

🔵 **Trader Mode (Blue theme)** — for short-term traders who focus on price movements, technical analysis, and quick trades.

🟢 **Investor Mode (Green theme)** — for long-term investors who focus on fundamentals, wealth building, and portfolio management.

Switching mode changes the entire navbar and available pages instantly. The preference is saved in localStorage so it persists across sessions.

---

## ✨ Features

### 📊 Dashboard (Both Modes)
- Live stock search for any NSE/BSE listed company
- Real-time price, change %, 52-week high/low, volume, market cap
- **Trader Mode**: RSI, MACD, Bollinger Bands, SMA20/50, Options PCR and Max Pain, AI trade thesis with Entry/SL/Target
- **Investor Mode**: P/E ratio, EPS, dividend yield, sector, AI investment thesis with fair value and valuation verdict
- Recent news headlines for the searched stock
- One-click add to Watchlist

### 📝 Paper Trading (Trader Mode)
- ₹10,00,000 virtual balance given to every new user
- Buy and sell any NSE stock at live market prices
- Real-time P&L calculation on open positions
- Complete transaction history
- Average price tracking for multiple buys of the same stock
- Balance updates instantly after every trade

### 📓 Trade Journal (Trader Mode)
- Log every trade with details: symbol, entry price, exit price, quantity, setup type, outcome
- Track emotions for each trade (confident, fearful, FOMO, disciplined etc.)
- Cumulative P&L curve over time
- Analyze performance by setup type
- Filter trades by date, symbol, outcome

### 🗺️ Heatmap (Trader Mode)
- Visual sector-wise performance heatmap for Nifty 50 stocks
- Color intensity shows magnitude of gain or loss
- Quick way to spot which sectors are strong and which are weak on any given day

### 💼 Investor Portfolio (Investor Mode)
- Add stocks to a practice long-term portfolio
- Track current value vs average buy price for each holding
- Overall portfolio gain/loss calculation
- **Stress Test** — computes portfolio beta and simulates impact of 6 market scenarios:
  - 📉 Nifty Market Crash (-10%)
  - 🏦 RBI Rate Hike Shock (-5%)
  - 🌍 Global Recession (-20%)
  - 🦠 COVID-style Crash (-35%)
  - 📈 FII Buying Rally (+10%)
  - 🎯 Budget Rally (+8%)
- Portfolio grade (A to D) based on risk level and concentration
- Recovery time estimate for each negative scenario

### 🧠 Allocator (Investor Mode)
- Enter investment amount, risk profile (conservative / moderate / aggressive), and time horizon
- AI generates a complete portfolio allocation recommendation
- Suggests allocation percentages across large cap, mid cap, small cap, debt, gold
- Explains reasoning behind each allocation in plain English

### 🧮 SIP Calculator (Investor Mode)
- Monthly SIP amount projection with compound growth
- Step-up SIP (increase SIP by X% every year)
- Lumpsum + SIP combined calculator
- Goal-based planning (how much SIP needed to reach ₹X in Y years)
- Visual wealth growth chart over time

### 📅 Economic Calendar (Investor Mode)
- Upcoming RBI monetary policy meetings
- Earnings season dates for major Indian companies
- F&O expiry dates
- US Federal Reserve meeting dates
- GST council meetings and budget dates

### 💬 AI Copilot (Both Modes)
- Conversational AI assistant with full chat history memory within a session
- **Trader Mode prompts**: technical analysis, trade setups, market outlook, stop loss strategies
- **Investor Mode prompts**: fundamental analysis, sector outlook, beginner investing guidance
- **Smart Stock Screener**: type "show me low PE stocks with high ROE" and AI returns a list of matching NSE stocks with live data
- Intent detection automatically switches between screener mode and chat mode based on what the user asks

### 👁️ Watchlist
- Add any stock to watchlist from the Dashboard
- Persistent across sessions (stored in database)
- Quick access to tracked stocks

---

## 📐 Technical Indicators

| Indicator | What it measures | How StockSense uses it |
|-----------|-----------------|----------------------|
| **RSI (14)** | Momentum — speed and magnitude of price changes | Below 30 = oversold, Above 70 = overbought |
| **MACD** | Trend and momentum — difference between EMA12 and EMA26 | MACD above Signal line = bullish, below = bearish |
| **Bollinger Bands** | Volatility — SMA20 ± 2 standard deviations | Price near upper band = stretched, near lower band = potential support |
| **SMA 20** | Short-term trend | Price above SMA20 = short-term bullish bias |
| **SMA 50** | Medium-term trend | Price above SMA50 = medium-term bullish bias |
| **Volume vs Average** | Conviction behind price move | Volume > 130% of 20-day average = strong conviction |
| **PCR (Put-Call Ratio)** | Options market sentiment | PCR > 1.2 = bullish bias, PCR < 0.8 = bearish bias |
| **Max Pain** | Price where most options expire worthless | Price tends to gravitate toward max pain near expiry |

---

## 📁 Project Structure

```
StockSense/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, route registration, cache pre-warming
│   ├── database.py              # SQLAlchemy engine and session factory
│   ├── models.py                # User, Portfolio, Transaction, Watchlist ORM models
│   ├── schemas.py               # Pydantic v2 request/response schemas
│   ├── requirements.txt         # Python dependencies
│   ├── routes/
│   │   ├── auth.py              # Register, login, JWT, get current user
│   │   ├── market.py            # Quote, history, technicals, movers, heatmap, options
│   │   ├── portfolio.py         # Buy, sell, transaction history, stress test
│   │   ├── ai.py                # Thesis, copilot chat, screener, allocation
│   │   └── watchlist.py         # Add, remove, list watchlist items
│   └── services/
│       ├── market_service.py    # NSE scraper, yFinance fallback, cache, indicators
│       └── groq_service.py      # LLM prompt templates, trader thesis, investor thesis
├── frontend/
│   ├── index.html               # App entry point
│   ├── vite.config.js           # Vite config with dev proxy
│   ├── vercel.json              # Vercel deployment config with SPA routing
│   ├── package.json             # Node dependencies
│   └── src/
│       ├── main.jsx             # React root render
│       ├── App.jsx              # Router, navbar, mode toggle, protected routes
│       ├── api.js               # Axios instance with JWT interceptor
│       ├── index.css            # Global styles and utility classes
│       ├── context/
│       │   └── ModeContext.jsx  # Trader/Investor mode global state
│       ├── data/
│       │   └── nseStocks.js     # NSE stock symbols and names list
│       └── pages/
│           ├── LandingPage.jsx        # Public landing page
│           ├── AuthPage.jsx           # Login and registration
│           ├── Dashboard.jsx          # Main stock analysis page
│           ├── PaperTrading.jsx       # Virtual trading terminal
│           ├── TradeJournal.jsx       # Trade logging and analysis
│           ├── Heatmap.jsx            # Nifty 50 sector heatmap
│           ├── InvestorPortfolio.jsx  # Long-term portfolio tracker
│           ├── Allocator.jsx          # AI portfolio allocator
│           ├── SIPCalculator.jsx      # SIP and wealth calculator
│           ├── EconomicCalendar.jsx   # Market events calendar
│           ├── Copilot.jsx            # AI chat assistant
│           └── WatchlistPanel.jsx     # Watchlist management
├── .gitignore
└── README.md
```

---

## 🗄️ Database Models

**👤 User** — `id, email, full_name, hashed_password, is_active, balance (default ₹10,00,000)`

**📦 Portfolio** — `id, symbol, quantity, average_price, owner_id`

**🔄 Transaction** — `id, symbol, type (BUY/SELL), quantity, price, timestamp, owner_id`

**⭐ Watchlist** — `id, symbol, name, added_at, owner_id`

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create new account |
| POST | `/api/auth/login` | ❌ | Login, returns JWT token |
| GET | `/api/auth/me` | ✅ | Get logged in user details |
| GET | `/api/market/quote/{symbol}` | ❌ | Live stock quote and fundamentals |
| GET | `/api/market/history/{symbol}` | ❌ | Price history for charts |
| GET | `/api/market/technicals/{symbol}` | ❌ | RSI, MACD, BB, SMA, Volume |
| GET | `/api/market/options/{symbol}` | ❌ | PCR, max pain, call/put volumes |
| GET | `/api/market/movers` | ❌ | Top gainers and losers |
| GET | `/api/market/heatmap` | ❌ | Nifty 50 sector heatmap data |
| GET | `/api/market/news/{symbol}` | ❌ | Recent news headlines |
| GET | `/api/portfolio/` | ✅ | Get user portfolio holdings |
| POST | `/api/portfolio/buy` | ✅ | Buy stock at live price |
| POST | `/api/portfolio/sell` | ✅ | Sell stock at live price |
| GET | `/api/portfolio/transactions` | ✅ | Full transaction history |
| GET | `/api/portfolio/stress-test` | ✅ | Portfolio risk and scenario analysis |
| GET | `/api/ai/thesis/{symbol}` | ❌ | AI trader or investor thesis |
| POST | `/api/ai/chat` | ✅ | AI copilot conversation |
| GET | `/api/ai/allocation` | ❌ | AI portfolio allocation advice |
| GET | `/api/watchlist/` | ✅ | Get watchlist |
| POST | `/api/watchlist/add` | ✅ | Add stock to watchlist |
| DELETE | `/api/watchlist/remove/{symbol}` | ✅ | Remove from watchlist |
| GET | `/ping` | ❌ | Health check |

---

## ⚠️ Disclaimer

StockSense is a hands-on learning platform built for aspiring traders and investors who want to understand the market before putting real money on the line. Everything here — the AI analysis, paper trades, portfolio stress tests, and AI copilot — is designed to help you think like a market participant and build real intuition about how stocks move.

It is **not SEBI-registered** and does not offer financial advice. All trades on this platform use virtual money, so there's zero risk while you learn. Think of it as a flight simulator for your investing journey — the closest thing to the real market, without the real consequences.

Sharpen your skills here. When you're ready for the real thing, you'll know exactly why you're making every decision.

---

## 👨‍💻 Author

**Sharique Perwez**
B.Tech — Computer Science and Engineering
Lovely Professional University, Punjab

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Shariqueperwez)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sharique-perwez/)
