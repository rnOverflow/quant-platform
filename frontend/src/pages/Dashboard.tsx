import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, AlertTriangle, Target,
  Briefcase, BarChart3, Zap, ArrowRight, ChevronRight,
  Activity, Shield
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import { usePortfolioStore } from '../store/portfolioStore'
import { fetchPerformance } from '../services/api'
import { formatPct, formatNumber, getChangeColor, getChangeBg, cn } from '../utils/helpers'
import MetricCard from '../components/ui/MetricCard'
import { MetricGridSkeleton } from '../components/ui/Skeleton'

interface PerfData {
  metrics: Record<string, number>
  time_series: {
    dates: string[]
    portfolio_cumulative_return: number[]
    benchmark_cumulative_return: number[]
    drawdown: number[]
  }
  benchmark: string
}

const QUICK_ACTIONS = [
  { label: 'Portfolio Builder', desc: 'Add/edit holdings', icon: Briefcase, path: '/portfolio', color: 'from-blue-600 to-blue-800' },
  { label: 'Run Optimization', desc: 'MPT efficient frontier', icon: Target, path: '/optimization', color: 'from-violet-600 to-violet-800' },
  { label: 'Monte Carlo', desc: 'Simulate future paths', icon: BarChart3, path: '/simulation', color: 'from-emerald-600 to-emerald-800' },
  { label: 'Stress Test', desc: 'Crisis scenarios', icon: Zap, path: '/stress', color: 'from-amber-600 to-amber-800' },
]

export default function Dashboard() {
  const { holdings, name, benchmark, period } = usePortfolioStore()
  const [perfData, setPerfData] = useState<PerfData | null>(null)
  const [loading, setLoading] = useState(false)
  const hasPortfolio = holdings.length > 0

  useEffect(() => {
    if (!hasPortfolio) return
    const tickers = holdings.map((h) => h.ticker)
    const weights = holdings.map((h) => h.weight)
    setLoading(true)
    fetchPerformance({ tickers, weights, benchmark, period })
      .then(setPerfData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [holdings, benchmark, period])

  const chartData = perfData
    ? perfData.time_series.dates.slice(-252).map((date, i) => ({
        date,
        portfolio: +(perfData.time_series.portfolio_cumulative_return[perfData.time_series.portfolio_cumulative_return.length - 252 + i] * 100).toFixed(2),
        benchmark: +(perfData.time_series.benchmark_cumulative_return[perfData.time_series.benchmark_cumulative_return.length - 252 + i] * 100).toFixed(2),
      }))
    : []

  const m = perfData?.metrics

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {name}
          </motion.h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Institutional Portfolio Analytics Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live Data</span>
          </div>
        </div>
      </div>

      {/* No portfolio state */}
      {!hasPortfolio && (
        <motion.div
          className="glass-card p-8 text-center border-dashed border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Portfolio Yet</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
            Build your portfolio to see performance analytics, risk metrics, and institutional-grade insights.
          </p>
          <div className="flex items-center gap-3 justify-center">
            <Link to="/portfolio" className="btn-primary">
              <Briefcase className="w-4 h-4" /> Build Portfolio
            </Link>
            <button
              onClick={usePortfolioStore.getState().loadDemo}
              className="btn-secondary"
            >
              Load Demo Portfolio
            </button>
          </div>
        </motion.div>
      )}

      {/* Metrics Grid */}
      {hasPortfolio && (
        <>
          {loading ? (
            <MetricGridSkeleton count={6} />
          ) : m ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <MetricCard
                label="Total Return"
                value={formatPct(m.total_return)}
                color={m.total_return >= 0 ? 'positive' : 'negative'}
                subtext="Inception"
              />
              <MetricCard
                label="Ann. Return"
                value={formatPct(m.annualized_return)}
                color={m.annualized_return >= 0 ? 'positive' : 'negative'}
                subtext="Per year"
              />
              <MetricCard
                label="Volatility"
                value={formatPct(m.annualized_volatility)}
                color="blue"
                subtext="Annualized"
              />
              <MetricCard
                label="Sharpe Ratio"
                value={formatNumber(m.sharpe_ratio)}
                color={m.sharpe_ratio > 1.0 ? 'positive' : m.sharpe_ratio > 0.5 ? 'blue' : 'negative'}
                subtext="Risk-adjusted"
              />
              <MetricCard
                label="Max Drawdown"
                value={formatPct(m.maximum_drawdown)}
                color="negative"
                subtext="Peak-to-trough"
              />
              <MetricCard
                label="Beta"
                value={formatNumber(m.beta)}
                color={Math.abs(m.beta - 1) < 0.2 ? 'positive' : 'gold'}
                subtext="vs Benchmark"
              />
            </div>
          ) : null}

          {/* Cumulative Returns Chart */}
          {chartData.length > 0 && (
            <div className="chart-container">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Cumulative Returns</h3>
                  <p className="text-xs text-slate-500">Portfolio vs {benchmark} (1Y)</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-400 rounded" />
                    <span className="text-slate-400">Portfolio</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-slate-500 rounded" />
                    <span className="text-slate-400">{benchmark}</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => v.slice(5)}
                    interval={Math.floor(chartData.length / 8)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0F2040',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name === 'portfolio' ? 'Portfolio' : benchmark]}
                  />
                  <Area type="monotone" dataKey="portfolio" stroke="#3B82F6" strokeWidth={2} fill="url(#portGrad)" dot={false} />
                  <Line type="monotone" dataKey="benchmark" stroke="#475569" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Second row: more metrics + holdings */}
          {m && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Risk Snapshot */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" /> Risk Snapshot
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Alpha', value: formatPct(m.alpha), color: m.alpha >= 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'Sortino Ratio', value: formatNumber(m.sortino_ratio), color: m.sortino_ratio > 1 ? 'text-emerald-400' : 'text-amber-400' },
                    { label: 'Information Ratio', value: formatNumber(m.information_ratio), color: 'text-blue-400' },
                    { label: 'Calmar Ratio', value: formatNumber(m.calmar_ratio), color: m.calmar_ratio > 1 ? 'text-emerald-400' : 'text-amber-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                      <span className="text-xs text-slate-400">{item.label}</span>
                      <span className={`text-xs font-mono font-semibold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holdings Summary */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-400" /> Holdings ({holdings.length})
                </h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {holdings.map((h) => (
                    <div key={h.ticker} className="flex items-center gap-3 py-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-blue-400">{h.ticker.slice(0, 2)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200">{h.ticker}</div>
                        <div className="text-[10px] text-slate-500">{h.name || h.sector || ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-semibold text-slate-200">{(h.weight * 100).toFixed(1)}%</div>
                      </div>
                      {/* Mini weight bar */}
                      <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${h.weight * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="section-title mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.path} to={action.path}>
                <motion.div
                  className="glass-card p-4 hover:border-white/10 cursor-pointer group transition-all duration-200"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{action.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{action.desc}</div>
                  <div className="flex items-center gap-1 mt-2 text-slate-600 group-hover:text-blue-400 transition-colors">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
