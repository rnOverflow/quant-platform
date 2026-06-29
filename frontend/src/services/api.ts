import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export interface AnalyticsPayload {
  tickers: string[]
  weights: number[]
  benchmark?: string
  period?: string
}

// Performance analytics
export const fetchPerformance = (payload: AnalyticsPayload) =>
  api.post('/analytics/performance', payload).then((r) => r.data)

// Optimization
export const fetchOptimization = (payload: {
  tickers: string[]
  min_weight?: number
  max_weight?: number
  risk_free_rate?: number
  period?: string
}) => api.post('/optimization/mvo', payload).then((r) => r.data)

// VaR
export const fetchVaR = (payload: {
  tickers: string[]
  weights: number[]
  confidence_level?: number
  period?: string
}) => api.post('/risk/var', payload).then((r) => r.data)

// Monte Carlo
export const fetchMonteCarlo = (payload: {
  tickers: string[]
  weights: number[]
  horizon_days?: number
  n_simulations?: number
  initial_value?: number
  period?: string
}) => api.post('/simulation/monte-carlo', payload).then((r) => r.data)

// Stress test
export const fetchStressTest = (payload: {
  tickers: string[]
  weights: number[]
  scenario_key: string
  portfolio_value?: number
}) => api.post('/simulation/stress-test', payload).then((r) => r.data)

// Custom stress test
export const fetchCustomStress = (payload: {
  tickers: string[]
  weights: number[]
  market_drop_pct: number
  volatility_increase_pct: number
  sector_shock_pct: number
  target_sector?: string
  portfolio_value?: number
}) => api.post('/simulation/custom-stress', payload).then((r) => r.data)

// Scenarios list
export const fetchScenarios = () =>
  api.get('/simulation/scenarios').then((r) => r.data)

// Market data
export const fetchIndices = () =>
  api.get('/market/indices').then((r) => r.data)

export const fetchMovers = () =>
  api.get('/market/movers').then((r) => r.data)

// Ticker info
export const fetchTickerInfo = (ticker: string) =>
  api.get(`/portfolio/info/${ticker}`).then((r) => r.data)

export const validateTickers = (tickers: string[]) =>
  api.post('/portfolio/validate', tickers).then((r) => r.data)

// Report generation
export const generateReport = async (payload: {
  tickers: string[]
  weights: number[]
  portfolio_name?: string
  benchmark?: string
  period?: string
  groq_api_key?: string
}) => {
  const response = await api.post('/reports/generate', payload, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `quant-report-${Date.now()}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api
