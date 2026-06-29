import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Sidebar from './components/layout/Sidebar'
import TickerBar from './components/layout/TickerBar'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const PortfolioBuilder = lazy(() => import('./pages/PortfolioBuilder'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Optimization = lazy(() => import('./pages/Optimization'))
const Simulation = lazy(() => import('./pages/Simulation'))
const RiskAnalytics = lazy(() => import('./pages/RiskAnalytics'))
const StressTesting = lazy(() => import('./pages/StressTesting'))
const MarketDashboard = lazy(() => import('./pages/MarketDashboard'))
const Reports = lazy(() => import('./pages/Reports'))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500">Loading module...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-navy-950">
        <TickerBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/portfolio" element={<PortfolioBuilder />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/optimization" element={<Optimization />} />
                <Route path="/simulation" element={<Simulation />} />
                <Route path="/risk" element={<RiskAnalytics />} />
                <Route path="/stress" element={<StressTesting />} />
                <Route path="/market" element={<MarketDashboard />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
