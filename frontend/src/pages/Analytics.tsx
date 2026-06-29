import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart2, AlertTriangle, Loader2 } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import { usePortfolioStore } from '../store/portfolioStore'
import { fetchPerformance } from '../services/api'
import MetricCard from '../components/ui/MetricCard'
import { MetricGridSkeleton, ChartSkeleton } from '../components/ui/Skeleton'
import { formatPct, formatNumber } from '../utils/helpers'

export default function Analytics() {
  const { holdings, benchmark, period, setBenchmark, setPeriod } = usePortfolioStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasPortfolio = holdings.length > 0

  const run = async () => {
    if (!hasPortfolio) return
    setLoading(true); setError('')
    try {
      const result = await fetchPerformance({
        tickers: holdings.map(h => h.ticker),
        weights: holdings.map(h => h.weight),
        benchmark,
        period,
      })
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { run() }, [holdings, benchmark, period])

  const ts = data?.time_series
  const m = data?.metrics

  const chartData = ts
    ? ts.dates.map((d: string, i: number) => ({
        date: d.slice(5),
        portfolio: +(ts.portfolio_cumulative_return[i] * 100).toFixed(2),
        benchmark: +(ts.benchmark_cumulative_return[i] * 100).toFixed(2),
        drawdown: +(ts.drawdown[i] * 100).toFixed(2),
        rolling_vol: ts.rolling_volatility[i] ? +(ts.rolling_volatility[i] * 100).toFixed(2) : null,
        rolling_sharpe: ts.rolling_sharpe[i] ? +ts.rolling_sharpe[i].toFixed(2) : null,
      }))
    : []

  const TOOLTIP_STYLE = {
    background: '#0F2040', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#e2e8f0', fontSize: 12,
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Performance Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Institutional-grade return and risk metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={benchmark}
            onChange={e => setBenchmark(e.target.value as any)}
            className="input-dark text-xs w-32"
          >
            <option value="SP500">S&P 500</option>
            <option value="NASDAQ">NASDAQ</option>
            <option value="NIFTY50">NIFTY 50</option>
          </select>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className="input-dark text-xs w-24"
          >
            <option value="6mo">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="2y">2 Years</option>
            <option value="5y">5 Years</option>
          </select>
        </div>
      </div>

      {!hasPortfolio && (
        <div className="glass-card p-8 text-center">
          <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Build a portfolio first to see performance analytics.</p>
        </div>
      )}

      {hasPortfolio && loading && (
        <div className="space-y-4">
          <MetricGridSkeleton count={6} />
          <ChartSkeleton height={220} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm glass-card p-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {m && !loading && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard label="Total Return" value={formatPct(m.total_return)} color={m.total_return >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Ann. Return" value={formatPct(m.annualized_return)} color={m.annualized_return >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Volatility" value={formatPct(m.annualized_volatility)} color="blue" subtext="Annualized" />
            <MetricCard label="Sharpe Ratio" value={formatNumber(m.sharpe_ratio)} color={m.sharpe_ratio > 1 ? 'positive' : m.sharpe_ratio > 0.5 ? 'blue' : 'negative'} />
            <MetricCard label="Sortino" value={formatNumber(m.sortino_ratio)} color={m.sortino_ratio > 1 ? 'positive' : 'gold'} />
            <MetricCard label="Max Drawdown" value={formatPct(m.maximum_drawdown)} color="negative" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard label="Beta" value={formatNumber(m.beta)} color="blue" subtext="Systematic risk" />
            <MetricCard label="Alpha" value={formatPct(m.alpha)} color={m.alpha >= 0 ? 'positive' : 'negative'} subtext="Jensen's alpha" />
            <MetricCard label="Info Ratio" value={formatNumber(m.information_ratio)} color="blue" />
            <MetricCard label="Calmar Ratio" value={formatNumber(m.calmar_ratio)} color={m.calmar_ratio > 1 ? 'positive' : 'gold'} />
            <MetricCard label="Benchmark" value={data.benchmark} color="default" subtext={data.period} />
            <MetricCard label="Data Points" value={ts.dates.length.toString()} color="default" subtext="Trading days" />
          </div>

          {/* Cumulative Returns */}
          <motion.div className="chart-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Cumulative Returns</h3>
                <p className="text-xs text-slate-500">Portfolio vs {benchmark}</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Portfolio</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-500 inline-block rounded" /> {benchmark}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 8)} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} width={45} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v.toFixed(2)}%`, n === 'portfolio' ? 'Portfolio' : benchmark]} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                <Area type="monotone" dataKey="portfolio" stroke="#3B82F6" strokeWidth={2} fill="url(#g1)" dot={false} />
                <Line type="monotone" dataKey="benchmark" stroke="#475569" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bottom row: Drawdown + Rolling Sharpe */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="chart-container">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Drawdown</h3>
              <p className="text-xs text-slate-500 mb-3">Peak-to-trough portfolio decline</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']} />
                  <Area type="monotone" dataKey="drawdown" stroke="#EF4444" strokeWidth={1.5} fill="url(#ddGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Rolling Sharpe (63d)</h3>
              <p className="text-xs text-slate-500 mb-3">Risk-adjusted return over rolling 63-day window</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData.filter((d: any) => d.rolling_sharpe !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toFixed(2), 'Sharpe']} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                  <ReferenceLine y={1} stroke="rgba(16,185,129,0.3)" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="rolling_sharpe" stroke="#8B5CF6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
