import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Loader2, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { usePortfolioStore } from '../store/portfolioStore'
import { fetchStressTest, fetchScenarios, fetchCustomStress } from '../services/api'
import { formatPct, formatCurrency } from '../utils/helpers'

export default function StressTesting() {
  const { holdings, portfolioValue } = usePortfolioStore()
  const [scenarios, setScenarios] = useState<any[]>([])
  const [selected, setSelected] = useState('2008_financial_crisis')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'scenario' | 'custom'>('scenario')
  // Custom params
  const [mktDrop, setMktDrop] = useState(-20)
  const [volIncrease, setVolIncrease] = useState(50)
  const [sectorShock, setSectorShock] = useState(-10)
  const [targetSector, setTargetSector] = useState('Technology')

  const hasPortfolio = holdings.length > 0

  useEffect(() => { fetchScenarios().then(setScenarios).catch(() => {}) }, [])

  const run = async () => {
    if (!hasPortfolio) return
    setLoading(true); setError('')
    try {
      let res
      if (mode === 'scenario') {
        res = await fetchStressTest({
          tickers: holdings.map(h => h.ticker),
          weights: holdings.map(h => h.weight),
          scenario_key: selected,
          portfolio_value: portfolioValue,
        })
      } else {
        res = await fetchCustomStress({
          tickers: holdings.map(h => h.ticker),
          weights: holdings.map(h => h.weight),
          market_drop_pct: mktDrop / 100,
          volatility_increase_pct: volIncrease / 100,
          sector_shock_pct: sectorShock / 100,
          target_sector: targetSector,
          portfolio_value: portfolioValue,
        })
      }
      setResult(res)
    } catch (e: any) {
      setError(e.message || 'Stress test failed')
    } finally {
      setLoading(false)
    }
  }

  const TOOLTIP_STYLE = {
    background: '#0F2040', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#e2e8f0', fontSize: 12,
  }

  const impact = result?.portfolio_impact
  const assetContribs = result?.asset_contributions || []

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Stress Testing</h1>
          <p className="text-xs text-slate-400 mt-0.5">Historical crisis scenarios and custom market shock analysis</p>
        </div>
      </div>

      {!hasPortfolio && (
        <div className="glass-card p-8 text-center">
          <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Build a portfolio to run stress tests.</p>
        </div>
      )}

      {hasPortfolio && (
        <>
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button onClick={() => setMode('scenario')} className={mode === 'scenario' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>
              Historical Scenarios
            </button>
            <button onClick={() => setMode('custom')} className={mode === 'custom' ? 'btn-primary text-xs' : 'btn-secondary text-xs'}>
              Custom Scenario
            </button>
          </div>

          {mode === 'scenario' ? (
            <div className="glass-card p-4">
              <h3 className="section-title mb-3">Select Crisis Scenario</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                {scenarios.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSelected(s.key)}
                    className={`p-3 rounded-lg text-left border transition-all ${
                      selected === s.key
                        ? 'border-red-500/40 bg-red-500/10 text-red-300'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-0.5">{s.name}</div>
                    <div className="text-[10px] opacity-70 leading-tight">{s.description}</div>
                  </button>
                ))}
              </div>
              <button onClick={run} disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? 'Running...' : 'Run Stress Test'}
              </button>
            </div>
          ) : (
            <div className="glass-card p-4 space-y-4">
              <h3 className="section-title">Custom Scenario Parameters</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Market Drop %</label>
                  <input type="number" value={mktDrop} onChange={e => setMktDrop(+e.target.value)} className="input-dark" min={-100} max={0} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Vol Increase %</label>
                  <input type="number" value={volIncrease} onChange={e => setVolIncrease(+e.target.value)} className="input-dark" min={0} max={500} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Sector Shock %</label>
                  <input type="number" value={sectorShock} onChange={e => setSectorShock(+e.target.value)} className="input-dark" min={-100} max={0} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Target Sector</label>
                  <select value={targetSector} onChange={e => setTargetSector(e.target.value)} className="input-dark text-xs">
                    {['Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer Discretionary', 'Real Estate', 'Industrials'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={run} disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? 'Running...' : 'Run Custom Stress Test'}
              </button>
            </div>
          )}

          {error && <div className="flex items-center gap-2 text-red-400 text-sm glass-card p-3"><AlertTriangle className="w-4 h-4" /> {error}</div>}

          {impact && (
            <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Scenario info */}
              <div className="glass-card p-4 border border-red-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-red-300">{result.scenario.name}</h3>
                    <p className="text-xs text-slate-500">{result.scenario.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Portfolio Shock', value: formatPct(impact.shock_pct), neg: true },
                    { label: 'Dollar Loss', value: formatCurrency(impact.shock_dollar), neg: true },
                    { label: 'Post-Shock Value', value: formatCurrency(impact.final_value), neg: false },
                    { label: 'Recovery Est.', value: `${impact.recovery_years_estimate.toFixed(1)} yrs`, neg: false },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-3 text-center">
                      <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
                      <div className={`font-mono font-bold text-base ${s.neg ? 'text-red-400' : 'text-slate-200'}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asset contributions */}
              <div className="chart-container">
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Asset Contribution to Loss</h3>
                <p className="text-xs text-slate-500 mb-3">Individual asset shocks weighted by portfolio allocation</p>
                <ResponsiveContainer width="100%" height={Math.max(150, assetContribs.length * 36)}>
                  <BarChart data={assetContribs} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v * 100).toFixed(1)}%`} />
                    <YAxis type="category" dataKey="ticker" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, n: string) => [
                        n === 'contribution_pct' ? formatPct(v) : formatCurrency(v),
                        n === 'contribution_pct' ? 'Portfolio Impact' : 'Dollar Loss',
                      ]}
                    />
                    <Bar dataKey="contribution_pct" radius={[0, 4, 4, 0]}>
                      {assetContribs.map((d: any) => (
                        <Cell key={d.ticker} fill={d.contribution_pct < -0.10 ? '#EF4444' : d.contribution_pct < -0.05 ? '#F59E0B' : '#64748B'} />
                      ))}
                    </Bar>
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
