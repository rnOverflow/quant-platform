import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Search, RefreshCw, AlertCircle,
  CheckCircle, Loader2, PieChart, BarChart2, Save, X, Info
} from 'lucide-react'
import { PieChart as RPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { usePortfolioStore, Holding } from '../store/portfolioStore'
import { fetchTickerInfo } from '../services/api'
import { cn, SECTOR_COLORS, formatPct } from '../utils/helpers'

export default function PortfolioBuilder() {
  const { holdings, name, setName, addHolding, removeHolding, updateHolding, normalizeWeights, clearPortfolio, loadDemo } = usePortfolioStore()
  const [searchTicker, setSearchTicker] = useState('')
  const [searchResult, setSearchResult] = useState<any | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [newWeight, setNewWeight] = useState(10)
  const [saved, setSaved] = useState(false)

  const totalWeight = holdings.reduce((s, h) => s + h.weight, 0)
  const isBalanced = Math.abs(totalWeight - 1.0) < 0.005

  const handleSearch = async () => {
    if (!searchTicker.trim()) return
    setSearchLoading(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const info = await fetchTickerInfo(searchTicker.trim())
      setSearchResult(info)
    } catch (e) {
      setSearchError(`Ticker "${searchTicker.toUpperCase()}" not found or API unavailable.`)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleAdd = () => {
    if (!searchResult) return
    addHolding({
      ticker: searchResult.ticker,
      weight: newWeight / 100,
      quantity: 0,
      name: searchResult.name,
      sector: searchResult.sector,
      currentPrice: searchResult.current_price,
    })
    setSearchResult(null)
    setSearchTicker('')
    setNewWeight(10)
  }

  const handleNormalize = () => {
    normalizeWeights()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Pie chart data
  const pieData = holdings.map((h) => ({
    name: h.ticker,
    value: +(h.weight * 100).toFixed(1),
    sector: h.sector || 'Unknown',
  }))

  const sectorData = holdings.reduce((acc, h) => {
    const sector = h.sector || 'Unknown'
    acc[sector] = (acc[sector] || 0) + h.weight * 100
    return acc
  }, {} as Record<string, number>)

  const sectorPieData = Object.entries(sectorData).map(([name, value]) => ({
    name,
    value: +value.toFixed(1),
  }))

  const TICKER_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1', '#F97316', '#84CC16']

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Portfolio Builder</h1>
          <p className="text-xs text-slate-400 mt-0.5">Construct and manage your investment portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDemo} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Load Demo
          </button>
          <button onClick={handleNormalize} className="btn-primary text-xs">
            <Save className="w-3.5 h-3.5" />
            {saved ? 'Saved!' : 'Normalize & Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Holdings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Portfolio Name */}
          <div className="glass-card p-4">
            <label className="section-title block mb-2">Portfolio Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark"
              placeholder="My Portfolio"
            />
          </div>

          {/* Ticker Search */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="section-title">Add Holding</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input-dark flex-1 font-mono"
                placeholder="AAPL, MSFT, GOOGL..."
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="btn-primary"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {searchError && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                {searchError}
              </div>
            )}

            {/* Search Result */}
            <AnimatePresence>
              {searchResult && (
                <motion.div
                  className="glass-card-strong p-3 rounded-lg border border-blue-500/20"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-400 text-sm">{searchResult.ticker}</span>
                        <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">{searchResult.sector}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{searchResult.name}</div>
                    </div>
                    {searchResult.current_price && (
                      <div className="text-right">
                        <div className="font-mono font-bold text-white text-sm">${searchResult.current_price?.toFixed(2)}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 mb-1 block">Weight %</label>
                      <input
                        type="number"
                        value={newWeight}
                        onChange={(e) => setNewWeight(+e.target.value)}
                        className="input-dark text-sm font-mono"
                        min="0.1"
                        max="100"
                        step="0.5"
                      />
                    </div>
                    <button
                      onClick={handleAdd}
                      className="btn-primary mt-4"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Holdings List */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title">Holdings ({holdings.length})</h3>
              <div className={cn(
                'text-xs font-mono font-semibold px-2 py-0.5 rounded-full',
                isBalanced ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'
              )}>
                {(totalWeight * 100).toFixed(1)}% total
              </div>
            </div>

            {holdings.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <PieChart className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                No holdings yet. Search for a ticker above to get started.
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Header */}
                <div className="grid grid-cols-12 text-[10px] text-slate-500 uppercase tracking-wider px-2 pb-1 border-b border-white/[0.04]">
                  <div className="col-span-3">Ticker</div>
                  <div className="col-span-4">Name / Sector</div>
                  <div className="col-span-3 text-right">Weight</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <AnimatePresence>
                  {holdings.map((h, idx) => (
                    <motion.div
                      key={h.ticker}
                      className="grid grid-cols-12 items-center py-2 px-2 rounded-lg hover:bg-white/[0.03] group transition-colors"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      {/* Ticker */}
                      <div className="col-span-3 flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: TICKER_COLORS[idx % TICKER_COLORS.length] }}
                        />
                        <span className="font-mono font-bold text-sm text-blue-400">{h.ticker}</span>
                      </div>

                      {/* Name */}
                      <div className="col-span-4">
                        <div className="text-xs text-slate-300 truncate">{h.name || h.ticker}</div>
                        <div className="text-[10px] text-slate-500">{h.sector || 'Unknown'}</div>
                      </div>

                      {/* Weight input */}
                      <div className="col-span-3 flex justify-end">
                        <input
                          type="number"
                          value={(h.weight * 100).toFixed(1)}
                          onChange={(e) => updateHolding(h.ticker, { weight: +e.target.value / 100 })}
                          className="w-16 text-right text-xs font-mono bg-white/5 border border-white/10 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                          min="0"
                          max="100"
                          step="0.5"
                        />
                        <span className="text-xs text-slate-500 ml-1 self-center">%</span>
                      </div>

                      {/* Delete */}
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => removeHolding(h.ticker)}
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Weight bar */}
                      <div className="col-span-12 mt-1 px-0">
                        <div className="h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(h.weight * 100, 100)}%`,
                              backgroundColor: TICKER_COLORS[idx % TICKER_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Warnings */}
          {!isBalanced && holdings.length > 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Weights sum to {(totalWeight * 100).toFixed(1)}%. Click "Normalize & Save" to auto-balance to 100%.
            </div>
          )}
        </div>

        {/* Right: Charts */}
        <div className="space-y-4">
          {/* Asset allocation pie */}
          {holdings.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="section-title mb-3">Asset Allocation</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={TICKER_COLORS[i % TICKER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0F2040',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, '']}
                  />
                </RPieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: TICKER_COLORS[i % TICKER_COLORS.length] }} />
                    <span className="text-xs text-slate-400 flex-1">{d.name}</span>
                    <span className="text-xs font-mono text-slate-200">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sector allocation */}
          {sectorPieData.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="section-title mb-3">Sector Allocation</h3>
              <div className="space-y-2">
                {sectorPieData.sort((a, b) => b.value - a.value).map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{s.name}</span>
                      <span className="font-mono text-slate-200">{s.value.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${s.value}%`,
                          backgroundColor: SECTOR_COLORS[s.name] || '#64748B',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clear */}
          {holdings.length > 0 && (
            <button
              onClick={clearPortfolio}
              className="w-full btn-secondary text-red-400 border-red-400/20 hover:bg-red-400/10 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Portfolio
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
