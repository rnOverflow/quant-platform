import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn, getChangeColor } from '../../utils/helpers'

interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  subtext?: string
  icon?: React.ReactNode
  color?: 'default' | 'positive' | 'negative' | 'gold' | 'blue'
  isPercent?: boolean
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export default function MetricCard({
  label,
  value,
  change,
  subtext,
  icon,
  color = 'default',
  size = 'md',
  loading = false,
}: MetricCardProps) {
  const colorMap: Record<string, string> = {
    default: 'text-white',
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    gold: 'text-gold-400',
    blue: 'text-blue-400',
  }

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="skeleton h-3 w-20 mb-3 rounded" />
        <div className="skeleton h-7 w-28 mb-2 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    )
  }

  return (
    <motion.div
      className="glass-card p-4 hover:border-white/10 transition-all duration-300 group"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
        {icon && (
          <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className={cn(
        'font-mono font-bold tracking-tight',
        size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl',
        colorMap[color]
      )}>
        {value}
      </div>

      {(change !== undefined || subtext) && (
        <div className="mt-1.5 flex items-center gap-2">
          {change !== undefined && (
            <span className={cn('text-xs font-mono font-medium', getChangeColor(change))}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(2)}%
            </span>
          )}
          {subtext && (
            <span className="text-xs text-slate-500">{subtext}</span>
          )}
        </div>
      )}
    </motion.div>
  )
}
