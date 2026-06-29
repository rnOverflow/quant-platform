"""
Quantitative Portfolio Analytics Platform - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import portfolio, analytics, optimization, simulation, risk, market, reports

app = FastAPI(
    title="Quantitative Portfolio Analytics Platform",
    description="Institutional-grade portfolio risk analytics API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(optimization.router, prefix="/api/optimization", tags=["Optimization"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["Simulation"])
app.include_router(risk.router, prefix="/api/risk", tags=["Risk"])
app.include_router(market.router, prefix="/api/market", tags=["Market"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Quant Platform API"}
