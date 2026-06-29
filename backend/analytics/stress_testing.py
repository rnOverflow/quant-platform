"""
stress_testing.py - Historical crisis scenario simulation and custom stress tests.
"""
import numpy as np
import pandas as pd
from typing import Dict, List
from analytics.portfolio_metrics import fetch_price_data, compute_returns


# Historical crisis scenarios with approximate market shocks
CRISIS_SCENARIOS = {
    "2008_financial_crisis": {
        "name": "2008 Financial Crisis",
        "description": "Lehman Brothers collapse, global credit freeze",
        "period_start": "2008-09-01",
        "period_end": "2009-03-09",
        "market_shock": -0.565,  # S&P 500 peak-to-trough
        "volatility_multiplier": 3.5,
        "sector_shocks": {
            "Financials": -0.78,
            "Real Estate": -0.72,
            "Consumer Discretionary": -0.60,
            "Energy": -0.52,
            "Technology": -0.48,
            "Healthcare": -0.28,
            "Utilities": -0.22,
            "Consumer Staples": -0.18,
        },
    },
    "covid_crash": {
        "name": "COVID-19 Market Crash",
        "description": "Pandemic-induced market collapse, Feb-Mar 2020",
        "period_start": "2020-02-19",
        "period_end": "2020-03-23",
        "market_shock": -0.340,
        "volatility_multiplier": 4.0,
        "sector_shocks": {
            "Energy": -0.62,
            "Financials": -0.42,
            "Consumer Discretionary": -0.38,
            "Industrials": -0.37,
            "Real Estate": -0.35,
            "Technology": -0.22,
            "Healthcare": -0.15,
            "Consumer Staples": -0.12,
        },
    },
    "dotcom_bubble": {
        "name": "Dot-com Bubble",
        "description": "Tech bubble burst, March 2000 to October 2002",
        "period_start": "2000-03-10",
        "period_end": "2002-10-09",
        "market_shock": -0.492,
        "volatility_multiplier": 2.2,
        "sector_shocks": {
            "Technology": -0.82,
            "Telecommunications": -0.75,
            "Consumer Discretionary": -0.42,
            "Financials": -0.30,
            "Industrials": -0.28,
            "Energy": -0.15,
            "Utilities": -0.10,
            "Healthcare": -0.08,
        },
    },
    "inflation_shock": {
        "name": "2022 Inflation Shock",
        "description": "Rapid Fed rate hikes to combat 40-year high inflation",
        "period_start": "2022-01-03",
        "period_end": "2022-10-12",
        "market_shock": -0.252,
        "volatility_multiplier": 2.1,
        "sector_shocks": {
            "Technology": -0.38,
            "Consumer Discretionary": -0.40,
            "Communication Services": -0.42,
            "Real Estate": -0.30,
            "Financials": -0.18,
            "Energy": +0.58,
            "Utilities": -0.05,
            "Consumer Staples": -0.05,
        },
    },
    "interest_rate_hike": {
        "name": "Rapid Interest Rate Hike",
        "description": "Simulated aggressive 300bps rate increase over 6 months",
        "period_start": None,
        "period_end": None,
        "market_shock": -0.20,
        "volatility_multiplier": 1.8,
        "sector_shocks": {
            "Real Estate": -0.35,
            "Utilities": -0.25,
            "Consumer Staples": -0.12,
            "Financials": +0.05,
            "Energy": +0.08,
            "Technology": -0.22,
            "Healthcare": -0.08,
            "Industrials": -0.10,
        },
    },
}

# Approximate sector mappings for common tickers
TICKER_SECTOR_MAP = {
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology",
    "META": "Technology", "NVDA": "Technology", "AMD": "Technology",
    "AMZN": "Consumer Discretionary", "TSLA": "Consumer Discretionary",
    "JPM": "Financials", "BAC": "Financials", "GS": "Financials",
    "XOM": "Energy", "CVX": "Energy", "SLB": "Energy",
    "JNJ": "Healthcare", "PFE": "Healthcare", "UNH": "Healthcare",
    "PG": "Consumer Staples", "KO": "Consumer Staples", "WMT": "Consumer Staples",
    "NEE": "Utilities", "DUK": "Utilities",
    "SPG": "Real Estate", "AMT": "Real Estate",
    "CAT": "Industrials", "BA": "Industrials", "GE": "Industrials",
    "VZ": "Communication Services", "T": "Communication Services",
}


def get_ticker_sector(ticker: str) -> str:
    """Return sector for a ticker, default to broad market."""
    import yfinance as yf
    if ticker in TICKER_SECTOR_MAP:
        return TICKER_SECTOR_MAP[ticker]
    try:
        info = yf.Ticker(ticker).info
        return info.get("sector", "Technology")
    except Exception:
        return "Technology"


