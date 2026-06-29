import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPct(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return formatCurrency(value)
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-slate-400'
}

export function getChangeBg(value: number): string {
  if (value > 0) return 'bg-emerald-400/10 text-emerald-400'
  if (value < 0) return 'bg-red-400/10 text-red-400'
  return 'bg-slate-400/10 text-slate-400'
}

export function getRiskColor(value: number): string {
  const abs = Math.abs(value)
  if (abs > 0.30) return 'text-red-400'
  if (abs > 0.15) return 'text-amber-400'
  return 'text-emerald-400'
}

export function getSharpeColor(value: number): string {
  if (value > 1.5) return 'text-emerald-400'
  if (value > 1.0) return 'text-blue-400'
  if (value > 0.5) return 'text-amber-400'
  return 'text-red-400'
}

export const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3B82F6',
  Financials: '#8B5CF6',
  Healthcare: '#10B981',
  'Consumer Discretionary': '#F59E0B',
  'Consumer Staples': '#EC4899',
  Energy: '#EF4444',
  Industrials: '#6366F1',
  'Real Estate': '#14B8A6',
  'Communication Services': '#F97316',
  Utilities: '#84CC16',
  Materials: '#D97706',
  Unknown: '#64748B',
}

export function abbreviateNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}
