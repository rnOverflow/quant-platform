import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceDot, Legend,
} from 'recharts'
import { usePortfolioStore } from '../store/portfolioStore'
import { fetchOptimization } from '../services/api'
import { formatPct, formatNumber } from '../utils/helpers'

export default function Optimization() {
  const { holdings, period } = usePortfolioStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [minWeight, setMinWeight] = useState(0)
  const [maxWeight, setMaxWeight] = useState(100)
  const [riskFree, setRiskFree] = useState(5)

  const hasPortfolio = holdings.length >= 2

  const run = async () => {
    if (!hasPortfolio) return
    setLoading(true); setError('')
    try {
      const result = await fetchOptimization({
        tickers: holdings.map(h => h.ticker),
        min_weight: minWeight / 100,
        max_weight: maxWeight / 100,
        risk_free_rate: riskFree / 100,
        period,
      })
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Optimization failed')
    } finally {
      setLoading(false)
    }
  }

  const TOOLTIP_STYLE = {
    background: '#0F2040', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#e2e8f0', fontSize: 12,
  }

  const frontierData = data?.efficient_frontier?.map((p: any) => ({
    vol: +(p.volatility * 100).toFixed(2),
    ret: +(p.expected_return * 100).toFixed(2),
    sharpe: +p.sharpe.toFixed(2),
  })) || []

  const assetData = data?.individual_assets?.map((a: any) => ({
    vol: +(a.volatility * 100).toFixed(2),
    ret: +(a.expected_return * 100).toFixed(2),
    name: a.ticker,
  })) || []

  const minVar = data?.minimum_variance
  const maxSharpe = data?.maximum_sharpe

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Portfolio Optimization</h1>
          <p className="text-xs text-slate-400 mt-0.5">Mean-Variance Optimization — Modern Portfolio Theory</p>
        </div>
      </div>

      {!hasPortfolio && (
        <div className="glass-card p-8 text-center">
          <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Add at least 2 assets to your portfolio to run optimization.</p>
        </div>
      )}

      {hasPortfolio && (
        <>
          {/* Controls */}
          <div className="glass-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="section-title block mb-1.5">Min Weight %</label>
              <input type="number" value={minWeight} onChange={e => setMinWeight(+e.target.value)} className="input-dark" min={0} max={50} />
            </div>
            <div>
              <label className="section-title block mb-1.5">Max Weight %</label>
              <input type="number" value={maxWeight} onChange={e => setMaxWeight(+e.target.value)} className="input-dark" min={10} max={100} />
            </div>
            <div>
              <label className="section-title block mb-1.5">Risk-Free Rate %</label>
              <input type="number" value={riskFree} onChange={e => setRiskFree(+e.target.value)} className="input-dark" min={0} max={20} step={0.5} />
            </div>
            <button onClick={run} disabled={loading} className="btn-primary h-9">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {loading ? 'Optimizing...' : 'Run Optimization'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm glass-card p-3">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {data && (
            <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Efficient Frontier Chart */}
              <div className="chart-container">
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Efficient Frontier</h3>
                <p className="text-xs text-slate-500 mb-4">Risk-return tradeoff across optimal portfolios</p>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="vol" name="Volatility" type="number" unit="%"
                      tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                      label={{ value: 'Annualized Volatility (%)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="ret" name="Return" type="number" unit="%"
                      tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={45}
                      label={{ value: 'Expected Return (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, n: string) => [`${v.toFixed(2)}%`, n]}
                    />
                    {/* Frontier line */}
                    <Scatter name="Efficient Frontier" data={frontierData} fill="#3B82F6" opacity={0.6} shape="circle" />
                    {/* Individual assets */}
                    <Scatter name="Assets" data={assetData} fill="#F59E0B" shape="diamond" />
                    {/* Min variance point */}
                    {minVar && (
                      <ReferenceDot
                        x={+(minVar.volatility * 100).toFixed(2)}
                        y={+(minVar.expected_return * 100).toFixed(2)}
                        r={8} fill="#10B981" stroke="#fff" strokeWidth={1.5}
                        label={{ value: 'Min Var', fill: '#10B981', fontSize: 10, dy: -12 }}
                      />
                    )}
                    {/* Max Sharpe point */}
                    {maxSharpe && (
                      <ReferenceDot
                        x={+(maxSharpe.volatility * 100).toFixed(2)}
                        y={+(maxSharpe.expected_return * 100).toFixed(2)}
                        r={8} fill="#D4AF37" stroke="#fff" strokeWidth={1.5}
                        label={{ value: 'Max Sharpe', fill: '#D4AF37', fontSize: 10, dy: -12 }}
                      />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Optimal Portfolios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Minimum Variance */}
                {minVar && (
                  <div className="glass-card p-4 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      <h3 className="text-sm font-semibold text-emerald-400">Minimum Variance Portfolio</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="glass-card p-2 text-center">
                        <div className="text-[10px] text-slate-500 mb-0.5">Return</div>
                        <div className="text-sm font-mono font-semibold text-emerald-400">{formatPct(minVar.expected_return)}</div>
                      </div>
                      <div className="glass-card p-2 text-center">
                        <div className="text-[10px] text-slate-500 mb-0.5">Volatility</div>
                        <div className="text-sm font-mono font-semibold text-blue-400">{formatPct(minVar.volatility)}</div>
                      </div>
                      <div className="glass-card p-2 text-center">
                        <div className="text-[10px] text-slate-500 mb-0.5">Sharpe</div>
                        <div className="text-sm font-mono font-semibold text-white">{formatNumber(minVar.sharpe_ratio)}</div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {minVar.tickers.map((t: string, i: number) => (
                        <div key={t} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-blue-400 w-12">{t}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(minVar.weights[i] * 100).toFixed(0)}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-300 w-10 text-right">{(minVar.weights[i] * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Max Sharpe */}
                {maxSharpe && (
                  <div className="glass-card p-4 border border-gold-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-gold-400" />
                      <h3 className="text-sm font-semibold text-gold-400">Maximum Sharpe Portfolio</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="glass-card p-2 text-center">
                        <div className="text-[10px] text-slate-500 mb-0.5">Return</div>
                        <div className="text-sm font-mono font-semibold text-gold-400">{formatPct(maxSharpe.expected_return)}</div>
                      </div>
                      <div className="glass-card p-2 text-center">
                        <div className="text-[10px] text-slate-500 mb-0.5">Volatility</div>
                        <div className="text-sm font-mono font-semibold text-blue-400">{formatPct(maxSharpe.volatility)}</div>
                      </div>
                      <div className="glass-card p-2 text-center">
                        <div className="text-[10px] text-slate-500 mb-0.5">Sharpe</div>
                        <div className="text-sm font-mono font-semibold text-white">{formatNumber(maxSharpe.sharpe_ratio)}</div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {maxSharpe.tickers.map((t: string, i: number) => (
                        <div key={t} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-blue-400 w-12">{t}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-gold-500 rounded-full" style={{ width: `${(maxSharpe.weights[i] * 100).toFixed(0)}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-300 w-10 text-right">{(maxSharpe.weights[i] * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Correlation Matrix */}
              {data.correlation_matrix && (
                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Correlation Matrix</h3>
                  <div className="overflow-x-auto">
                    <table className="text-xs font-mono w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-slate-500 pb-2 pr-4"></th>
                          {holdings.map(h => (
                            <th key={h.ticker} className="text-slate-400 pb-2 px-2 text-center">{h.ticker}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map(row => (
                          <tr key={row.ticker}>
                            <td className="text-slate-400 py-1 pr-4 font-semibold">{row.ticker}</td>
                            {holdings.map(col => {
                              const val = data.correlation_matrix[row.ticker]?.[col.ticker] ?? 0
                              const abs = Math.abs(val)
                              const isHigh = abs > 0.7 && row.ticker !== col.ticker
                              const isLow = abs < 0.3 && row.ticker !== col.ticker
                              return (
                                <td key={col.ticker} className={`py-1 px-2 text-center rounded ${
                                  row.ticker === col.ticker ? 'text-blue-400' :
                                  isHigh ? 'text-red-400' : isLow ? 'text-emerald-400' : 'text-slate-300'
                                }`}>
                                  {val.toFixed(2)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
