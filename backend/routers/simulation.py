"""Simulation router - Monte Carlo and stress testing."""
from fastapi import APIRouter, HTTPException
from models.schemas import MonteCarloRequest, StressTestRequest, CustomStressRequest
from analytics.monte_carlo import run_monte_carlo
from analytics.stress_testing import run_stress_test, custom_stress_test, get_all_scenarios

router = APIRouter()


@router.post("/monte-carlo")
async def monte_carlo(req: MonteCarloRequest):
    try:
        result = run_monte_carlo(
            tickers=req.tickers,
            weights=req.weights,
            horizon_days=req.horizon_days,
            n_simulations=req.n_simulations,
            initial_value=req.initial_value,
            period=req.period.value,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stress-test")
async def stress_test(req: StressTestRequest):
    try:
        result = run_stress_test(
            tickers=req.tickers,
            weights=req.weights,
            scenario_key=req.scenario_key,
            portfolio_value=req.portfolio_value,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom-stress")
async def custom_stress(req: CustomStressRequest):
    try:
        result = custom_stress_test(
            tickers=req.tickers,
            weights=req.weights,
            market_drop_pct=req.market_drop_pct,
            volatility_increase_pct=req.volatility_increase_pct,
            sector_shock_pct=req.sector_shock_pct,
            target_sector=req.target_sector,
            portfolio_value=req.portfolio_value,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios")
async def list_scenarios():
    return get_all_scenarios()