def run_stress_test(
    tickers: List[str],
    weights: List[float],
    scenario_key: str,
    portfolio_value: float = 1_000_000.0,
) -> Dict:
    """
    Apply a historical crisis scenario to a portfolio.
    Computes expected losses using sector-specific shocks.
    """
    weights_arr = np.array(weights)
    weights_arr = weights_arr / weights_arr.sum()

    if scenario_key not in CRISIS_SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_key}. Choose from {list(CRISIS_SCENARIOS.keys())}")

    scenario = CRISIS_SCENARIOS[scenario_key]
    sectors = [get_ticker_sector(t) for t in tickers]

    # Compute per-asset shock based on sector
    asset_shocks = []
    for sector in sectors:
        shock = scenario["sector_shocks"].get(sector, scenario["market_shock"])
        asset_shocks.append(shock)

    asset_shocks_arr = np.array(asset_shocks)

    # Portfolio level shock
    portfolio_shock = float(weights_arr @ asset_shocks_arr)
    portfolio_loss_dollar = portfolio_value * portfolio_shock
    portfolio_loss_pct = portfolio_shock

    # Per-asset contributions
    asset_contributions = []
    for i, ticker in enumerate(tickers):
        contribution_pct = weights_arr[i] * asset_shocks_arr[i]
        contribution_dollar = portfolio_value * contribution_pct
        asset_contributions.append({
            "ticker": ticker,
            "sector": sectors[i],
            "weight": float(weights_arr[i]),
            "shock_pct": float(asset_shocks_arr[i]),
            "contribution_pct": float(contribution_pct),
            "contribution_dollar": float(contribution_dollar),
        })

    # Estimate recovery time (rough heuristic: annualized 7% CAGR recovery)
    annual_recovery_rate = 0.07
    if portfolio_loss_pct < 0:
        years_to_recover = abs(np.log(1 / (1 + portfolio_loss_pct))) / np.log(1 + annual_recovery_rate)
    else:
        years_to_recover = 0.0

    return {
        "scenario": {
            "key": scenario_key,
            "name": scenario["name"],
            "description": scenario["description"],
        },
        "portfolio_impact": {
            "shock_pct": portfolio_loss_pct,
            "shock_dollar": portfolio_loss_dollar,
            "final_value": portfolio_value + portfolio_loss_dollar,
            "recovery_years_estimate": float(years_to_recover),
        },
        "asset_contributions": sorted(asset_contributions, key=lambda x: x["contribution_pct"]),
        "market_shock": scenario["market_shock"],
        "volatility_multiplier": scenario["volatility_multiplier"],
    }


def custom_stress_test(
    tickers: List[str],
    weights: List[float],
    market_drop_pct: float,
    volatility_increase_pct: float,
    sector_shock_pct: float,
    target_sector: str = "Technology",
    portfolio_value: float = 1_000_000.0,
) -> Dict:
    """
    User-defined custom scenario stress test.
    """
    weights_arr = np.array(weights)
    weights_arr = weights_arr / weights_arr.sum()
    sectors = [get_ticker_sector(t) for t in tickers]

    asset_shocks = []
    for sector in sectors:
        if sector == target_sector:
            asset_shocks.append(market_drop_pct + sector_shock_pct)
        else:
            asset_shocks.append(market_drop_pct)
    asset_shocks_arr = np.array(asset_shocks)

    portfolio_shock = float(weights_arr @ asset_shocks_arr)
    portfolio_loss_dollar = portfolio_value * portfolio_shock

    recovery_rate = 0.07
    years_to_recover = 0.0
    if portfolio_shock < 0:
        years_to_recover = abs(np.log(1 / (1 + portfolio_shock))) / np.log(1 + recovery_rate)

    asset_results = []
    for i, ticker in enumerate(tickers):
        asset_results.append({
            "ticker": ticker,
            "sector": sectors[i],
            "weight": float(weights_arr[i]),
            "shock_pct": float(asset_shocks_arr[i]),
            "contribution_pct": float(weights_arr[i] * asset_shocks_arr[i]),
            "contribution_dollar": float(portfolio_value * weights_arr[i] * asset_shocks_arr[i]),
        })

    return {
        "scenario": {
            "key": "custom",
            "name": "Custom Stress Scenario",
            "description": f"Market drop: {market_drop_pct*100:.1f}%, Vol increase: {volatility_increase_pct*100:.1f}%, Sector shock: {sector_shock_pct*100:.1f}%",
        },
        "portfolio_impact": {
            "shock_pct": portfolio_shock,
            "shock_dollar": portfolio_loss_dollar,
            "final_value": portfolio_value + portfolio_loss_dollar,
            "recovery_years_estimate": years_to_recover,
        },
        "asset_contributions": sorted(asset_results, key=lambda x: x["contribution_pct"]),
        "parameters": {
            "market_drop_pct": market_drop_pct,
            "volatility_increase_pct": volatility_increase_pct,
            "sector_shock_pct": sector_shock_pct,
            "target_sector": target_sector,
        },
    }


def get_all_scenarios() -> List[Dict]:
    """Return all available stress scenarios."""
    return [
        {"key": k, "name": v["name"], "description": v["description"]}
        for k, v in CRISIS_SCENARIOS.items()
    ]
