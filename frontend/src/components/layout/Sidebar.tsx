import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Target,
  Dices,
  AlertTriangle,
  Zap,
  BarChart3,
  FileText,
  Settings,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { cn } from '../../utils/helpers'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/portfolio', label: 'Portfolio Builder', icon: Briefcase },
  { path: '/analytics', label: 'Performance', icon: TrendingUp },
  { path: '/optimization', label: 'Optimization', icon: Target },
  { path: '/simulation', label: 'Monte Carlo', icon: Dices },
  { path: '/risk', label: 'Risk Analytics', icon: AlertTriangle },
  { path: '/stress', label: 'Stress Testing', icon: Zap },
  { path: '/market', label: 'Live Market', icon: Activity },
  { path: '/reports', label: 'AI Reports', icon: FileText },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-56 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/[0.06] bg-navy-900/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center glow-blue">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">QuantEdge</span>
            <div className="text-[10px] text-gold-500 font-semibold tracking-widest uppercase leading-none mt-0.5">
              Analytics
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="section-title px-3 mb-3 mt-1">Platform</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn('nav-link', isActive && 'active')}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-slate-500')} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-dot"
                      className="w-1.5 h-1.5 rounded-full bg-blue-400"
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="glass-card px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">
              Q
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">Quant Analyst</div>
              <div className="text-[10px] text-slate-500">Pro Plan</div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          </div>
        </div>
      </div>
    </aside>
  )
}
