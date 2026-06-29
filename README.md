# QuantEdge — Institutional Portfolio Analytics Platform

> **Full-stack quantitative finance platform** built for Goldman Sachs 2027 Analyst interviews and institutional-grade portfolio risk management.

![Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20React%20%7C%20TypeScript-blue)
![Analytics](https://img.shields.io/badge/analytics-MPT%20%7C%20VaR%20%7C%20Monte%20Carlo-gold)
![License](https://img.shields.io/badge/license-MIT-green)

---

##  Overview

QuantEdge is a production-quality, Bloomberg Terminal-inspired investment analytics platform featuring:

- **Real financial computations** — every metric is mathematically implemented
- **Institutional UI/UX** — dark glassmorphism, animated counters, interactive Recharts
- **Full-stack architecture** — FastAPI backend + React/TypeScript frontend
- **Docker-ready** deployment

---

##  Feature Set

| Module | Capabilities |
|--------|-------------|
| **Portfolio Builder** | Add stocks by ticker, assign weights, sector/geo allocation pie charts |
| **Performance Analytics** | Total return, annualized return, Sharpe, Sortino, Beta, Alpha, Max Drawdown, rolling metrics |
| **Portfolio Optimization** | Mean-Variance Optimization (cvxpy), Min Variance, Max Sharpe, Efficient Frontier |
| **Monte Carlo Simulation** | 10,000+ correlated GBM paths, fan charts, VaR, probability of loss |
| **Risk Analytics** | Historical, Parametric, Monte Carlo VaR; CVaR/ES; Euler risk decomposition |
| **Stress Testing** | 2008 Crisis, COVID Crash, Dot-com Bubble, Inflation Shock + custom scenarios |
| **Live Market Data** | Major indices, top gainers/losers, portfolio watchlist via yfinance |
| **AI Investment Reports** | PDF export with ReportLab; optional Groq LLaMA AI commentary |

---

##  Tech Stack

**Frontend:** React 18 · Vite · TypeScript · TailwindCSS · Framer Motion · Recharts · Zustand

**Backend:** FastAPI · Python 3.11 · yfinance · pandas · numpy · scipy · cvxpy · statsmodels

**Deployment:** Docker · Docker Compose · Nginx

---

##  Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/rnOverflow/quant-platform.git
cd quant-platform
docker compose up --build
```

Open http://localhost:5173

### Option 2: Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

##  Financial Math

| Metric | Formula |
|--------|---------|
| Sharpe Ratio | `(R_p - R_f) / σ_p` (annualized) |
| Sortino Ratio | `(R_p - R_f) / σ_downside` |
| Maximum Drawdown | `min((V_t - peak_t) / peak_t)` |
| Jensen's Alpha | `R_p - [R_f + β(R_m - R_f)]` (via OLS) |
| Historical VaR | Empirical percentile of P&L distribution |
| Parametric VaR | `μ + z_α · σ` (Gaussian) |
| CVaR / ES | `E[R | R ≤ VaR_α]` |
| Monte Carlo | Correlated GBM with Cholesky decomposition |
| MVO | `min w'Σw` s.t. `Σw=1, w≥0` (cvxpy CLARABEL) |
| Max Sharpe | SLSQP negative Sharpe minimization |

---

##  Project Structure

```
quant-platform/
├── backend/
│   ├── analytics/
│   │   ├── portfolio_metrics.py   # Return, Sharpe, Alpha, Beta, etc.
│   │   ├── risk_engine.py         # VaR, CVaR, risk decomposition
│   │   ├── optimizer.py           # MPT, efficient frontier (cvxpy)
│   │   ├── monte_carlo.py         # Correlated GBM simulation
│   │   └── stress_testing.py      # Crisis scenarios
│   ├── routers/                   # FastAPI route handlers
│   ├── models/schemas.py          # Pydantic request/response models
│   └── main.py
├── frontend/
│   └── src/
│       ├── pages/                 # 9 full-featured pages
│       ├── components/            # Reusable UI components
│       ├── store/portfolioStore.ts # Zustand global state
│       └── services/api.ts        # Axios API layer
└── docker-compose.yml
```

---

##  AI Reports

Provide a [Groq API key](https://console.groq.com) in the Reports page to enable institutional AI commentary powered by LLaMA 3. Without a key, template-based commentary is used automatically.

---

## 📄 License

MIT — built for portfolio showcase and interview preparation.
