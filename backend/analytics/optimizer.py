"""
optimizer.py - Modern Portfolio Theory optimization using cvxpy and scipy.
Implements Mean-Variance Optimization with full Efficient Frontier generation.
"""
import numpy as np
import pandas as pd
import cvxpy as cp
from scipy.optimize import minimize
from typing import Dict, List, Optional, Tuple
from analytics.portfolio_metrics import fetch_price_data, compute_returns


def compute_covariance_and_returns(
    tickers: List[str],
    period: str = "2y",
) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
    """Fetch data, compute annualized mean returns and covariance matrix."""
    prices = fetch_price_data(tickers, period=period)
    returns = compute_returns(prices)
    mu = returns.mean().values * 252  # annualized expected returns
    sigma = returns.cov().values * 252  # annualized covariance
    return mu, sigma, returns


def minimum_variance_portfolio(
    mu: np.ndarray,
    sigma: np.ndarray,
    min_weight: float = 0.0,
    max_weight: float = 1.0,
) -> Dict:
    """
    Minimum variance portfolio using CVXPY.
    Minimizes w'Σw subject to sum(w)=1, w >= 0.
    """
    n = len(mu)
    w = cp.Variable(n)
    objective = cp.Minimize(cp.quad_form(w, sigma))
    constraints = [
        cp.sum(w) == 1,
        w >= min_weight,
        w <= max_weight,
    ]
    prob = cp.Problem(objective, constraints)
    prob.solve(solver=cp.CLARABEL)

    if prob.status not in ["optimal", "optimal_inaccurate"]:
        # Fallback: equal weights
        weights = np.ones(n) / n
    else:
        weights = np.array(w.value).flatten()

    weights = np.clip(weights, 0, 1)
    weights /= weights.sum()

    port_return = float(mu @ weights)
    port_vol = float(np.sqrt(weights @ sigma @ weights))
    sharpe = port_return / port_vol if port_vol > 0 else 0.0

    return {
        "weights": weights.tolist(),
        "expected_return": port_return,
        "volatility": port_vol,
        "sharpe_ratio": sharpe,
        "type": "minimum_variance",
    }


def maximum_sharpe_portfolio(
    mu: np.ndarray,
    sigma: np.ndarray,
    risk_free_rate: float = 0.05,
    min_weight: float = 0.0,
    max_weight: float = 1.0,
) -> Dict:
    """
    Maximum Sharpe portfolio via negative Sharpe minimization.
    Uses scipy optimize with SLSQP.
    """
    n = len(mu)

    def neg_sharpe(w):
        port_ret = mu @ w
        port_vol = np.sqrt(w @ sigma @ w)
        if port_vol < 1e-10:
            return 0.0
        return -(port_ret - risk_free_rate) / port_vol

    def jac_neg_sharpe(w):
        port_ret = mu @ w
        port_vol = np.sqrt(w @ sigma @ w)
        excess = port_ret - risk_free_rate
        d_ret = mu
        d_vol = (sigma @ w) / port_vol
        return -(d_ret * port_vol - excess * d_vol) / port_vol**2

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    bounds = [(min_weight, max_weight)] * n
    w0 = np.ones(n) / n

    result = minimize(
        neg_sharpe,
        w0,
        jac=jac_neg_sharpe,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 1000, "ftol": 1e-9},
    )

    weights = np.clip(result.x, 0, 1)
    weights /= weights.sum()

    port_return = float(mu @ weights)
    port_vol = float(np.sqrt(weights @ sigma @ weights))
    sharpe = (port_return - risk_free_rate) / port_vol if port_vol > 0 else 0.0

    return {
        "weights": weights.tolist(),
        "expected_return": port_return,
        "volatility": port_vol,
        "sharpe_ratio": sharpe,
        "type": "maximum_sharpe",
    }


def efficient_frontier(
    mu: np.ndarray,
    sigma: np.ndarray,
    n_points: int = 60,
    min_weight: float = 0.0,
    max_weight: float = 1.0,
) -> List[Dict]:
    """
    Generate Efficient Frontier by solving min-variance for target return levels.
    Returns list of (vol, return) pairs.
    """
    n = len(mu)
    min_ret = float(mu.min()) * 0.9
    max_ret = float(mu.max()) * 1.1
    target_returns = np.linspace(min_ret, max_ret, n_points)
    frontier = []

    for target in target_returns:
        w = cp.Variable(n)
        objective = cp.Minimize(cp.quad_form(w, sigma))
        constraints = [
            cp.sum(w) == 1,
            mu @ w >= target,
            w >= min_weight,
            w <= max_weight,
        ]
        prob = cp.Problem(objective, constraints)
        prob.solve(solver=cp.CLARABEL)

        if prob.status in ["optimal", "optimal_inaccurate"] and w.value is not None:
            wts = np.clip(np.array(w.value).flatten(), 0, 1)
            wts /= wts.sum()
            vol = float(np.sqrt(wts @ sigma @ wts))
            ret = float(mu @ wts)
            frontier.append({
                "volatility": vol,
                "expected_return": ret,
                "weights": wts.tolist(),
                "sharpe": (ret - 0.05) / vol if vol > 0 else 0,
            })

    return frontier


def compute_optimization(
    tickers: List[str],
    min_weight: float = 0.0,
    max_weight: float = 1.0,
    risk_free_rate: float = 0.05,
    period: str = "2y",
) -> Dict:
    """
    Master optimization function: run all MPT strategies + efficient frontier.
    """
    mu, sigma, returns = compute_covariance_and_returns(tickers, period)

    min_var = minimum_variance_portfolio(mu, sigma, min_weight, max_weight)
    max_sharpe = maximum_sharpe_portfolio(mu, sigma, risk_free_rate, min_weight, max_weight)
    frontier = efficient_frontier(mu, sigma, 60, min_weight, max_weight)

    # Individual asset risk-return for scatter
    individual_assets = []
    for i, ticker in enumerate(tickers):
        individual_assets.append({
            "ticker": ticker,
            "expected_return": float(mu[i]),
            "volatility": float(np.sqrt(sigma[i, i])),
        })

    # Correlation matrix
    corr_matrix = returns.corr()

    return {
        "minimum_variance": {**min_var, "tickers": tickers},
        "maximum_sharpe": {**max_sharpe, "tickers": tickers},
        "efficient_frontier": frontier,
        "individual_assets": individual_assets,
        "correlation_matrix": corr_matrix.to_dict(),
        "expected_returns": dict(zip(tickers, mu.tolist())),
        "volatilities": dict(zip(tickers, np.sqrt(np.diag(sigma)).tolist())),
    }
