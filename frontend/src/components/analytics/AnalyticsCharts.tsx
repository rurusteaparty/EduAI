'use client'
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PolarRadiusAxis,
  Area, AreaChart, Legend
} from 'recharts'
import type { AnalyticsDashboard } from '@/types'
import { clsx } from 'clsx'

interface AnalyticsChartsProps {
  data: AnalyticsDashboard
}

const COLORS = {
  brand:   '#0e87e7',
  arts:    '#9333ea',
  science: '#0e87e7',
  general: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl p-3 shadow-card-hover text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Prepare radar data for skill levels
  const radarData = Object.entries(data.skill_levels).map(([subject, level]) => ({
    subject: subject.charAt(0).toUpperCase() + subject.slice(1),
    level: Math.round(level),
    fullMark: 100,
  }))

  // Format daily activity for chart
  const dailyData = data.daily_activity.slice(-14).map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    xp:   d.xp_earned,
    acts: d.activities,
    quiz: d.quiz_score ? Math.round(d.quiz_score) : null,
  }))

  // Quiz score trend
  const scoreTrend = data.recent_quiz_scores.map((s, i) => ({
    attempt: `#${data.recent_quiz_scores.length - i}`,
    score:   Math.round(s),
  })).reverse()

  // Subject bars
  const subjectData = data.subject_breakdown.map(s => ({
    name:     s.subject.charAt(0).toUpperCase() + s.subject.slice(1),
    sessions: s.sessions,
    score:    Math.round(s.average_score),
    xp:       s.xp,
  }))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── XP Over Time ─────────────────────────────────────────── */}
      <div className="card p-5 xl:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">XP Earned — Last 14 Days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.brand} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLORS.brand} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="xp" name="XP"
              stroke={COLORS.brand} fill="url(#xpGrad)"
              strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Quiz Score Trend ──────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Quiz Score Trend</h3>
        {scoreTrend.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No quiz attempts yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="attempt" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="score" name="Score %"
                stroke={COLORS.success} strokeWidth={2.5}
                dot={{ fill: COLORS.success, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Skill Radar ───────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Skill Levels by Subject</h3>
        {radarData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No data yet — start studying!</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="rgba(148,163,184,0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar
                name="Skill" dataKey="level" stroke={COLORS.brand}
                fill={COLORS.brand} fillOpacity={0.15} strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Subject Activity ─────────────────────────────────────── */}
      <div className="card p-5 xl:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Activity by Subject</h3>
        {subjectData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No subject data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={subjectData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="sessions" name="Sessions" fill={COLORS.brand} radius={[4,4,0,0]} />
              <Bar dataKey="score"    name="Avg Score" fill={COLORS.success} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
