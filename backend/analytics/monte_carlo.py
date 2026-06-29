"""
monte_carlo.py - Monte Carlo simulation for portfolio future performance.
Uses Geometric Brownian Motion with correlated asset returns.
"""
import numpy as np
import pandas as pd
from typing import Dict, List
from analytics.portfolio_metrics import fetch_price_data, compute_returns, portfolio_returns


def run_monte_carlo(
    tickers: List[str],
    weights: List[float],
    horizon_days: int = 252,
    n_simulations: int = 10000,
    confidence_intervals: List[float] = [0.05, 0.25, 0.50, 0.75, 0.95],
    period: str = "2y",
    initial_value: float = 100.0,
) -> Dict:
    """
    Monte Carlo simulation using correlated GBM.
    Generates n_simulations paths over horizon_days.
    
    GBM: dS = μS dt + σS dW
    Log return: r = (μ - σ²/2)dt + σ√dt * Z
    """
    weights_arr = np.array(weights)
    weights_arr = weights_arr / weights_arr.sum()

    # Fetch historical returns
    prices = fetch_price_data(tickers, period=period)
    returns = compute_returns(prices)
    
    # Align to available tickers
    available = [t for t in tickers if t in returns.columns]
    returns = returns[available]
    weights_arr = weights_arr[:len(available)]
    weights_arr /= weights_arr.sum()

    # Compute mean returns and covariance
    mu = returns.mean().values  # daily
    cov = returns.cov().values  # daily
    sigma = np.sqrt(np.diag(cov))  # daily vol

    # Cholesky decomposition for correlated sampling
    try:
        chol = np.linalg.cholesky(cov + np.eye(len(mu)) * 1e-8)
    except np.linalg.LinAlgError:
        chol = np.diag(sigma)

    n_assets = len(available)
    # Shape: (n_simulations, horizon_days, n_assets)
    Z = np.random.standard_normal((n_simulations, horizon_days, n_assets))
    # Correlated shocks: Z_corr = Z @ chol.T
    Z_corr = Z @ chol.T

    # GBM log returns with drift adjustment
    drift = mu - 0.5 * sigma**2
    daily_log_returns = drift[np.newaxis, np.newaxis, :] + Z_corr

    # Portfolio log returns per day
    port_log_returns = (daily_log_returns * weights_arr[np.newaxis, np.newaxis, :]).sum(axis=2)
    # Shape: (n_simulations, horizon_days)

    # Cumulative portfolio values
    cumulative_log = np.cumsum(port_log_returns, axis=1)
    portfolio_values = initial_value * np.exp(cumulative_log)
    # Shape: (n_simulations, horizon_days)

    # Final values
    final_values = portfolio_values[:, -1]
    final_returns = (final_values - initial_value) / initial_value

    # Fan chart: percentile paths
    fan_data = {}
    dates = list(range(horizon_days))
    for ci in confidence_intervals:
        fan_data[f"p{int(ci*100)}"] = np.percentile(portfolio_values, ci * 100, axis=0).tolist()

    # Compute statistics
    prob_loss = float((final_returns < 0).mean())
    prob_gain_10 = float((final_returns > 0.10).mean())
    prob_gain_20 = float((final_returns > 0.20).mean())
    
    expected_final = float(np.mean(final_values))
    median_final = float(np.median(final_values))
    var_95 = float(np.percentile(final_returns, 5))
    cvar_95 = float(final_returns[final_returns <= var_95].mean()) if (final_returns <= var_95).any() else var_95

    # Return distribution histogram
    hist_counts, hist_bins = np.histogram(final_returns, bins=80)

    # Sample paths for display (show 200 paths)
    sample_idx = np.random.choice(n_simulations, size=min(200, n_simulations), replace=False)
    sample_paths = portfolio_values[sample_idx].tolist()

    return {
        "fan_chart": fan_data,
        "sample_paths": sample_paths,
        "statistics": {
            "expected_final_value": expected_final,
            "median_final_value": median_final,
            "initial_value": initial_value,
            "expected_return": float(np.mean(final_returns)),
            "median_return": float(np.median(final_returns)),
            "std_return": float(np.std(final_returns)),
            "var_95": var_95,
            "cvar_95": cvar_95,
            "probability_of_loss": prob_loss,
            "probability_gain_10pct": prob_gain_10,
            "probability_gain_20pct": prob_gain_20,
            "min_outcome": float(final_returns.min()),
            "max_outcome": float(final_returns.max()),
        },
        "histogram": {
            "counts": hist_counts.tolist(),
            "bins": hist_bins.tolist(),
        },
        "horizon_days": horizon_days,
        "n_simulations": n_simulations,
        "confidence_intervals": confidence_intervals,
    }
