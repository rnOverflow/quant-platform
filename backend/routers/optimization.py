"""Optimization router - MPT portfolio optimization."""
from fastapi import APIRouter, HTTPException
from models.schemas import OptimizationRequest
from analytics.optimizer import compute_optimization

router = APIRouter()


@router.post("/mvo")
async def mean_variance_optimization(req: OptimizationRequest):
    try:
        result = compute_optimization(
            tickers=req.tickers,
            min_weight=req.min_weight,
            max_weight=req.max_weight,
            risk_free_rate=req.risk_free_rate,
            period=req.period.value,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
