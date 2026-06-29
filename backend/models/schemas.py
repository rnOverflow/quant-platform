"""
schemas.py - Pydantic request and response models for the API.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional
from enum import Enum


class BenchmarkEnum(str, Enum):
    SP500 = "SP500"
    NASDAQ = "NASDAQ"
    NIFTY50 = "NIFTY50"


class PeriodEnum(str, Enum):
    six_months = "6mo"
    one_year = "1y"
    two_years = "2y"
    five_years = "5y"


class Holding(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")
    weight: float = Field(..., ge=0.0, le=1.0, description="Portfolio weight [0, 1]")
    quantity: Optional[float] = Field(None, description="Number of shares")

    @field_validator("ticker")
    @classmethod
    def uppercase_ticker(cls, v):
        return v.upper().strip()


class Portfolio(BaseModel):
    name: str = Field(default="My Portfolio")
    holdings: List[Holding]

    @field_validator("holdings")
    @classmethod
    def validate_holdings(cls, v):
        if len(v) < 1:
            raise ValueError("Portfolio must have at least 1 holding")
        if len(v) > 30:
            raise ValueError("Portfolio supports max 30 holdings")
        return v


class AnalyticsRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    benchmark: BenchmarkEnum = BenchmarkEnum.SP500
    period: PeriodEnum = PeriodEnum.two_years

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, v):
        if abs(sum(v) - 1.0) > 0.05:
            # Normalize
            total = sum(v)
            return [w / total for w in v]
        return v


class OptimizationRequest(BaseModel):
    tickers: List[str]
    min_weight: float = Field(default=0.0, ge=0.0, le=1.0)
    max_weight: float = Field(default=1.0, ge=0.0, le=1.0)
    risk_free_rate: float = Field(default=0.05, ge=0.0, le=0.20)
    period: PeriodEnum = PeriodEnum.two_years


class VaRRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    confidence_level: float = Field(default=0.95, ge=0.90, le=0.99)
    period: PeriodEnum = PeriodEnum.two_years


class MonteCarloRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    horizon_days: int = Field(default=252, ge=30, le=1260)
    n_simulations: int = Field(default=10000, ge=1000, le=50000)
    initial_value: float = Field(default=100.0, ge=1.0)
    period: PeriodEnum = PeriodEnum.two_years


class StressTestRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    scenario_key: str
    portfolio_value: float = Field(default=1_000_000.0, ge=1000.0)


class CustomStressRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    market_drop_pct: float = Field(default=-0.20, ge=-1.0, le=0.0)
    volatility_increase_pct: float = Field(default=0.50, ge=0.0, le=5.0)
    sector_shock_pct: float = Field(default=-0.10, ge=-1.0, le=0.0)
    target_sector: str = "Technology"
    portfolio_value: float = Field(default=1_000_000.0)


class ReportRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    portfolio_name: str = "Investment Portfolio"
    benchmark: BenchmarkEnum = BenchmarkEnum.SP500
    period: PeriodEnum = PeriodEnum.two_years
    groq_api_key: Optional[str] = None
