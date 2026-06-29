"""
portfolio_metrics.py - Core financial metric computations
All metrics are mathematically accurate implementations used in institutional settings.
"""
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional, Tuple
import yfinance as yf
from datetime import datetime, timedelta



def sanitize_float(val):
    """Replace NaN/Inf with 0 for JSON serialization."""
    import math
    if val is None:
        return 0.0
    try:
        if math.isnan(val) or math.isinf(val):
            return 0.0
        return float(val)
    except (TypeError, ValueError):
        return 0.0

BENCHMARK_TICKERS = {
    "SP500": "^GSPC",
    "NASDAQ": "^IXIC",
    "NIFTY50": "^NSEI",
}

def sanitize_float(val):
    """Replace NaN/Inf with 0 for JSON serialization."""
    import math
    if val is None:
        return 0.0
    try:
        if math.isnan(val) or math.isinf(val):
            return 0.0
        return float(val)
    except (TypeError, ValueError):
        return 0.0

def fetch_price_data(
    tickers: List[str],
    period: str = "2y",
    interval: str = "1d"
) -> pd.DataFrame:
    """Fetch adjusted close prices for a list of tickers."""
    data = yf.download(
        tickers,
        period=period,
        interval=interval,
        auto_adjust=True,
        progress=False,
    )
    # Handle new yfinance multi-level columns (Price, Ticker)
    if isinstance(data.columns, pd.MultiIndex):
        if "Close" in data.columns.get_level_values(0):
            prices = data["Close"]
        else:
            prices = data.iloc[:, data.columns.get_level_values(0) == data.columns.get_level_values(0)[0]]
    else:
        if len(tickers) == 1:
            prices = data[["Close"]].rename(columns={"Close": tickers[0]})
        else:
            prices = data["Close"] if "Close" in data.columns else data
    # Ensure columns match tickers
    if isinstance(prices, pd.Series):
        prices = prices.to_frame(name=tickers[0])
    prices.columns = [str(c) for c in prices.columns]
    return prices.dropna(how="all")


