import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { fetchIndices, fetchMovers } from '../services/api'
import { cn } from '../utils/helpers'

export default function MarketDashboard() {
  const [indices, setIndices] = useState<any[]>([])
  const [movers, setMovers] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [idx, mv] = await Promise.all([fetchIndices(), fetchMovers()])
      setIndices(idx || [])
      setMovers(mv)
      setLastUpdate(new Date())
    } catch (e) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const pctColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-400'
  const pctBg = (v: number) => v > 0 ? 'bg-emerald-400/10 text-emerald-400' : v < 0 ? 'bg-red-400/10 text-red-400' : 'bg-slate-400/10 text-slate-400'

  const MoverRow = ({ item, rank }: { item: any; rank: number }) => (
    <motion.div
      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
    >
      <div className="w-6 h-6 rounded bg-white/[0.06] flex items-center justify-center">
        <span className="text-[9px] font-bold text-slate-400">{rank + 1}</span>
      </div>
      <div className="flex-1">
        <div className="text-xs font-mono font-bold text-slate-200">{item.ticker}</div>
        <div className="text-[10px] text-slate-500">${item.price?.toFixed(2)}</div>
      </div>
      <div className={cn('text-xs font-mono font-semibold px-2 py-0.5 rounded-full', pctBg(item.change_pct))}>
        {item.change_pct > 0 ? '+' : ''}{item.change_pct?.toFixed(2)}%
      </div>
    </motion.div>
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Live Market Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Loading market data...'}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Indices Grid */}
      <div>
        <h2 className="section-title mb-3">Major Indices</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading && !indices.length
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="h-3 w-16 bg-white/10 rounded mb-2" />
                  <div className="h-5 w-20 bg-white/10 rounded mb-1" />
                  <div className="h-3 w-12 bg-white/10 rounded" />
                </div>
              ))
            : indices.map((idx, i) => (
                <motion.div
                  key={idx.ticker}
                  className="glass-card p-4 hover:border-white/10 transition-all"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{idx.name}</div>
                  <div className="font-mono font-bold text-lg text-slate-100">
                    {idx.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={cn('flex items-center gap-1 text-xs font-mono font-medium mt-0.5', pctColor(idx.change_pct))}>
                    {idx.change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {idx.change_pct > 0 ? '+' : ''}{idx.change_pct?.toFixed(2)}%
                  </div>
                  <div className={cn('text-[10px] font-mono mt-0.5', pctColor(idx.change_abs))}>
                    {idx.change_abs > 0 ? '+' : ''}{idx.change_abs?.toFixed(2)}
                  </div>
                </motion.div>
              ))}
        </div>
      </div>

      {/* Movers */}
      {movers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-400">Top Gainers</h3>
            </div>
            {movers.top_gainers?.map((item: any, i: number) => (
              <MoverRow key={item.ticker} item={item} rank={i} />
            ))}
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">Top Losers</h3>
            </div>
            {movers.top_losers?.map((item: any, i: number) => (
              <MoverRow key={item.ticker} item={item} rank={i} />
            ))}
          </div>
        </div>
      )}

      {/* Market Notes */}
      <div className="glass-card p-4 text-xs text-slate-500">
        <span className="font-semibold text-slate-400">Data Notes:</span>{' '}
        Market data is fetched via yfinance and may be delayed by 15-20 minutes.
        Indices and prices shown are for informational purposes only and do not constitute investment advice.
      </div>
    </div>
  )
}
