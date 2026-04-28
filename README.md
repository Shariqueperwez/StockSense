# StockSense — AI-Powered Stock Market Platform

> A full-stack Indian stock market platform for **Traders** and **Investors**, powered by AI (Groq + LLaMA). Practice trading, analyze stocks, and build wealth — all in one place.

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## What is StockSense?

StockSense is a free, open-source platform that gives retail investors and traders in India access to tools that were previously only available in expensive professional software.

- **Live NSE/BSE market data** — quotes, charts, technicals, options flow
- **AI analysis in plain English** — no jargon, just clear BUY/SHORT signals or investment thesis
- **Paper trading** — practice with ₹10 lakh virtual money, zero real risk
- **Dual mode** — completely different experience for Traders vs Investors
- **Portfolio stress testing** — see how your portfolio survives a market crash

---

## Features

### Trader Mode
| Feature | Description |
|---------|-------------|
| Dashboard | Live stock search with RSI, MACD, Bollinger Bands, options PCR & max pain |
| Paper Trading | Buy/sell NSE stocks with ₹10L virtual balance. Real prices, zero risk |
| Trade Journal | Log every trade with setup type, emotion tracking, cumulative P&L curve |
| Heatmap | Nifty 50 sector-wise performance heatmap |
| AI Copilot | Get BUY/SHORT calls with Entry, Stop Loss, Target, Risk:Reward |

### Investor Mode
| Feature | Description |
|---------|-------------|
| Dashboard | Fundamentals, P/E valuation, 52-week range, AI investment thesis |
| Portfolio | Build a practice long-term portfolio, track holdings and diversification |
| Allocator | AI-powered portfolio allocation based on your risk profile and time horizon |
| SIP Calculator | Monthly SIP + lumpsum + step-up wealth projector with goal planning |
| Events Calendar | RBI meetings, earnings season, F&O expiry, US Fed, GST council dates |
| AI Copilot | Chat for fundamental analysis and beginner investing guidance |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy, SQLite, Python 3.9+ |
| Frontend | React 19, Vite 8, React Router 7, Recharts, Lucide React |
| AI | Groq API (LLaMA 3) |
| Market Data | NSE India scraper + yFinance fallback |
| Auth | JWT (python-jose), bcrypt |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Project Structure

```
StockSense/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy + SQLite setup
│   ├── models.py            # User, Portfolio, Transaction, Watchlist
│   ├── schemas.py           # Pydantic request/response models
│   ├── requirements.txt
│   ├── routes/
│   │   ├── auth.py          # Register, login, JWT
│   │   ├── market.py        # Quote, history, technicals, movers
│   │   ├── portfolio.py     # Buy, sell, stress test
│   │   ├── ai.py            # Thesis, chat, screener, allocation
│   │   └── watchlist.py     # Add, remove, list
│   └── services/
│       ├── market_service.py  # NSE scraper + yFinance fallback
│       └── groq_service.py    # LLM prompt engineering
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root + dual-mode navbar
│   │   ├── api.js           # Axios instance with JWT interceptor
│   │   ├── context/
│   │   │   └── ModeContext.jsx  # Trader/Investor mode state
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── PaperTrading.jsx
│   │       ├── TradeJournal.jsx
│   │       ├── Heatmap.jsx
│   │       ├── InvestorPortfolio.jsx
│   │       ├── Allocator.jsx
│   │       ├── SIPCalculator.jsx
│   │       ├── EconomicCalendar.jsx
│   │       ├── Copilot.jsx
│   │       ├── AuthPage.jsx
│   │       └── LandingPage.jsx
│   ├── vercel.json
│   └── vite.config.js
├── .gitignore
├── render.yaml
└── README.md
```

---

## Local Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- Free [Groq API key](https://console.groq.com/)

### 1. Clone the repo
```bash
git clone https://github.com/Shariqueperwez/StockSense.git
cd StockSense
```

### 2. Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env .env.local
# Edit .env and add your GROQ_API_KEY

# Run
python main.py
# Backend runs on http://localhost:8000
```

### 3. Frontend
```bash
cd frontend

# Install dependencies
npm install

# Run
npm run dev
# Frontend runs on http://localhost:5173
```

### One-click scripts (Windows)
```bash
start_backend.bat    # starts backend
start_frontend.bat   # starts frontend
```

---

## Deployment

### Backend → Render
1. Go to [render.com](https://render.com) → New Web Service
2. Connect this GitHub repo
3. Set **Root Directory** to `backend`
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add these **Environment Variables:**

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | your Groq key |
| `JWT_SECRET` | any long random string |
| `RENDER` | `true` |
| `ALLOWED_ORIGINS` | your Vercel URL (add after frontend deploy) |

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import this GitHub repo
3. Set **Root Directory** to `frontend`
4. Add **Environment Variable:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | your Render backend URL |

5. Deploy

> After both are deployed, go back to Render and update `ALLOWED_ORIGINS` with your Vercel URL.

---

## Environment Variables

### Backend (`backend/.env`)
```
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=your_long_random_secret_here
ALLOWED_ORIGINS=https://your-app.vercel.app
RENDER=true
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=https://your-backend.onrender.com
```

> Never commit `.env` files to GitHub. They are in `.gitignore`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/market/quote/{symbol}` | Live stock quote |
| GET | `/api/market/technicals/{symbol}` | RSI, MACD, BB, SMA |
| GET | `/api/market/movers` | Top gainers and losers |
| GET | `/api/market/heatmap` | Nifty 50 heatmap data |
| POST | `/api/portfolio/buy` | Buy stock (paper trade) |
| POST | `/api/portfolio/sell` | Sell stock (paper trade) |
| GET | `/api/portfolio/stress-test` | Portfolio stress test |
| GET | `/api/ai/thesis/{symbol}` | AI trader/investor thesis |
| POST | `/api/ai/chat` | AI copilot chat |
| GET | `/api/ai/allocation` | AI portfolio allocation |
| GET | `/ping` | Health check (keep-alive) |

---

## Screenshots

> Coming soon — add your own screenshots here after deployment!

---

## Disclaimer

StockSense is built for **educational and paper-trading purposes only**.  
It is **not** SEBI-registered and does **not** constitute financial advice.  
Always do your own research before investing real money.

---

## Author

**Sharique Perwez**  
[GitHub](https://github.com/Shariqueperwez) · [LinkedIn](https://linkedin.com/in/yourprofile)

---

## License

This project is open source and available under the [MIT License](LICENSE).