def compute_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Compute daily log returns."""
    return np.log(prices / prices.shift(1)).dropna()


def portfolio_returns(
    returns: pd.DataFrame,
    weights: np.ndarray
) -> pd.Series:
    """Compute weighted portfolio returns."""
    return (returns * weights).sum(axis=1)


def total_return(prices: pd.DataFrame, weights: np.ndarray) -> float:
    """Compute total portfolio return over the period."""
    port_returns = portfolio_returns(compute_returns(prices), weights)
    return float(np.expm1(port_returns.sum()))


def annualized_return(port_ret: pd.Series, trading_days: int = 252) -> float:
    """Compute annualized geometric return."""
    n_days = len(port_ret)
    cumulative = np.expm1(port_ret.sum())
    years = n_days / trading_days
    return float((1 + cumulative) ** (1 / years) - 1)


def annualized_volatility(port_ret: pd.Series, trading_days: int = 252) -> float:
    """Compute annualized volatility (std of returns)."""
    return float(port_ret.std() * np.sqrt(trading_days))


def sharpe_ratio(
    port_ret: pd.Series,
    risk_free_rate: float = 0.05,
    trading_days: int = 252
) -> float:
    """Compute Sharpe Ratio: (annualized return - Rf) / annualized vol."""
    ann_ret = annualized_return(port_ret, trading_days)
    ann_vol = annualized_volatility(port_ret, trading_days)
    if ann_vol == 0:
        return 0.0
    return float((ann_ret - risk_free_rate) / ann_vol)


def sortino_ratio(
    port_ret: pd.Series,
    risk_free_rate: float = 0.05,
    trading_days: int = 252
) -> float:
    """Compute Sortino Ratio using downside deviation."""
    ann_ret = annualized_return(port_ret, trading_days)
    daily_rf = risk_free_rate / trading_days
    downside = port_ret[port_ret < daily_rf] - daily_rf
    downside_std = np.sqrt((downside ** 2).mean()) * np.sqrt(trading_days)
    if downside_std == 0:
        return 0.0
    return float((ann_ret - risk_free_rate) / downside_std)


def maximum_drawdown(port_ret: pd.Series) -> float:
    """Compute maximum drawdown from peak equity."""
    cumulative = (1 + np.expm1(port_ret.cumsum()))
    rolling_max = cumulative.cummax()
    drawdown = (cumulative - rolling_max) / rolling_max
    return float(drawdown.min())


def calmar_ratio(port_ret: pd.Series, trading_days: int = 252) -> float:
    """Calmar Ratio: annualized return / |max drawdown|."""
    mdd = abs(maximum_drawdown(port_ret))
    if mdd == 0:
        return 0.0
    return float(annualized_return(port_ret, trading_days) / mdd)


def beta_alpha(
    port_ret: pd.Series,
    benchmark_ret: pd.Series,
    risk_free_rate: float = 0.05,
    trading_days: int = 252
) -> Tuple[float, float]:
    """
    Compute Beta and Jensen's Alpha via OLS regression.
    Alpha is annualized.
    """
    daily_rf = risk_free_rate / trading_days
    excess_port = port_ret - daily_rf
    excess_bench = benchmark_ret - daily_rf
    aligned = pd.concat([excess_port, excess_bench], axis=1).dropna()
    if len(aligned) < 30:
        return 1.0, 0.0
    slope, intercept, _, _, _ = stats.linregress(
        aligned.iloc[:, 1], aligned.iloc[:, 0]
    )
    beta = float(slope)
    alpha = float(intercept * trading_days)  # annualize daily alpha
    return beta, alpha


def information_ratio(
    port_ret: pd.Series,
    benchmark_ret: pd.Series,
    trading_days: int = 252
) -> float:
    """Information Ratio: annualized excess return / tracking error."""
    aligned = pd.concat([port_ret, benchmark_ret], axis=1).dropna()
    active_ret = aligned.iloc[:, 0] - aligned.iloc[:, 1]
    tracking_error = active_ret.std() * np.sqrt(trading_days)
    if tracking_error == 0:
        return 0.0
    ann_active = active_ret.mean() * trading_days
    return float(ann_active / tracking_error)


def rolling_metrics(
    port_ret: pd.Series,
    window: int = 63,
    trading_days: int = 252
) -> Dict[str, pd.Series]:
    """Compute rolling volatility and Sharpe ratio."""
    rolling_vol = port_ret.rolling(window).std() * np.sqrt(trading_days)
    rolling_ret = port_ret.rolling(window).mean() * trading_days
    rolling_sharpe = rolling_ret / rolling_vol
    return {
        "rolling_volatility": rolling_vol,
        "rolling_sharpe": rolling_sharpe,
        "rolling_return": rolling_ret,
    }


def drawdown_series(port_ret: pd.Series) -> pd.Series:
    """Return full drawdown time series."""
    cumulative = (1 + np.expm1(port_ret.cumsum()))
    rolling_max = cumulative.cummax()
    return (cumulative - rolling_max) / rolling_max


def compute_full_metrics(
    tickers: List[str],
    weights: List[float],
    benchmark: str = "SP500",
    period: str = "2y",
) -> Dict:
    """
    Master function: compute all portfolio performance metrics.
    Returns a comprehensive dict of metrics and time series.
    """
    weights_arr = np.array(weights)
    weights_arr = weights_arr / weights_arr.sum()

    # Fetch data
    bench_ticker = BENCHMARK_TICKERS.get(benchmark, "^GSPC")
    all_tickers = tickers + [bench_ticker]
    prices = fetch_price_data(all_tickers, period=period)

    asset_prices = prices[tickers]
    bench_prices = prices[[bench_ticker]]

    returns = compute_returns(asset_prices)
    bench_returns = compute_returns(bench_prices).iloc[:, 0]
    bench_returns.name = benchmark

    port_ret = portfolio_returns(returns, weights_arr)
    aligned = pd.concat([port_ret, bench_returns], axis=1).dropna()
    port_ret_aligned = aligned.iloc[:, 0]
    bench_ret_aligned = aligned.iloc[:, 1]

    beta, alpha = beta_alpha(port_ret_aligned, bench_ret_aligned)
    rolling = rolling_metrics(port_ret_aligned)

    # Cumulative return series
    port_cumret = np.expm1(port_ret_aligned.cumsum())
    bench_cumret = np.expm1(bench_ret_aligned.cumsum())

    return {
        "metrics": {
            "total_return": sanitize_float(total_return(asset_prices, weights_arr)),
            "annualized_return": sanitize_float(annualized_return(port_ret_aligned)),
            "annualized_volatility": sanitize_float(annualized_volatility(port_ret_aligned)),
            "sharpe_ratio": sanitize_float(sharpe_ratio(port_ret_aligned)),
            "sortino_ratio": sanitize_float(sortino_ratio(port_ret_aligned)),
            "maximum_drawdown": sanitize_float(maximum_drawdown(port_ret_aligned)),
            "calmar_ratio": sanitize_float(calmar_ratio(port_ret_aligned)),
            "beta": sanitize_float(beta),
            "alpha": sanitize_float(alpha),
            "information_ratio": sanitize_float(information_ratio(port_ret_aligned, bench_ret_aligned)),
        },
        "time_series": {
            "dates": port_ret_aligned.index.strftime("%Y-%m-%d").tolist(),
            "portfolio_cumulative_return": [sanitize_float(x) for x in port_cumret.tolist()],
            "benchmark_cumulative_return": [sanitize_float(x) for x in bench_cumret.tolist()],
            "portfolio_returns": [sanitize_float(x) for x in port_ret_aligned.tolist()],
            "drawdown": [sanitize_float(x) for x in drawdown_series(port_ret_aligned).tolist()],
            "rolling_volatility": [sanitize_float(x) for x in rolling["rolling_volatility"].tolist()],
            "rolling_sharpe": [sanitize_float(x) for x in rolling["rolling_sharpe"].tolist()],
        },
        "benchmark": benchmark,
        "period": period,
    }
