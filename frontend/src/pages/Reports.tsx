import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Loader2, Download, Key, AlertTriangle, CheckCircle } from 'lucide-react'
import { usePortfolioStore } from '../store/portfolioStore'
import { generateReport } from '../services/api'

export default function Reports() {
  const { holdings, name, benchmark, period } = usePortfolioStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [groqKey, setGroqKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const hasPortfolio = holdings.length > 0

  const handleGenerate = async () => {
    if (!hasPortfolio) return
    setLoading(true); setError(''); setSuccess(false)
    try {
      await generateReport({
        tickers: holdings.map(h => h.ticker),
        weights: holdings.map(h => h.weight),
        portfolio_name: name,
        benchmark,
        period,
        groq_api_key: groqKey || undefined,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (e: any) {
      setError(e.message || 'Report generation failed')
    } finally {
      setLoading(false)
    }
  }

  const REPORT_SECTIONS = [
    { icon: '📊', title: 'Portfolio Summary', desc: 'Holdings, weights, sector breakdown, and key performance metrics' },
    { icon: '📈', title: 'Performance Analysis', desc: 'Total return, annualized return, Sharpe/Sortino ratios, alpha, beta' },
    { icon: '⚠️', title: 'Risk Analysis', desc: 'Value at Risk (Historical, Parametric, MC), Expected Shortfall across horizons' },
    { icon: '🎯', title: 'Optimization Insights', desc: 'Efficient frontier positioning and rebalancing recommendations' },
    { icon: '🤖', title: 'AI Commentary', desc: 'Institutional-grade narrative commentary powered by Groq LLaMA (optional)' },
    { icon: '📋', title: 'Recommendations', desc: 'Strategic action items for risk management and portfolio improvement' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI Investment Report</h1>
          <p className="text-xs text-slate-400 mt-0.5">Generate institutional-grade PDF report with optional AI commentary</p>
        </div>
      </div>

      {!hasPortfolio && (
        <div className="glass-card p-8 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Build a portfolio to generate a report.</p>
        </div>
      )}

      {hasPortfolio && (
        <div className="space-y-4">
          {/* Report Contents */}
          <div className="glass-card p-4">
            <h3 className="section-title mb-3">Report Contents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REPORT_SECTIONS.map(s => (
                <div key={s.title} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{s.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Commentary (Optional) */}
          <div className="glass-card p-4 border border-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">AI Commentary (Optional)</h3>
              <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px]">GROQ API</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Provide a Groq API key to enable AI-generated institutional narrative commentary.
              Without it, template-based commentary is used. Your key is never stored.
            </p>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={groqKey}
                onChange={e => setGroqKey(e.target.value)}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx (optional)"
                className="input-dark flex-1 text-xs font-mono"
              />
              <button onClick={() => setShowKey(!showKey)} className="btn-secondary text-xs px-3">
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Portfolio preview */}
          <div className="glass-card p-4">
            <h3 className="section-title mb-2">Report For: {name}</h3>
            <div className="flex flex-wrap gap-2">
              {holdings.map(h => (
                <span key={h.ticker} className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {h.ticker} {(h.weight * 100).toFixed(1)}%
                </span>
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
              <span>Benchmark: <span className="text-slate-300">{benchmark}</span></span>
              <span>Period: <span className="text-slate-300">{period}</span></span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm glass-card p-3">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {success && (
            <motion.div
              className="flex items-center gap-2 text-emerald-400 text-sm glass-card p-3 border border-emerald-500/20"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <CheckCircle className="w-4 h-4" />
              Report downloaded successfully! Check your downloads folder.
            </motion.div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-gold w-full py-3 text-sm font-semibold justify-center"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating Report...</>
            ) : (
              <><Download className="w-4 h-4" /> Generate & Download PDF Report</>
            )}
          </button>

          {loading && (
            <div className="text-xs text-slate-500 text-center animate-pulse">
              Fetching market data, computing metrics, and building your report... this may take 30-60 seconds.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
