import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dices, Loader2, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine,
} from 'recharts'
import { usePortfolioStore } from '../store/portfolioStore'
import { fetchMonteCarlo } from '../services/api'
import { formatPct, formatNumber, formatCurrency } from '../utils/helpers'

export default function Simulation() {
  const { holdings, period } = usePortfolioStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [horizon, setHorizon] = useState(252)
  const [sims, setSims] = useState(10000)
  const [initialValue, setInitialValue] = useState(100)

  const hasPortfolio = holdings.length > 0

  const run = async () => {
    if (!hasPortfolio) return
    setLoading(true); setError('')
    try {
      const result = await fetchMonteCarlo({
        tickers: holdings.map(h => h.ticker),
        weights: holdings.map(h => h.weight),
        horizon_days: horizon,
        n_simulations: sims,
        initial_value: initialValue,
        period,
      })
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const TOOLTIP_STYLE = {
    background: '#0F2040', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#e2e8f0', fontSize: 12,
  }

  // Fan chart: percentile bands
  const fanData = data ? Array.from({ length: data.horizon_days }, (_, i) => ({
    day: i + 1,
    p5: data.fan_chart.p5[i],
    p25: data.fan_chart.p25[i],
    p50: data.fan_chart.p50[i],
    p75: data.fan_chart.p75[i],
    p95: data.fan_chart.p95[i],
  })) : []

  // Downsample for display
  const displayFan = fanData.filter((_, i) => i % Math.max(1, Math.floor(fanData.length / 200)) === 0)

  // Histogram
  const histData = data ? data.histogram.bins.slice(0, -1).map((bin: number, i: number) => ({
    bin: `${(bin * 100).toFixed(0)}%`,
    count: data.histogram.counts[i],
    isLoss: bin < 0,
  })) : []

  const stats = data?.statistics

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Monte Carlo Simulation</h1>
          <p className="text-xs text-slate-400 mt-0.5">Correlated GBM simulation of future portfolio paths</p>
        </div>
      </div>

      {!hasPortfolio && (
        <div className="glass-card p-8 text-center">
          <Dices className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Build a portfolio to run simulations.</p>
        </div>
      )}

      {hasPortfolio && (
        <>
          {/* Controls */}
          <div className="glass-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="section-title block mb-1.5">Horizon (Days)</label>
              <input type="number" value={horizon} onChange={e => setHorizon(+e.target.value)} className="input-dark" min={30} max={1260} step={21} />
            </div>
            <div>
              <label className="section-title block mb-1.5">Simulations</label>
              <select value={sims} onChange={e => setSims(+e.target.value)} className="input-dark">
                <option value={1000}>1,000</option>
                <option value={5000}>5,000</option>
                <option value={10000}>10,000</option>
                <option value={20000}>20,000</option>
              </select>
            </div>
            <div>
              <label className="section-title block mb-1.5">Initial Value ($)</label>
              <input type="number" value={initialValue} onChange={e => setInitialValue(+e.target.value)} className="input-dark" min={1} />
            </div>
            <button onClick={run} disabled={loading} className="btn-primary h-9">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
              {loading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm glass-card p-3">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {stats && (
            <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Expected Return', value: formatPct(stats.expected_return), color: stats.expected_return >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Median Return', value: formatPct(stats.median_return), color: stats.median_return >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: '95% VaR', value: formatPct(stats.var_95), color: 'text-red-400' },
                  { label: 'CVaR (ES)', value: formatPct(stats.cvar_95), color: 'text-red-400' },
                  { label: 'Prob. of Loss', value: formatPct(stats.probability_of_loss), color: 'text-amber-400' },
                  { label: 'Prob. +10%', value: formatPct(stats.probability_gain_10pct), color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="glass-card p-3">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{s.label}</div>
                    <div className={`font-mono font-bold text-lg ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Fan Chart */}
              <div className="chart-container">
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Simulation Fan Chart</h3>
                <p className="text-xs text-slate-500 mb-3">
                  {sims.toLocaleString()} simulations over {horizon} trading days — showing 5th/25th/50th/75th/95th percentile bands
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={displayFan}>
                    <defs>
                      {[['outer', '#3B82F6', 0.05], ['mid', '#3B82F6', 0.10], ['inner', '#3B82F6', 0.15]].map(([id, color, opacity]) => (
                        <linearGradient key={id as string} id={`grad_${id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color as string} stopOpacity={opacity as number} />
                          <stop offset="100%" stopColor={color as string} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `D${v}`} interval={Math.floor(displayFan.length / 6)} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                      tickFormatter={v => `$${v.toFixed(0)}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`$${v.toFixed(2)}`, n]} />
                    <ReferenceLine y={initialValue} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="p95" stroke="rgba(59,130,246,0.3)" strokeWidth={1} fill="url(#grad_outer)" />
                    <Area type="monotone" dataKey="p75" stroke="rgba(59,130,246,0.4)" strokeWidth={1} fill="url(#grad_mid)" />
                    <Area type="monotone" dataKey="p25" stroke="rgba(59,130,246,0.5)" strokeWidth={1} fill="url(#grad_inner)" />
                    <Line type="monotone" dataKey="p50" stroke="#3B82F6" strokeWidth={2.5} dot={false} name="Median" />
                    <Line type="monotone" dataKey="p5" stroke="#EF4444" strokeWidth={1.5} dot={false} strokeDasharray="3 2" name="5th Pct" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Histogram of final returns */}
              <div className="chart-container">
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Distribution of Final Returns</h3>
                <p className="text-xs text-slate-500 mb-3">Frequency distribution of simulated terminal portfolio returns</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={histData.slice(0, 60)} barCategoryGap="2%">
                    <XAxis dataKey="bin" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.floor(histData.length / 10)} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), 'Frequency']} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[2, 2, 0, 0]}
                      label={false}
                      isAnimationActive={false}
                    />
                    <ReferenceLine x="0%" stroke="#EF4444" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
