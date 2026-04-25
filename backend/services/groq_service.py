import os
import json
import groq
from dotenv import load_dotenv

load_dotenv()

client = groq.Client(api_key=os.environ.get("GROQ_API_KEY", "fallback_key"))


def generate_trader_thesis(symbol: str, price: float, news: list, options_data: dict = None, technicals: dict = None) -> str:
    news_text = "\n".join([f"- {n['headline']}" for n in news[:4]]) if news else "No recent news available."

    # ── Options context ───────────────────────────────────────────────────────
    options_text = ""
    if options_data and options_data.get('expiry'):
        pcr = options_data.get('pcr', 0)
        max_pain = options_data.get('max_pain', 'N/A')
        options_text = f"""
F&O Snapshot:
- PCR (Put-Call Ratio): {pcr:.2f} → {"Bullish bias — more puts sold, market expects upside" if pcr > 1.2 else "Bearish bias — more calls sold, market expects downside" if pcr < 0.8 else "Neutral — balanced options activity"}
- Max Pain: ₹{max_pain} (where most options expire worthless — price gravitates here near expiry)
- Calls Volume: {options_data.get('calls_volume', 'N/A')} | Puts Volume: {options_data.get('puts_volume', 'N/A')}"""

    # ── Technicals context ────────────────────────────────────────────────────
    tech_text = ""
    if technicals:
        rsi = technicals.get('rsi')
        macd = technicals.get('macd')
        signal = technicals.get('signal')
        bb_upper = technicals.get('bb_upper')
        bb_lower = technicals.get('bb_lower')
        sma20 = technicals.get('sma20')
        sma50 = technicals.get('sma50')
        volume = technicals.get('volume')
        avg_volume = technicals.get('avg_volume')

        rsi_str = f"{rsi:.1f}" if rsi else "N/A"
        rsi_signal = "Overbought — possible reversal ahead" if rsi and rsi > 70 else "Oversold — potential bounce zone" if rsi and rsi < 30 else "Neutral range" if rsi else "N/A"
        macd_str = f"{macd:.2f}" if macd else "N/A"
        macd_signal_str = "Bullish crossover (momentum building)" if macd and signal and macd > signal else "Bearish crossover (momentum fading)" if macd and signal and macd < signal else "N/A"
        vol_str = f"{volume/1e5:.1f}L" if volume else "N/A"
        avg_vol_str = f"{avg_volume/1e5:.1f}L" if avg_volume else "N/A"
        vol_signal = "Above average — strong conviction move" if volume and avg_volume and volume > avg_volume * 1.3 else "Below average — weak participation" if volume and avg_volume and volume < avg_volume * 0.7 else "Normal volume"

        tech_text = f"""
Technical Indicators:
- RSI (14): {rsi_str} → {rsi_signal}
- MACD: {macd_str} vs Signal → {macd_signal_str}
- Bollinger Bands: Upper ₹{round(bb_upper,1) if bb_upper else "N/A"} | Lower ₹{round(bb_lower,1) if bb_lower else "N/A"} | Current ₹{round(price,1)}
- SMA 20: ₹{round(sma20,1) if sma20 else "N/A"} | SMA 50: ₹{round(sma50,1) if sma50 else "N/A"} (price {"above" if sma20 and price > sma20 else "below"} 20-day average)
- Volume: {vol_str} vs Avg {avg_vol_str} → {vol_signal}"""

    prompt = f"""You are StockSense AI — an expert trading analyst for NSE/BSE. Your job is to look at the current price, chart trend, technicals and news, then make ONE clear directional call: either BUY or SHORT. Not both. Pick the stronger side based on the evidence.

Stock: {symbol}
Current Price RIGHT NOW: ₹{price:,.2f}
{tech_text}
{options_text}

Recent News:
{news_text}

ANALYSIS RULES:
- If price is BELOW SMA20 and SMA50 + MACD bearish + RSI falling → lean SHORT
- If price is ABOVE SMA20 and SMA50 + MACD bullish + RSI rising → lean BUY
- If signals are mixed but news is strongly negative → lean SHORT
- If signals are mixed but news is strongly positive → lean BUY
- Only say AVOID if there is genuinely NO tradeable setup (no clear trend + low volume + no catalyst)

Now generate a SINGLE DIRECTION trade call. Be direct like a real trader talking to a friend.

## 🎯 My Call
- **Direction:** BUY or SHORT (one word only — commit to one side)
- **Why right now:** 2 sentences max — what does the chart/price action tell you? Use the current price ₹{price:,.2f} as reference. Example: "TCS dropped from ₹2,517 to ₹2,396 in 5 days — that's a clean downtrend. Price is below both moving averages with bearish MACD, so I'm going SHORT."
- **Trade Type:** Intraday (exit same day) / Swing (hold 2–7 days) / Positional (hold 2–6 weeks)
- **Conviction:** High / Medium / Low

## 📍 Exact Trade Levels (based on current price ₹{price:,.2f})
- **Entry:** ₹X — enter HERE (close to current price ₹{price:,.2f}, not far away)
- **Stop Loss:** ₹Y — exit immediately if price crosses this (keep loss small, max 2-3%)
- **Target 1:** ₹Z — book half profit here
- **Target 2:** ₹W — let the rest ride to here
- **Risk:Reward:** 1:X

## 💰 How Many Shares to Buy/Short
- ₹1 Lakh capital → {max(1, round(1000/max(price*0.02,1)))} shares (risking ₹1,000 = 1% of capital)
- ₹5 Lakh capital → {max(1, round(5000/max(price*0.02,1)))} shares (risking ₹5,000 = 1% of capital)
- ₹10 Lakh capital → {max(1, round(10000/max(price*0.02,1)))} shares (risking ₹10,000 = 1% of capital)

## 🔄 What to Do Step by Step
1. Enter at ₹X (the entry price above)
2. Set stop loss at ₹Y immediately after entering
3. When Target 1 (₹Z) hits → sell/cover half, move your SL to entry (now you cannot lose)
4. When Target 2 (₹W) hits → exit fully or trail SL 1% behind price
5. If SL hits before targets → exit immediately, no second guessing

## ⚠️ One Thing That Could Go Wrong
One specific risk for THIS trade — not generic advice.

## 💡 One Rule for This Trade
The single most important discipline rule for this specific setup.

IMPORTANT: Use exact rupee amounts. Entry must be close to current price ₹{price:,.2f}. Make it feel like a real trader's call, not a textbook exercise."""

    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are StockSense AI, a professional swing and positional trading analyst for Indian retail traders. Always be specific with price levels and risk management rules."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        max_tokens=1300,
    )
    return response.choices[0].message.content


