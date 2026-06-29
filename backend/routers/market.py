"""Market router - live market data, indices, movers."""
from fastapi import APIRouter, HTTPException
import yfinance as yf
import pandas as pd
from datetime import datetime

router = APIRouter()

MAJOR_INDICES = {
    "S&P 500": "^GSPC",
    "NASDAQ": "^IXIC",
    "Dow Jones": "^DJI",
    "Russell 2000": "^RUT",
    "NIFTY 50": "^NSEI",
    "VIX": "^VIX",
}

TOP_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "JPM", "V", "UNH",
    "XOM", "JNJ", "WMT", "PG", "MA",
]


@router.get("/indices")
async def get_indices():
    """Fetch major market indices with price and change."""
    results = []
    for name, ticker in MAJOR_INDICES.items():
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period="2d", interval="1d")
            if len(hist) >= 2:
                prev_close = float(hist["Close"].iloc[-2])
                current = float(hist["Close"].iloc[-1])
                change_pct = (current - prev_close) / prev_close
            elif len(hist) == 1:
                current = float(hist["Close"].iloc[-1])
                prev_close = current
                change_pct = 0.0
            else:
                continue
            results.append({
                "name": name,
                "ticker": ticker,
                "price": round(current, 2),
                "change_pct": round(change_pct * 100, 3),
                "change_abs": round(current - prev_close, 2),
            })
        except Exception:
            continue
    return results


@router.get("/movers")
async def get_market_movers():
    """Fetch top gainers and losers from major stocks."""
    movers = []
    for ticker in TOP_STOCKS:
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period="2d", interval="1d")
            if len(hist) >= 2:
                prev = float(hist["Close"].iloc[-2])
                curr = float(hist["Close"].iloc[-1])
                change_pct = (curr - prev) / prev
                movers.append({
                    "ticker": ticker,
                    "price": round(curr, 2),
                    "change_pct": round(change_pct * 100, 3),
                    "change_abs": round(curr - prev, 2),
                    "volume": int(hist["Volume"].iloc[-1]) if "Volume" in hist else 0,
                })
        except Exception:
            continue

    movers.sort(key=lambda x: x["change_pct"])
    return {
        "top_losers": movers[:5],
        "top_gainers": movers[-5:][::-1],
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/quote/{ticker}")
async def get_quote(ticker: str):
    """Fetch real-time quote for a ticker."""
    try:
        t = yf.Ticker(ticker.upper())
        hist = t.history(period="1d", interval="1m")
        if hist.empty:
            hist = t.history(period="2d", interval="1d")

        price = float(hist["Close"].iloc[-1])
        prev = float(hist["Open"].iloc[0])
        change_pct = (price - prev) / prev

        return {
            "ticker": ticker.upper(),
            "price": round(price, 2),
            "change_pct": round(change_pct * 100, 3),
            "change_abs": round(price - prev, 2),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
