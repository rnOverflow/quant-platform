"""
risk_engine.py - Value at Risk, Expected Shortfall, and Risk Decomposition
Implements Historical, Parametric, and Monte Carlo VaR methods.
"""
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Tuple
from analytics.portfolio_metrics import fetch_price_data, compute_returns, portfolio_returns


def historical_var(
    port_ret: pd.Series,
    confidence_level: float = 0.95,
    horizon_days: int = 1,
) -> float:
    """
    Historical VaR: empirical percentile of P&L distribution.
    Scaled to desired horizon using sqrt-of-time rule.
    """
    daily_var = float(np.percentile(port_ret, (1 - confidence_level) * 100))
    return daily_var * np.sqrt(horizon_days)


def parametric_var(
    port_ret: pd.Series,
    confidence_level: float = 0.95,
    horizon_days: int = 1,
) -> float:
    """
    Parametric (Gaussian) VaR: assumes normally distributed returns.
    VaR = μ - z * σ, scaled to horizon.
    """
    mu = port_ret.mean()
    sigma = port_ret.std()
    z = stats.norm.ppf(1 - confidence_level)
    daily_var = mu + z * sigma
    return float(daily_var * np.sqrt(horizon_days))


def monte_carlo_var(
    port_ret: pd.Series,
    confidence_level: float = 0.95,
    horizon_days: int = 1,
    n_simulations: int = 50000,
) -> float:
    """
    Monte Carlo VaR: simulate returns from fitted distribution.
    """
    mu = port_ret.mean()
    sigma = port_ret.std()
    simulated = np.random.normal(mu * horizon_days, sigma * np.sqrt(horizon_days), n_simulations)
    return float(np.percentile(simulated, (1 - confidence_level) * 100))


def conditional_var(
    port_ret: pd.Series,
    confidence_level: float = 0.95,
    method: str = "historical",
    horizon_days: int = 1,
) -> float:
    """
    Conditional VaR (Expected Shortfall): mean of losses beyond VaR threshold.
    ES is always more conservative than VaR.
    """
    if method == "historical":
        threshold = np.percentile(port_ret, (1 - confidence_level) * 100)
        tail_losses = port_ret[port_ret <= threshold]
        if len(tail_losses) == 0:
            return 0.0
        cvar = float(tail_losses.mean())
    elif method == "parametric":
        mu = port_ret.mean()
        sigma = port_ret.std()
        z = stats.norm.ppf(1 - confidence_level)
        cvar = float(mu - sigma * stats.norm.pdf(z) / (1 - confidence_level))
    else:
        cvar = historical_var(port_ret, confidence_level, horizon_days)

    return cvar * np.sqrt(horizon_days)


def risk_decomposition(
    returns: pd.DataFrame,
    weights: np.ndarray,
) -> Dict:
    """
    Compute marginal and component contributions to portfolio risk.
    Based on Euler decomposition of portfolio variance.
    """
    cov_matrix = returns.cov().values * 252  # annualized
    port_variance = float(weights @ cov_matrix @ weights)
    port_vol = np.sqrt(port_variance)

    # Marginal contribution to risk
    marginal_contrib = (cov_matrix @ weights) / port_vol
    # Component contribution (absolute)
    component_contrib = weights * marginal_contrib
    # Percentage contribution
    pct_contrib = component_contrib / port_vol

    return {
        "tickers": returns.columns.tolist(),
        "weights": weights.tolist(),
        "marginal_contribution": marginal_contrib.tolist(),
        "component_contribution": component_contrib.tolist(),
        "percentage_contribution": pct_contrib.tolist(),
        "portfolio_volatility": float(port_vol),
        "correlation_matrix": returns.corr().to_dict(),
        "covariance_matrix": returns.cov().to_dict(),
    }


def compute_var_metrics(
    tickers: List[str],
    weights: List[float],
    confidence_level: float = 0.95,
    period: str = "2y",
) -> Dict:
    """
    Comprehensive VaR analysis: all methods and horizons.
    """
    weights_arr = np.array(weights)
    weights_arr = weights_arr / weights_arr.sum()

    prices = fetch_price_data(tickers, period=period)
    returns = compute_returns(prices)
    port_ret = portfolio_returns(returns, weights_arr)

    horizons = {"daily": 1, "weekly": 5, "monthly": 21}
    results = {}

    for horizon_name, horizon_days in horizons.items():
        results[horizon_name] = {
            "historical_var": historical_var(port_ret, confidence_level, horizon_days),
            "parametric_var": parametric_var(port_ret, confidence_level, horizon_days),
            "monte_carlo_var": monte_carlo_var(port_ret, confidence_level, horizon_days),
            "conditional_var": conditional_var(port_ret, confidence_level, "historical", horizon_days),
        }

    # Return distribution stats
    return_dist = {
        "mean": float(port_ret.mean()),
        "std": float(port_ret.std()),
        "skewness": float(stats.skew(port_ret.dropna())),
        "kurtosis": float(stats.kurtosis(port_ret.dropna())),
        "jarque_bera_pvalue": float(stats.jarque_bera(port_ret.dropna())[1]),
        "histogram": {
            "values": port_ret.dropna().tolist(),
        },
    }

    decomp = risk_decomposition(returns, weights_arr)

    return {
        "var_metrics": results,
        "confidence_level": confidence_level,
        "return_distribution": return_dist,
        "risk_decomposition": decomp,
    }
