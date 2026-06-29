import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Holding {
  ticker: string
  weight: number
  quantity: number
  name?: string
  sector?: string
  currentPrice?: number
}

export interface PortfolioState {
  name: string
  holdings: Holding[]
  benchmark: 'SP500' | 'NASDAQ' | 'NIFTY50'
  period: '6mo' | '1y' | '2y' | '5y'
  portfolioValue: number

  // Actions
  setName: (name: string) => void
  addHolding: (holding: Holding) => void
  removeHolding: (ticker: string) => void
  updateHolding: (ticker: string, updates: Partial<Holding>) => void
  normalizeWeights: () => void
  setBenchmark: (b: PortfolioState['benchmark']) => void
  setPeriod: (p: PortfolioState['period']) => void
  setPortfolioValue: (v: number) => void
  clearPortfolio: () => void
  loadDemo: () => void
}

const DEMO_HOLDINGS: Holding[] = [
  { ticker: 'AAPL', weight: 0.25, quantity: 100, name: 'Apple Inc.', sector: 'Technology' },
  { ticker: 'MSFT', weight: 0.20, quantity: 80, name: 'Microsoft Corp.', sector: 'Technology' },
  { ticker: 'GOOGL', weight: 0.15, quantity: 50, name: 'Alphabet Inc.', sector: 'Technology' },
  { ticker: 'JPM', weight: 0.15, quantity: 120, name: 'JPMorgan Chase', sector: 'Financials' },
  { ticker: 'JNJ', weight: 0.10, quantity: 90, name: 'Johnson & Johnson', sector: 'Healthcare' },
  { ticker: 'XOM', weight: 0.08, quantity: 110, name: 'Exxon Mobil', sector: 'Energy' },
  { ticker: 'PG', weight: 0.07, quantity: 70, name: 'Procter & Gamble', sector: 'Consumer Staples' },
]

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      name: 'My Portfolio',
      holdings: [],
      benchmark: 'SP500',
      period: '2y',
      portfolioValue: 1_000_000,

      setName: (name) => set({ name }),

      addHolding: (holding) => {
        const holdings = get().holdings
        const existing = holdings.findIndex((h) => h.ticker === holding.ticker)
        if (existing >= 0) {
          const updated = [...holdings]
          updated[existing] = { ...updated[existing], ...holding }
          set({ holdings: updated })
        } else {
          set({ holdings: [...holdings, holding] })
        }
      },

      removeHolding: (ticker) =>
        set((state) => ({
          holdings: state.holdings.filter((h) => h.ticker !== ticker),
        })),

      updateHolding: (ticker, updates) =>
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.ticker === ticker ? { ...h, ...updates } : h
          ),
        })),

      normalizeWeights: () => {
        const holdings = get().holdings
        const total = holdings.reduce((sum, h) => sum + h.weight, 0)
        if (total === 0) return
        set({
          holdings: holdings.map((h) => ({
            ...h,
            weight: h.weight / total,
          })),
        })
      },

      setBenchmark: (benchmark) => set({ benchmark }),
      setPeriod: (period) => set({ period }),
      setPortfolioValue: (portfolioValue) => set({ portfolioValue }),

      clearPortfolio: () => set({ holdings: [], name: 'My Portfolio' }),

      loadDemo: () =>
        set({ holdings: DEMO_HOLDINGS, name: 'Tech-Diversified Demo Portfolio' }),
    }),
    {
      name: 'quant-portfolio',
      partialize: (state) => ({
        name: state.name,
        holdings: state.holdings,
        benchmark: state.benchmark,
        period: state.period,
        portfolioValue: state.portfolioValue,
      }),
    }
  )
)