def generate_investor_thesis(symbol: str, price: float, news: list, fundamentals: dict = None, holding_days: int = None, technicals: dict = None) -> str:
    news_text = "\n".join([f"- {n['headline']}" for n in news[:4]]) if news else "No recent news available."
    
    fund_text = ""
    if fundamentals:
        pe = fundamentals.get('pe_ratio')
        pe_str = f"{pe:.1f}x" if pe else "Not available"
        mktcap = fundamentals.get('market_cap', 0)
        mktcap_str = f"₹{mktcap/1e7:.0f} Crores" if mktcap and mktcap > 1e7 else f"₹{mktcap/1e5:.0f} Lakhs" if mktcap else "N/A"
        
        fund_text = f"""
Key Numbers:
- P/E Ratio: {pe_str} (lower = cheaper relative to earnings; market average ~22x)
- EPS (Earnings per share): ₹{fundamentals.get('eps', 'N/A')} (company's profit per share)
- Market Cap: {mktcap_str}
- 52-Week Range: ₹{fundamentals.get('fifty_two_week_low', 'N/A')} – ₹{fundamentals.get('fifty_two_week_high', 'N/A')}
- Dividend Yield: {fundamentals.get('dividend_yield', 'N/A')}%
- Beta: {fundamentals.get('beta', 'N/A')} (market sensitivity; <1 = less volatile than Nifty)
- Sector: {fundamentals.get('sector', 'N/A')}"""

    is_short_term = False  # Investment mode is always long-term (min 3 months)

    # Technical context for short-term
    tech_text = ""
    if technicals and is_short_term:
        rsi = technicals.get('rsi')
        macd = technicals.get('macd')
        signal = technicals.get('macd_signal')
        ma20 = technicals.get('ma20')
        ma50 = technicals.get('ma50')
        mom5 = technicals.get('mom5')
        atr_pct = technicals.get('atr_pct')
        overall = technicals.get('overall','HOLD')
        tech_text = f"""
Technical Picture (from live chart):
- RSI: {rsi:.1f if rsi else 'N/A'} ({'Oversold — potential bounce' if rsi and rsi < 30 else 'Overbought — caution' if rsi and rsi > 70 else 'Neutral'})
- MACD: {'Bullish crossover — momentum building' if macd and signal and macd > signal else 'Bearish — momentum fading'}
- Price vs MA20: {'Above (short-term uptrend)' if ma20 and price > ma20 else 'Below (short-term downtrend)'}
- Price vs MA50: {'Above (medium-term strength)' if ma50 and price > ma50 else 'Below (medium-term weak)'}
- 5-Day Momentum: {'+' if mom5 and mom5 > 0 else ''}{mom5:.1f if mom5 else 'N/A'}%
- Daily Volatility (ATR): {atr_pct:.1f if atr_pct else 'N/A'}% of price
- Overall Signal: {overall}"""

    horizon_text = ""
    if holding_days:
        if holding_days <= 180:
            horizon_text = f"\nInvestment Horizon: ~{holding_days//30} months. Focus on near-term business performance and catalysts."
        elif holding_days <= 365:
            horizon_text = f"\nInvestment Horizon: 1 year. Look at business fundamentals, earnings trajectory and sector trends."
        elif holding_days <= 730:
            horizon_text = f"\nInvestment Horizon: ~2 years. Focus on business quality, competitive moat and earnings growth."
        else:
            horizon_text = f"\nInvestment Horizon: {holding_days//365}+ years. This is long-term wealth creation — focus on compounding, management quality and industry position."

    # Use different prompt based on holding period
    if is_short_term:
        prompt = f"""You are StockSense AI — a sharp, data-driven analyst. The user wants to hold for {holding_days} days only — this is a SHORT-TERM trade, not long-term investment.

Stock: {symbol} | Current Price: ₹{price:,.2f}
{tech_text}
{horizon_text}

Recent News:
{news_text}

For a {holding_days}-day holding period, the chart and technicals matter MORE than fundamentals. Generate a SHORT-TERM THESIS based primarily on price action.

## 🏢 What Does This Company Do?
1-2 lines max — just context, not the focus for short-term.

## 📊 Current Chart Analysis
Based on the technical data above, what is the chart telling us RIGHT NOW? Is price in uptrend or downtrend? Where is it relative to support/resistance? Is momentum building or fading? Be specific with the numbers.

## 💰 Short-Term Valuation Check
Is the stock near 52W high/low? Is it overbought/oversold on RSI? Does the current price level make sense for a {holding_days}-day entry?

## 🟢 Why Enter Now (Bull Case for {holding_days} days)
3 specific reasons based on chart + news why the next {holding_days} days could be profitable.

## 🔴 Why This Could Go Wrong (Bear Case)
3 specific risks for the SHORT TERM — what chart signals or news could hurt this trade in {holding_days} days.

## 🎯 Short-Term Price Targets
- Entry: ₹{price:,.2f} (current price)
- Target in {holding_days} days: ₹X (with % upside)
- Stop Loss: ₹Y (if wrong, exit here — keep loss small)
- Risk-Reward: 1:X

## 📅 {holding_days}-Day Outlook
What specifically to watch for in the next {holding_days} days — earnings, events, chart levels.

## 💡 What Should You Do?
Direct actionable advice for this timeframe. Include whether to wait for a better entry or buy now.

Use ₹ for all prices. Be direct and specific — this is a SHORT-TERM trade."""
    else:
        prompt = f"""You are StockSense AI — a clear, beginner-friendly long-term investment analyst for Indian retail investors.

Stock: {symbol} | Current Price: ₹{price:,.2f}
{fund_text}
{horizon_text}

Recent News:
{news_text}

Write a LONG-TERM INVESTMENT THESIS that a first-time investor can easily understand. Avoid complex jargon — if you must use a financial term, explain it simply in brackets.

## 🏢 What Does This Company Do?
2-3 lines explaining the business in simple everyday language. Pretend you're explaining to a friend.

## 💰 Is It Cheap or Expensive Right Now?
Based on the P/E ratio and 52-week range, give a simple verdict: Overvalued / Fairly Valued / Undervalued. Explain WHY in 2-3 sentences that anyone can understand.

## 🟢 Reasons to Buy (Bull Case)
3 bullet points — explain the growth story, competitive advantages, and tailwinds. Use simple language. No buzzwords.

## 🔴 Reasons to Be Careful (Bear Case)
3 bullet points — honest risks that even beginners should know. Be specific.

## 🎯 Fair Value & Target
- Current Price: ₹{price:,.2f}
- Estimated Fair Value Range: ₹X – ₹Y (explain your reasoning briefly)
- Upside/Downside potential: X%
- Verdict: BUY / ACCUMULATE / HOLD / AVOID (with one sentence reason)

## 📅 {holding_days or 365}-Day Outlook
One paragraph on what to expect, what news to watch for, and what the price might do. Keep it realistic.

## 💡 What Should a Beginner Do?
One clear, specific action recommendation for someone investing for the first time.

Use ₹ for all prices. Write in plain English. Be honest about uncertainties."""
    # end of else block

    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are StockSense AI, a plain-English investment analyst for Indian retail investors."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        max_tokens=1100,
    )
    return response.choices[0].message.content


