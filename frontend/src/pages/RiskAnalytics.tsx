import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell,
} from 'recharts'
import { usePortfolioStore } from '../store/portfolioStore'
import { fetchVaR } from '../services/api'
import { formatPct, formatNumber } from '../utils/helpers'

export default function RiskAnalytics() {
  const { holdings, period } = usePortfolioStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confidence, setConfidence] = useState(95)

  const hasPortfolio = holdings.length > 0

  const run = async () => {
    if (!hasPortfolio) return
    setLoading(true); setError('')
    try {
      const result = await fetchVaR({
        tickers: holdings.map(h => h.ticker),
        weights: holdings.map(h => h.weight),
        confidence_level: confidence / 100,
        period,
      })
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Risk calculation failed')
    } finally {
      setLoading(false)
    }
  }

  const TOOLTIP_STYLE = {
    background: '#0F2040', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#e2e8f0', fontSize: 12,
  }

  const varMetrics = data?.var_metrics
  const decomp = data?.risk_decomposition
  const dist = data?.return_distribution

  const horizons = ['daily', 'weekly', 'monthly']
  const methods = ['historical_var', 'parametric_var', 'monte_carlo_var', 'conditional_var']
  const methodLabels: Record<string, string> = {
    historical_var: 'Historical', parametric_var: 'Parametric',
    monte_carlo_var: 'Monte Carlo', conditional_var: 'CVaR (ES)',
  }

  const decompData = decomp ? decomp.tickers.map((t: string, i: number) => ({
    ticker: t,
    pct: +(decomp.percentage_contribution[i] * 100).toFixed(2),
    component: +(decomp.component_contribution[i] * 100).toFixed(2),
    weight: +(decomp.weights[i] * 100).toFixed(1),
  })).sort((a: any, b: any) => b.pct - a.pct) : []

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Risk Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Value at Risk, Expected Shortfall, and Risk Decomposition</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={confidence} onChange={e => setConfidence(+e.target.value)} className="input-dark text-xs w-28">
            <option value={90}>90% CI</option>
            <option value={95}>95% CI</option>
            <option value={99}>99% CI</option>
          </select>
          <button onClick={run} disabled={loading || !hasPortfolio} className="btn-primary text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {loading ? 'Calculating...' : 'Calculate Risk'}
          </button>
        </div>
      </div>

      {!hasPortfolio && (
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Build a portfolio to analyze risk metrics.</p>
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-red-400 text-sm glass-card p-3"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      {varMetrics && (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* VaR Table */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              Value at Risk — {confidence}% Confidence Level
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-slate-500 uppercase tracking-wider py-2 pr-6">Horizon</th>
                    {methods.map(m => (
                      <th key={m} className="text-right text-slate-500 uppercase tracking-wider py-2 px-3">{methodLabels[m]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horizons.map((h, idx) => (
                    <tr key={h} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-3 pr-6 font-semibold text-slate-300 capitalize">{h}</td>
                      {methods.map(m => {
                        const val = varMetrics[h][m]
                        return (
                          <td key={m} className="py-3 px-3 text-right font-mono">
                            <span className={m === 'conditional_var' ? 'text-red-400 font-bold' : 'text-slate-200'}>
                              {formatPct(val)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Distribution Stats */}
          {dist && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Return Distribution Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Daily Mean', value: formatPct(dist.mean), color: dist.mean >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Daily Std Dev', value: formatPct(dist.std), color: 'text-blue-400' },
                  { label: 'Skewness', value: formatNumber(dist.skewness), color: Math.abs(dist.skewness) > 1 ? 'text-amber-400' : 'text-slate-200' },
                  { label: 'Excess Kurtosis', value: formatNumber(dist.kurtosis), color: dist.kurtosis > 3 ? 'text-amber-400' : 'text-slate-200' },
                ].map(s => (
                  <div key={s.label} className="glass-card p-3 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
                    <div className={`font-mono font-bold text-base ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>
              {dist.jarque_bera_pvalue < 0.05 && (
                <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Jarque-Bera test rejects normality (p={dist.jarque_bera_pvalue.toFixed(4)}) — Parametric VaR may underestimate risk
                </div>
              )}
            </div>
          )}

          {/* Risk Decomposition */}
          {decompData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="chart-container">
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Risk Contribution by Asset</h3>
                <p className="text-xs text-slate-500 mb-3">Euler decomposition: % of total portfolio volatility</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={decompData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="ticker" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Risk Contribution']} />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                      {decompData.map((d: any, i: number) => (
                        <Cell key={d.ticker} fill={d.pct > 20 ? '#EF4444' : d.pct > 15 ? '#F59E0B' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Risk vs Weight Analysis</h3>
                <div className="space-y-2">
                  {decompData.map((d: any) => (
                    <div key={d.ticker} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono font-semibold text-blue-400">{d.ticker}</span>
                        <div className="flex gap-4">
                          <span className="text-slate-500">Weight: <span className="text-slate-300">{d.weight}%</span></span>
                          <span className="text-slate-500">Risk: <span className={d.pct > d.weight ? 'text-red-400' : 'text-emerald-400'}>{d.pct}%</span></span>
                        </div>
                      </div>
                      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="absolute h-full bg-slate-600 rounded-full" style={{ width: `${d.weight}%` }} />
                        <div className={`absolute h-full rounded-full ${d.pct > d.weight ? 'bg-red-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(d.pct, 100)}%`, opacity: 0.6 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-600 rounded-sm" /> Weight</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-sm opacity-60" /> Risk ≤ Weight</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-sm opacity-60" /> Risk &gt; Weight</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
