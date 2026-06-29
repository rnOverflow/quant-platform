"""Portfolio router - portfolio management and info."""
from fastapi import APIRouter, HTTPException
import yfinance as yf
from typing import List
from models.schemas import Portfolio

router = APIRouter()


@router.post("/validate")
async def validate_tickers(tickers: List[str]):
    """Validate a list of tickers and return basic info."""
    results = {}
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker.upper())
            info = t.info
            results[ticker.upper()] = {
                "valid": True,
                "name": info.get("longName", ticker),
                "sector": info.get("sector", "Unknown"),
                "industry": info.get("industry", "Unknown"),
                "market_cap": info.get("marketCap"),
                "currency": info.get("currency", "USD"),
                "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            }
        except Exception:
            results[ticker.upper()] = {"valid": False, "name": ticker}
    return results


@router.get("/info/{ticker}")
async def get_ticker_info(ticker: str):
    """Fetch detailed info for a single ticker."""
    try:
        t = yf.Ticker(ticker.upper())
        info = t.info
        hist = t.history(period="1y")
        current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
        year_high = hist["High"].max() if not hist.empty else None
        year_low = hist["Low"].min() if not hist.empty else None
        return {
            "ticker": ticker.upper(),
            "name": info.get("longName", ticker),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "dividend_yield": info.get("dividendYield"),
            "beta": info.get("beta"),
            "52_week_high": year_high,
            "52_week_low": year_low,
            "current_price": current_price,
            "description": info.get("longBusinessSummary", "")[:300],
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Ticker not found: {ticker}")
