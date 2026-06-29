import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchIndices } from '../../services/api'
import { cn } from '../../utils/helpers'

interface IndexData {
  name: string
  ticker: string
  price: number
  change_pct: number
  change_abs: number
}

// Static fallback data while API loads
const FALLBACK_INDICES: IndexData[] = [
  { name: 'S&P 500', ticker: '^GSPC', price: 5432.91, change_pct: 0.34, change_abs: 18.44 },
  { name: 'NASDAQ', ticker: '^IXIC', price: 17432.60, change_pct: 0.61, change_abs: 105.74 },
  { name: 'Dow Jones', ticker: '^DJI', price: 39118.86, change_pct: -0.11, change_abs: -43.39 },
  { name: 'Russell 2000', ticker: '^RUT', price: 2043.45, change_pct: 0.28, change_abs: 5.67 },
  { name: 'VIX', ticker: '^VIX', price: 12.87, change_pct: -3.21, change_abs: -0.43 },
  { name: 'NIFTY 50', ticker: '^NSEI', price: 24374.55, change_pct: 0.78, change_abs: 188.20 },
]

export default function TickerBar() {
  const [indices, setIndices] = useState<IndexData[]>(FALLBACK_INDICES)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchIndices()
      .then((data) => {
        if (data && data.length > 0) setIndices(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const repeated = [...indices, ...indices, ...indices]

  return (
    <div className="h-9 border-b border-white/[0.06] bg-navy-900/90 backdrop-blur-xl overflow-hidden flex items-center relative">
      {/* Left gradient fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-navy-900 to-transparent pointer-events-none" />
      {/* Right gradient fade */}
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-navy-900 to-transparent pointer-events-none" />

      <div
        className="flex items-center gap-6 animate-marquee whitespace-nowrap"
        style={{
          animation: 'marquee 40s linear infinite',
        }}
      >
        {repeated.map((idx, i) => {
          const isUp = idx.change_pct > 0
          const isDown = idx.change_pct < 0
          return (
            <div key={`${idx.ticker}-${i}`} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-slate-400 text-xs font-medium">{idx.name}</span>
              <span className="font-mono text-xs text-slate-200 font-medium">
                {idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-mono font-medium',
                  isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-400'
                )}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {isUp ? '+' : ''}{idx.change_pct.toFixed(2)}%
              </span>
              <span className="text-slate-700 text-xs">|</span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 50s linear infinite;
        }
      `}</style>
    </div>
  )
}
