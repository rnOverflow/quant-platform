"""Risk router - VaR, CVaR, risk decomposition."""
from fastapi import APIRouter, HTTPException
from models.schemas import VaRRequest
from analytics.risk_engine import compute_var_metrics

router = APIRouter()


@router.post("/var")
async def get_var(req: VaRRequest):
    try:
        result = compute_var_metrics(
            tickers=req.tickers,
            weights=req.weights,
            confidence_level=req.confidence_level,
            period=req.period.value,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