def generate_investment_thesis(symbol: str, price: float, news: list) -> str:
    return generate_investor_thesis(symbol, price, news)


def copilot_chat(message: str, user_portfolio: str) -> str:
    prompt = f"""You are "StockSense AI", a friendly and knowledgeable financial assistant for Indian retail investors and traders.

User Portfolio context: {user_portfolio}

User question: "{message}"

Instructions:
1. Answer clearly and directly. Be helpful, not preachy.
2. Use ₹ for all money values. Use Indian terms (Lakhs, Crores).
3. If asked about a specific stock, give concrete analysis.
4. If asked to explain a concept, use a simple example with real numbers.
5. If the question is about trading, give actionable trading guidance.
6. If the question is about investing, give long-term investment perspective.
7. If something is genuinely uncertain, say so honestly.
8. End with a practical next step or tip the user can act on.
9. Keep response under 400 words unless the topic genuinely needs more depth.
10. Do NOT add unnecessary disclaimers — you're an educational assistant, not a broker."""

    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are StockSense AI, a knowledgeable and friendly Indian financial markets assistant."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        max_tokens=800,
    )
    return response.choices[0].message.content


def ai_screener(query: str) -> list:
    prompt = f"""The user wants to find NSE stocks matching this criteria: "{query}"

Based on your knowledge of the Indian Stock Market (NSE/BSE), return a JSON array of up to 6 stock ticker symbols (with .NS suffix, e.g. "TCS.NS", "RELIANCE.NS", "HDFCBANK.NS") that best match this criteria.

Think carefully about which stocks genuinely match. For example:
- "profitable IT companies with low debt" → TCS.NS, INFY.NS, HCLTECH.NS, etc.
- "high ROE banking stocks" → HDFCBANK.NS, ICICIBANK.NS, KOTAKBANK.NS, etc.
- "beaten down midcap stocks" → pick relevant beaten down stocks

Only output the raw JSON array of strings, nothing else. No markdown, no explanation."""

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=200,
        )
        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        symbols = json.loads(content)
        if isinstance(symbols, list):
            return symbols
        return []
    except Exception as e:
        print(f"Screener error: {e}")
        return []


