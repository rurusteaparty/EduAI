'use client'
import { clsx } from 'clsx'
import { useCountUp } from '@/hooks'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label:     string
  value:     number | string
  icon:      LucideIcon
  color?:    'brand' | 'arts' | 'success' | 'warning' | 'danger'
  suffix?:   string
  prefix?:   string
  animate?:  boolean
  trend?:    { value: number; label: string }
  className?: string
}

const COLOR_MAP = {
  brand:   { bg: 'bg-brand-50 dark:bg-brand-900/20',   icon: 'text-brand-600 dark:text-brand-400',   ring: 'ring-brand-100 dark:ring-brand-800' },
  arts:    { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-100 dark:ring-purple-800' },
  success: { bg: 'bg-green-50 dark:bg-green-900/20',   icon: 'text-green-600 dark:text-green-400',   ring: 'ring-green-100 dark:ring-green-800' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-100 dark:ring-amber-800' },
  danger:  { bg: 'bg-red-50 dark:bg-red-900/20',       icon: 'text-red-600 dark:text-red-400',       ring: 'ring-red-100 dark:ring-red-800' },
}

export default function StatCard({
  label, value, icon: Icon, color = 'brand',
  suffix = '', prefix = '', animate = true, trend, className
}: StatCardProps) {
  const numVal   = typeof value === 'number' ? value : 0
  const animated = useCountUp(animate && typeof value === 'number' ? numVal : 0, 800)
  const display  = typeof value === 'number' ? (animate ? animated : numVal) : value

  const colors = COLOR_MAP[color]

  return (
    <div className={clsx('card p-5 card-hover', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {prefix}{typeof display === 'number' ? display.toLocaleString() : display}{suffix}
          </p>
          {trend && (
            <p className={clsx(
              'mt-1 text-xs font-medium',
              trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx(
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ring-1',
          colors.bg, colors.ring
        )}>
          <Icon className={clsx('w-5 h-5', colors.icon)} />
        </div>
      </div>
    </div>
  )
}
