"""Analytics router - performance metrics endpoint."""
from fastapi import APIRouter, HTTPException
from models.schemas import AnalyticsRequest
from analytics.portfolio_metrics import compute_full_metrics

router = APIRouter()


@router.post("/performance")
async def get_performance(req: AnalyticsRequest):
    try:
        result = compute_full_metrics(
            tickers=req.tickers,
            weights=req.weights,
            benchmark=req.benchmark.value,
            period=req.period.value,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
