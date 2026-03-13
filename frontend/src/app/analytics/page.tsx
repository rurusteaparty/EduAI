'use client'
import { useEffect, useState } from 'react'
import AppLayout        from '@/components/layout/AppLayout'
import AnalyticsCharts  from '@/components/analytics/AnalyticsCharts'
import StatCard         from '@/components/ui/StatCard'
import { analyticsApi } from '@/lib/api'
import type { AnalyticsDashboard } from '@/types'
import { BarChart3, Flame, Trophy, Clock, Star, BookOpen, MessageCircle, Upload } from 'lucide-react'
import { clsx } from 'clsx'

const DAYS_OPTIONS = [7, 14, 30, 90]

export default function AnalyticsPage() {
  const [data, setData]   = useState<AnalyticsDashboard | null>(null)
  const [days, setDays]   = useState(30)
  const [loading, setL]   = useState(true)

  useEffect(() => {
    setL(true)
    analyticsApi.getDashboard(days)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setL(false))
  }, [days])

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Progress Analytics</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your learning journey</p>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border text-xs">
            {DAYS_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={clsx('px-3 py-1.5 font-medium transition-colors',
                  days === d ? 'bg-brand-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border'
                )}
              >{d}d</button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="shimmer h-28 rounded-2xl" />)}
            </div>
            <div className="shimmer h-64 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total XP"          value={data.summary.total_xp}                  icon={Star}          color="brand"   suffix=" XP" />
              <StatCard label="Study Streak"       value={data.summary.streak_days}               icon={Flame}         color="warning" suffix="d"  />
              <StatCard label="Avg Quiz Score"     value={data.summary.average_quiz_score}        icon={Trophy}        color="success" suffix="%"  />
              <StatCard label="Study Time"         value={data.summary.study_time_hours}          icon={Clock}         color="brand"   suffix="h"  />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Chat Sessions"      value={data.summary.total_chats}               icon={MessageCircle} color="brand"               />
              <StatCard label="Quizzes Completed"  value={data.summary.total_quizzes}             icon={Trophy}        color="arts"                />
              <StatCard label="Cards Reviewed"     value={data.summary.total_flashcards_reviewed} icon={BookOpen}      color="success"             />
              <StatCard label="Documents"          value={data.summary.documents_uploaded}        icon={Upload}        color="warning"             />
            </div>

            {/* Charts */}
            <AnalyticsCharts data={data} />

            {/* Hallucination accuracy stats placeholder */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                AI Accuracy Dashboard
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Verified Responses', value: '87%', color: 'text-green-500' },
                  { label: 'Flagged (Hallucination)', value: '4%', color: 'text-red-500' },
                  { label: 'Unverified', value: '9%', color: 'text-amber-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 bg-gray-50 dark:bg-dark-border rounded-xl">
                    <p className={clsx('text-2xl font-bold', color)}>{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