def generate_allocation_advice(amount: float, risk_profile: str, holding_period: str) -> dict:
    prompt = f"""You are StockSense AI, a portfolio allocation expert for Indian retail investors.

Investment Details:
- Amount: ₹{amount:,.0f}
- Risk Profile: {risk_profile}
- Holding Period: {holding_period}

Create a beginner-friendly portfolio allocation for this Indian investor. Keep language simple.

Return ONLY a valid JSON object with this exact structure:
{{
  "summary": "2-3 sentence plain English explanation of why this allocation suits the investor",
  "allocations": [
    {{"name": "Category Name", "percentage": 40, "rationale": "Simple 1-sentence reason", "examples": "Example funds/stocks in India"}},
    ...
  ],
  "top_picks": [
    {{"type": "Mutual Fund / Stock / ETF", "name": "Specific name", "reason": "Simple reason"}}
  ],
  "key_advice": "One important actionable tip for this investor"
}}

Make sure percentages add up to 100. Use only Indian investment options (NSE stocks, Indian MFs, NPS, etc.)."""

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a portfolio allocation expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=900,
        )
        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        result = json.loads(content)
        return result
    except Exception as e:
        print(f"Allocation error: {e}")
        return {
            "summary": "AI allocation service temporarily unavailable. Please try again.",
            "allocations": [],
            "top_picks": [],
            "key_advice": "Please check your GROQ_API_KEY in the backend .env file."
        }


def score_news_sentiment(symbol: str, headlines: list) -> dict:
    """Score news headlines for a stock and return sentiment label, score, summary."""
    if not headlines:
        return {"symbol": symbol, "sentiment": "Neutral", "score": 0, "summary": "No recent news found.", "headlines": []}

    headlines_text = "\n".join([f"- {h}" for h in headlines])
    prompt = f"""You are a financial news sentiment analyst for Indian stocks.

Stock: {symbol}
Recent headlines:
{headlines_text}

Analyze these headlines and respond ONLY with a JSON object in this exact format:
{{
  "sentiment": "Bullish" or "Bearish" or "Neutral",
  "score": <integer from -10 to +10>,
  "summary": "<1 sentence plain English summary of what the news means for this stock>",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}

Scoring guide:
- +8 to +10: Very positive news (results beat, big order win, upgrade)
- +4 to +7: Moderately positive (steady growth, minor positive)
- +1 to +3: Slightly positive
- 0: Completely neutral
- -1 to -3: Slightly negative
- -4 to -7: Moderately negative (miss, downgrade, minor issue)
- -8 to -10: Very negative (fraud, huge miss, regulatory action)

Only output the JSON. No markdown, no explanation."""

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=200,
        )
        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        result = json.loads(content)
        return {
            "symbol": symbol,
            "sentiment": result.get("sentiment", "Neutral"),
            "score": int(result.get("score", 0)),
            "summary": result.get("summary", ""),
            "keywords": result.get("keywords", []),
            "headlines": headlines,
        }
    except Exception as e:
        print(f"News sentiment error for {symbol}: {e}")
        return {"symbol": symbol, "sentiment": "Neutral", "score": 0, "summary": "Could not analyze news.", "headlines": headlines, "keywords": []}