'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import StatCard   from '@/components/ui/StatCard'
import {
  MessageCircle, BookOpen, Trophy, Upload,
  Flame, Star, Zap, TrendingUp, ArrowRight,
  FlaskConical, Palette, Clock
} from 'lucide-react'
import { useAuthStore, getLevelFromXP, getXPForNextLevel } from '@/store'
import { analyticsApi } from '@/lib/api'
import type { AnalyticsDashboard } from '@/types'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const QUICK_ACTIONS = [
  { href: '/chat',       icon: MessageCircle, label: 'Start Tutoring',    desc: 'Ask the AI tutor',       color: 'brand'   },
  { href: '/quiz',       icon: Trophy,        label: 'Take a Quiz',       desc: 'Test your knowledge',    color: 'warning' },
  { href: '/flashcards', icon: BookOpen,      label: 'Review Cards',      desc: 'Spaced repetition',      color: 'success' },
  { href: '/upload',     icon: Upload,        label: 'Upload Document',   desc: 'Learn from your files',  color: 'arts'    },
]

const LEVEL_TITLES = [
  '', 'Curious Learner', 'Knowledge Seeker', 'Diligent Scholar',
  'Expert Student', 'Master Mind', 'AI Scholar', 'EduAI Legend',
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.getDashboard(14)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!user) return null

  const { level, current, required } = getXPForNextLevel(user.total_xp)
  const xpPct = Math.min(100, Math.floor((current / required) * 100))
  const levelTitle = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)]

  const chartData = data?.daily_activity.slice(-7).map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
    xp:   d.xp_earned,
    acts: d.activities,
  })) || []

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ── Welcome banner ─────────────────────────────────────── */}
        <div className="card p-6 bg-gradient-to-r from-brand-600 to-brand-500 text-white border-0 overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-8 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-brand-100 text-sm font-medium">Good {getGreeting()},</p>
                <h2 className="text-2xl font-bold mt-0.5">{user.full_name || user.username} 👋</h2>
                <p className="text-brand-100 mt-1 text-sm">{levelTitle} · Level {level}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-orange-200">
                  <Flame className="w-5 h-5" />
                  <span className="text-lg font-bold">{user.streak_days}</span>
                </div>
                <p className="text-brand-100 text-xs">day streak</p>
              </div>
            </div>

            {/* XP Bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-brand-100 mb-1.5">
                <span>Level {level} → {level + 1}</span>
                <span>{current} / {required} XP</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total XP"        value={user.total_xp}                               icon={Star}          color="brand"   suffix=" XP" />
          <StatCard label="Quizzes Taken"   value={data?.summary.total_quizzes ?? 0}             icon={Trophy}        color="warning"              />
          <StatCard label="Chats Started"   value={data?.summary.total_chats ?? 0}               icon={MessageCircle} color="brand"                />
          <StatCard label="Study Hours"     value={data?.summary.study_time_hours ?? 0}          icon={Clock}         color="success" suffix="h"   />
        </div>

        {/* ── Middle row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity chart */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">This Week's XP</h3>
              <Link href="/analytics" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                Full analytics <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {chartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                Start learning to see your activity!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="xpG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0e87e7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0e87e7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="xp" stroke="#0e87e7" fill="url(#xpG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick stats */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Learning Stats</h3>
            {[
              { label: 'Avg Quiz Score',    value: `${data?.summary.average_quiz_score ?? 0}%`,  icon: TrendingUp,    color: 'text-green-500' },
              { label: 'Documents',         value: data?.summary.documents_uploaded ?? 0,         icon: Upload,        color: 'text-brand-500' },
              { label: 'Study Mode',        value: user.subject_mode,                             icon: user.subject_mode === 'science' ? FlaskConical : Palette, color: 'text-purple-500' },
              { label: 'Difficulty',        value: user.difficulty_level,                         icon: Zap,           color: 'text-amber-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={clsx('w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-border flex items-center justify-center flex-shrink-0', color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick actions ──────────────────────────────────────── */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Quick Start</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color }) => (
              <Link key={href} href={href}
                className="card card-hover p-5 flex flex-col gap-3 group"
              >
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  color === 'brand'   ? 'bg-brand-50 dark:bg-brand-900/20' :
                  color === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                  color === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                  'bg-purple-50 dark:bg-purple-900/20'
                )}>
                  <Icon className={clsx(
                    'w-5 h-5',
                    color === 'brand'   ? 'text-brand-600 dark:text-brand-400' :
                    color === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                    color === 'success' ? 'text-green-600 dark:text-green-400' :
                    'text-purple-600 dark:text-purple-400'
                  )} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
}
