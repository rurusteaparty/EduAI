'use client'
import { ShieldCheck, ShieldAlert, ShieldX, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import type { Source } from '@/types'

interface ConfidenceBadgeProps {
  score?: number
  isHallucination?: boolean
  status?: 'verified' | 'unverified' | 'flagged'
  sources?: Source[]
  reasoning?: string
  compact?: boolean
}

export default function ConfidenceBadge({
  score, isHallucination, status = 'unverified', sources = [], reasoning, compact = false
}: ConfidenceBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  if (score === undefined && !isHallucination) return null

  const pct  = Math.round((score || 0) * 100)
  const high = pct >= 85
  const med  = pct >= 60

  const { Icon, colorClass, label, bg } = isHallucination || status === 'flagged'
    ? { Icon: ShieldX,     colorClass: 'text-red-500',    label: 'Flagged',   bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' }
    : high
    ? { Icon: ShieldCheck, colorClass: 'text-green-500',  label: 'Verified',  bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' }
    : med
    ? { Icon: ShieldAlert, colorClass: 'text-amber-500',  label: 'Caution',   bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' }
    : { Icon: HelpCircle,  colorClass: 'text-gray-400',   label: 'Unverified', bg: 'bg-gray-50 dark:bg-dark-border border-gray-200 dark:border-dark-border' }

  if (compact) {
    return (
      <div className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', bg)}>
        <Icon className={clsx('w-3 h-3', colorClass)} />
        <span className={clsx('font-medium', colorClass)}>{pct}%</span>
      </div>
    )
  }

  return (
    <div className={clsx('mt-2 rounded-xl border text-xs overflow-hidden', bg)}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:opacity-80 transition-opacity"
      >
        <Icon className={clsx('w-3.5 h-3.5 flex-shrink-0', colorClass)} />
        <span className={clsx('font-semibold', colorClass)}>{label}</span>
        <span className="text-gray-500 dark:text-gray-400 ml-0.5">
          — Confidence: {pct}%
        </span>
        <div className="ml-auto">
          {expanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          {/* Confidence bar */}
          <div className="w-full bg-white dark:bg-dark-bg rounded-full h-1.5 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                high ? 'bg-green-500' : med ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Reasoning */}
          {reasoning && (
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{reasoning}</p>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300">Sources used:</p>
              {sources.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-gray-500 dark:text-gray-400">
                  <span className="text-brand-500 font-mono">[{i+1}]</span>
                  <span className="truncate">{s.source} {s.page > 0 ? `· p.${s.page}` : ''}</span>
                  <span className="ml-auto font-mono opacity-60">{Math.round(s.score * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {isHallucination && (
            <p className="font-semibold text-red-600 dark:text-red-400">
              ⚠ This response may contain unverified claims. Cross-check before relying on it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
